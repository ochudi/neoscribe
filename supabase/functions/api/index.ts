// NeoScribe API — single Supabase Edge Function that fronts Hugging Face
// Serverless Inference for every model.
//
// Endpoints (the frontend calls these via NEXT_PUBLIC_API_BASE_URL):
//   GET    /v1/models
//   GET    /v1/models/:id/health
//   POST   /v1/models/:id/extract     body: { transcript: string }
//   GET    /v1/runs
//   GET    /v1/dashboard/stats
//
// Secrets required (set via `supabase secrets set ...`):
//   HF_TOKEN            Hugging Face read token
//   ALLOWED_ORIGIN      (optional) your Vercel origin — defaults to "*"
//
// Deploy:
//   supabase functions deploy api --no-verify-jwt

// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const HF_TOKEN = Deno.env.get("HF_TOKEN");
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";

const CORS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  Vary: "Origin",
};

interface ModelDef {
  id: string;
  name: string;
  hf_id: string;
  location: "cloud" | "edge";
  sizeLabel: string;
  provider: string;
  capabilities: string[];
}

// Edit this list to add/remove models. Each entry must reference a real
// Hugging Face model id you have access to (accept the terms on the model
// page first if it's gated).
const MODELS: ModelDef[] = [
  {
    id: "qwen-2.5-7b",
    name: "Qwen 2.5 7B",
    hf_id: "Qwen/Qwen2.5-7B-Instruct",
    location: "cloud",
    sizeLabel: "7B",
    provider: "huggingface",
    capabilities: ["text", "function_calling"],
  },
];

const CATEGORIES = [
  "complaints",
  "symptoms",
  "diagnoses",
  "medications",
  "investigations",
  "procedures",
  "follow_ups",
] as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function modelPayload(now: string) {
  return MODELS.map((m) => ({
    id: m.id,
    name: m.name,
    location: m.location,
    status: "online",
    sizeLabel: m.sizeLabel,
    provider: m.provider,
    capabilities: m.capabilities,
    endpoint: `https://huggingface.co/${m.hf_id}`,
    lastCheckedAt: now,
  }));
}

function buildPrompt(transcript: string) {
  return `You are a clinical scribe. Read the transcript below and extract structured findings.

Return ONLY a JSON object (no commentary, no markdown fences) with these top-level keys, each holding an array of short strings (one finding per element). Empty arrays are fine.

Keys:
${CATEGORIES.map((c) => `  "${c}": []`).join(",\n")}

Transcript:
"""
${transcript}
"""

JSON:`;
}

function extractJson(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function toExtractionResult(
  modelId: string,
  parsed: Record<string, unknown> | null,
  startedAt: string,
  completedAt: string
) {
  const results: Record<string, unknown[]> = {};
  for (const cat of CATEGORIES) {
    const raw = parsed?.[cat];
    const items = Array.isArray(raw)
      ? raw.filter(
          (v): v is string => typeof v === "string" && v.trim().length > 0
        )
      : [];
    results[cat] = items.map((text, i) => ({
      id: `${cat}-${i + 1}`,
      text: text.trim(),
      matchStatus: "matched",
      confidence: 0.85,
    }));
  }
  return { modelId, startedAt, completedAt, results };
}

function normalizePath(pathname: string) {
  // Strip "/functions/v1/api" or "/api" prefixes, then the "/v1" API version,
  // so the router below just sees e.g. "/models" or "/models/abc/extract".
  return (
    pathname.replace(/^.*\/api/, "").replace(/^\/v1/, "") || "/"
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  const url = new URL(req.url);
  const path = normalizePath(url.pathname);

  if (req.method === "GET" && path === "/models") {
    return json(modelPayload(new Date().toISOString()));
  }

  const healthMatch = path.match(/^\/models\/([^/]+)\/health$/);
  if (req.method === "GET" && healthMatch) {
    return json({
      id: decodeURIComponent(healthMatch[1]),
      status: "online",
      latencyMs: null,
      lastCheckedAt: new Date().toISOString(),
    });
  }

  const extractMatch = path.match(/^\/models\/([^/]+)\/extract$/);
  if (req.method === "POST" && extractMatch) {
    if (!HF_TOKEN) return json({ error: "HF_TOKEN not configured" }, 500);

    const id = decodeURIComponent(extractMatch[1]);
    const model = MODELS.find((m) => m.id === id);
    if (!model) return json({ error: `unknown model: ${id}` }, 404);

    let body: { transcript?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid JSON body" }, 400);
    }
    const transcript = (body.transcript ?? "").trim();
    if (!transcript) return json({ error: "transcript is required" }, 400);

    const startedAt = new Date().toISOString();

    try {
      // Hugging Face's current Inference endpoint: OpenAI-compatible chat
      // completions via the router. The legacy api-inference.huggingface.co
      // surface was deprecated in 2025.
      const hfRes = await fetch(
        "https://router.huggingface.co/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HF_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: model.hf_id,
            messages: [
              { role: "user", content: buildPrompt(transcript) },
            ],
            max_tokens: 1024,
            temperature: 0.1,
          }),
        }
      );

      if (!hfRes.ok) {
        const text = await hfRes.text();
        console.error(`HF ${model.hf_id} -> ${hfRes.status}: ${text}`);
        return json(
          {
            error: `Inference failed (${hfRes.status})`,
            details: text.slice(0, 800),
          },
          hfRes.status
        );
      }

      const data = await hfRes.json();
      const content =
        data?.choices?.[0]?.message?.content ??
        data?.choices?.[0]?.text ??
        "";

      const parsed = extractJson(content);
      const completedAt = new Date().toISOString();
      return json(toExtractionResult(id, parsed, startedAt, completedAt));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`Extract exception for ${model.hf_id}:`, msg, e);
      return json({ error: "Extract failed", details: msg }, 500);
    }
  }

  if (req.method === "GET" && path.startsWith("/runs")) {
    // v1: not persisted. Wire to Supabase Postgres in v2.
    return json([]);
  }

  if (req.method === "GET" && path === "/dashboard/stats") {
    return json({
      modelsOnline: MODELS.length,
      modelsTotal: MODELS.length,
      extractionsToday: 0,
      extractionsYesterday: 0,
      avgProcessingS: 0,
      matchRate: 0,
    });
  }

  return json({ error: "not found", path }, 404);
});
