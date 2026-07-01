import { extractJsonBlock } from "@/lib/local/extraction";
import { expandList, expandShorthand } from "@/lib/notes/shorthand";
import type {
  ClinicalNote,
  NoteSystem,
  NoteVital,
} from "@/lib/notes/types";
import type { ModelRuntime } from "@/lib/api/types";

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) =>
      typeof x === "string"
        ? x.trim()
        : x && typeof x === "object"
          ? asString((x as Record<string, unknown>).text)
          : ""
    )
    .filter(Boolean);
}

function asVitals(v: unknown): NoteVital[] {
  if (!Array.isArray(v)) return [];
  const out: NoteVital[] = [];
  for (const x of v) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const label = asString(o.label);
    const value = asString(o.value);
    if (label && value) out.push({ label, value });
  }
  return out;
}

function asSystems(v: unknown): NoteSystem[] {
  if (!Array.isArray(v)) return [];
  const out: NoteSystem[] = [];
  for (const x of v) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const name = asString(o.name);
    const findings = expandShorthand(asString(o.findings));
    if (name && findings) out.push({ name, findings });
  }
  return out;
}

export interface NoteMeta {
  modelId: string;
  modelName: string;
  runtime: ModelRuntime;
  startedAt: string;
  completedAt: string;
}

/** True when parsed JSON looks like a clinical note (has any expected field). */
export function looksLikeNote(parsed: Record<string, unknown> | null): boolean {
  if (!parsed) return false;
  const keys = [
    "patientSummary",
    "presentingComplaints",
    "history",
    "assessment",
    "plan",
  ];
  return keys.some((k) => k in parsed);
}

/**
 * Parse raw model output into a ClinicalNote. Returns null when no note-shaped
 * JSON can be salvaged (caller then surfaces a friendly "try again" error).
 */
export function parseClinicalNote(
  raw: string,
  meta: NoteMeta
): ClinicalNote | null {
  const parsed = extractJsonBlock(raw);
  if (!looksLikeNote(parsed)) return null;
  const p = parsed as Record<string, unknown>;
  const exam = (p.examination ?? {}) as Record<string, unknown>;

  return {
    modelId: meta.modelId,
    modelName: meta.modelName,
    runtime: meta.runtime,
    startedAt: meta.startedAt,
    completedAt: meta.completedAt,
    source: "model",
    patientSummary: expandShorthand(asString(p.patientSummary)),
    presentingComplaints: expandList(asStringArray(p.presentingComplaints)),
    history: expandShorthand(asString(p.history)),
    pastHistory: expandShorthand(asString(p.pastHistory)),
    medications: asStringArray(p.medications),
    socialFamilyHistory: expandShorthand(asString(p.socialFamilyHistory)),
    examination: {
      general: expandShorthand(asString(exam.general)),
      vitals: asVitals(exam.vitals),
      systems: asSystems(exam.systems),
    },
    investigations: expandList(asStringArray(p.investigations)),
    assessment: expandShorthand(asString(p.assessment)),
    plan: expandList(asStringArray(p.plan)),
    recommendations: expandList(asStringArray(p.recommendations)),
  };
}
