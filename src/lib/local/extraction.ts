import {
  EXTRACTION_CATEGORIES,
  type ExtractionCategory,
} from "@/lib/constants";
import type { ExtractionItem, ExtractionResult } from "@/lib/api/types";

/** Mirrors the cloud prompt so on-device and cloud runs are comparable. */
export function buildExtractionPrompt(transcript: string): string {
  return `You are a clinical scribe assistant. Read the input below (a clinician-patient conversation or clinical note) and extract structured findings.

Return ONLY a JSON object (no commentary, no markdown fences). It must have exactly these keys, each holding an array of objects shaped {"text": string, "code": string | null}:
${EXTRACTION_CATEGORIES.map((c) => `  "${c}"`).join(",\n")}

Rules:
- "text" is a short clinical phrase taken from the input (e.g. "Productive cough for 3 days").
- "code" is the single most appropriate ICD-10, SNOMED CT, or RxNorm code with its system prefix (e.g. "ICD-10: J20.9", "RxNorm: 29046"). Use null when you are not confident.
- Use empty arrays for categories with no findings. Do not invent findings.

Input:
"""
${transcript}
"""

JSON:`;
}

/**
 * Stripped-down prompt for sub-0.5B models: transcript first, schema skeleton
 * last (recency helps), plain string arrays, no codes. Paired with an
 * assistant prefill so generation starts inside the right structure.
 */
export function buildSimpleExtractionPrompt(transcript: string): string {
  return `Read this clinical conversation:
"""
${transcript}
"""

Now fill in this JSON with short phrases from the conversation above (leave arrays empty when nothing fits, reply with ONLY the JSON):
{${EXTRACTION_CATEGORIES.map((c) => `"${c}": []`).join(", ")}}`;
}

/** Forces tiny models to start generating inside the expected JSON shape. */
export const SIMPLE_PREFILL = '{"complaints": ["';
/** Anchors capable models inside the first category array. */
export const FULL_PREFILL = '{"complaints": [';

/** True when the parsed object contains at least one expected category array. */
export function hasExpectedShape(
  parsed: Record<string, unknown> | null
): parsed is Record<string, unknown> {
  return (
    !!parsed && EXTRACTION_CATEGORIES.some((c) => Array.isArray(parsed[c]))
  );
}

function tryParse(candidate: string): Record<string, unknown> | null {
  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    try {
      // Trailing commas are the most common small-model mistake.
      return JSON.parse(candidate.replace(/,\s*([}\]])/g, "$1"));
    } catch {
      return null;
    }
  }
}

/**
 * String-aware scan from the first "{" to the position where brace nesting
 * returns to zero. Models love to append prose after their JSON; a greedy
 * regex would swallow it all.
 */
function balancedSlice(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') inString = !inString;
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  // Never balanced — output was truncated mid-object.
  return text.slice(start);
}

/**
 * Pull a JSON object out of raw model text. Tolerates markdown fences,
 * "reasoning" preambles and epilogues (<think> blocks, trailing commentary),
 * and truncated output (salvages by closing open brackets).
 */
export function extractJsonBlock(text: string): Record<string, unknown> | null {
  const cleaned = text
    .replace(/<think>[\s\S]*?(<\/think>|$)/gi, "")
    .replace(/```(?:json)?/gi, "");

  const sliced = balancedSlice(cleaned);
  if (!sliced) return null;

  const parsed = tryParse(sliced);
  if (parsed) return parsed;

  // Truncated output: cut a dangling partial value after the last complete
  // element, then close whatever brackets are still open.
  let candidate = sliced;
  const lastComma = candidate.lastIndexOf(",");
  const lastBracket = Math.max(
    candidate.lastIndexOf("}"),
    candidate.lastIndexOf("]")
  );
  if (lastComma > lastBracket) candidate = candidate.slice(0, lastComma);

  let open = 0;
  let openSq = 0;
  let inString = false;
  let escaped = false;
  for (const ch of candidate) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') inString = !inString;
    if (inString) continue;
    if (ch === "{") open++;
    if (ch === "}") open--;
    if (ch === "[") openSq++;
    if (ch === "]") openSq--;
  }
  if (inString) candidate += '"';
  candidate += "]".repeat(Math.max(0, openSq)) + "}".repeat(Math.max(0, open));
  return tryParse(candidate);
}

/** Normalise parsed JSON into the app's ExtractionResult shape. */
export function toExtractionResult(
  modelId: string,
  parsed: Record<string, unknown>,
  startedAt: string,
  completedAt: string
): ExtractionResult {
  const results = {} as Record<ExtractionCategory, ExtractionItem[]>;
  for (const cat of EXTRACTION_CATEGORIES) {
    const raw = parsed?.[cat];
    const arr = Array.isArray(raw) ? raw : [];
    const items: ExtractionItem[] = [];
    for (const v of arr) {
      let text = "";
      let code: string | null = null;
      if (typeof v === "string") {
        text = v;
      } else if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        text = typeof o.text === "string" ? o.text : "";
        code =
          typeof o.code === "string" && o.code.trim() ? o.code.trim() : null;
      }
      text = text.trim();
      if (!text) continue;
      items.push({
        id: `${cat}-${items.length + 1}`,
        text,
        matchStatus: code ? "matched" : "no_match",
        ...(code ? { matchedCode: code } : {}),
      });
    }
    results[cat] = items;
  }
  return { modelId, startedAt, completedAt, results };
}
