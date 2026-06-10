// NeoScribe API — single Supabase Edge Function that fronts Hugging Face
// Inference Providers (cloud models) and persists every run to Postgres.
//
// Endpoints (the frontend calls these via NEXT_PUBLIC_API_BASE_URL):
//   GET    /v1/models                  cloud model catalog with live availability
//   POST   /v1/models/:id/extract      body: { transcript, inputType? } (+ x-client-id header)
//   GET    /v1/runs?limit=200          run history for the calling client
//   POST   /v1/runs                    record an on-device run (browser inference)
//   DELETE /v1/runs/:id                delete one run
//   DELETE /v1/runs                    clear the calling client's history
//   GET    /v1/dashboard/stats?today=ISO&yesterday=ISO
//
// Secrets required (set via `supabase secrets set ...`):
//   HF_TOKEN            Hugging Face read token
//   ALLOWED_ORIGIN      (optional) your site origin — defaults to "*"
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.
//
// Deploy:
//   supabase functions deploy api --no-verify-jwt

// deno-lint-ignore-file no-explicit-any

const HF_TOKEN = Deno.env.get("HF_TOKEN");
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-id",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  Vary: "Origin",
};

const MAX_INPUT_CHARS = 24_000;

interface ModelDef {
  id: string;
  name: string;
  hf_id: string;
  provider: string;
  sizeLabel: string;
  description: string;
  typicalLatencyS: number;
}

// Every entry references a model verified to work on the HF router with this
// project's token. Keep descriptions plain-English — the UI shows them to
// non-technical users.
const MODELS: ModelDef[] = [
  {
    id: "gpt-oss-20b",
    name: "GPT-OSS 20B",
    hf_id: "openai/gpt-oss-20b",
    provider: "OpenAI",
    sizeLabel: "20B",
    description:
      "OpenAI's open-weight model. Very fast and reliable at structured extraction.",
    typicalLatencyS: 3,
  },
  {
    id: "llama-3.3-70b",
    name: "Llama 3.3 70B",
    hf_id: "meta-llama/Llama-3.3-70B-Instruct",
    provider: "Meta",
    sizeLabel: "70B",
    description:
      "Meta's largest Llama 3 model. The strongest all-rounder in this catalog.",
    typicalLatencyS: 4,
  },
  {
    id: "gemma-4-26b",
    name: "Gemma 4 26B (A4B)",
    hf_id: "google/gemma-4-26B-A4B-it",
    provider: "Google",
    sizeLabel: "26B MoE",
    description:
      "Google's mixture-of-experts Gemma. Slower, but thorough with medical codes.",
    typicalLatencyS: 11,
  },
  {
    id: "deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    hf_id: "deepseek-ai/DeepSeek-V4-Flash",
    provider: "DeepSeek",
    sizeLabel: "Flash",
    description:
      "DeepSeek's speed-optimised flagship. Good balance of quality and cost.",
    typicalLatencyS: 9,
  },
  {
    id: "qwen-2.5-7b",
    name: "Qwen 2.5 7B",
    hf_id: "Qwen/Qwen2.5-7B-Instruct",
    provider: "Alibaba",
    sizeLabel: "7B",
    description:
      "A compact workhorse — quick answers, lighter on detail than the big models.",
    typicalLatencyS: 3,
  },
  {
    id: "qwen-3-4b",
    name: "Qwen 3 4B",
    hf_id: "Qwen/Qwen3-4B-Instruct-2507",
    provider: "Alibaba",
    sizeLabel: "4B",
    description:
      "The smallest cloud model here — shows what a 4B model can and can't catch.",
    typicalLatencyS: 6,
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

function errorJson(
  status: number,
  message: string,
  opts: { details?: string; retryable?: boolean } = {}
) {
  return json(
    {
      error: message,
      details: opts.details?.slice(0, 600),
      retryable: opts.retryable ?? false,
    },
    status
  );
}

// ---------------------------------------------------------------------------
// Live availability — ask the router which models are currently served and
// cache the answer for 5 minutes.
// ---------------------------------------------------------------------------

let routerCache: { ids: Set<string>; fetchedAt: number } | null = null;

async function routerModelIds(): Promise<Set<string> | null> {
  if (routerCache && Date.now() - routerCache.fetchedAt < 5 * 60_000) {
    return routerCache.ids;
  }
  try {
    const res = await fetch("https://router.huggingface.co/v1/models", {
      headers: HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {},
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return routerCache?.ids ?? null;
    const data = await res.json();
    const list = Array.isArray(data?.data) ? data.data : [];
    const ids = new Set<string>(list.map((m: any) => String(m.id)));
    routerCache = { ids, fetchedAt: Date.now() };
    return ids;
  } catch {
    return routerCache?.ids ?? null;
  }
}

async function modelPayload() {
  const now = new Date().toISOString();
  const available = await routerModelIds();
  return MODELS.map((m) => ({
    id: m.id,
    name: m.name,
    runtime: "cloud" as const,
    status: available === null || available.has(m.hf_id) ? "online" : "offline",
    sizeLabel: m.sizeLabel,
    provider: m.provider,
    description: m.description,
    typicalLatencyS: m.typicalLatencyS,
    hfUrl: `https://huggingface.co/${m.hf_id}`,
    lastCheckedAt: now,
  }));
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

function buildPrompt(transcript: string) {
  return `You are a clinical scribe assistant. Read the input below (a clinician-patient conversation or clinical note) and extract structured findings.

Return ONLY a JSON object (no commentary, no markdown fences). It must have exactly these keys, each holding an array of objects shaped {"text": string, "code": string | null}:
${CATEGORIES.map((c) => `  "${c}"`).join(",\n")}

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

function extractJsonBlock(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/```(?:json)?/gi, "");
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  const candidate = match[0];
  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    // Common failure: trailing commas before } or ].
    try {
      return JSON.parse(candidate.replace(/,\s*([}\]])/g, "$1"));
    } catch {
      return null;
    }
  }
}

interface ExtractionItemOut {
  id: string;
  text: string;
  matchStatus: "matched" | "no_match";
  matchedCode?: string;
}

function toExtractionResult(
  modelId: string,
  parsed: Record<string, unknown>,
  startedAt: string,
  completedAt: string
) {
  const results: Record<string, ExtractionItemOut[]> = {};
  for (const cat of CATEGORIES) {
    const raw = parsed?.[cat];
    const arr = Array.isArray(raw) ? raw : [];
    const items: ExtractionItemOut[] = [];
    for (const v of arr) {
      // Tolerate both {"text","code"} objects and plain strings.
      let text = "";
      let code: string | null = null;
      if (typeof v === "string") {
        text = v;
      } else if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        text = typeof o.text === "string" ? o.text : "";
        code = typeof o.code === "string" && o.code.trim() ? o.code.trim() : null;
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

function countItems(extraction: { results: Record<string, ExtractionItemOut[]> }) {
  const flat = Object.values(extraction.results).flat();
  return {
    itemCount: flat.length,
    codedCount: flat.filter((i) => i.matchStatus === "matched").length,
  };
}

function hfErrorMessage(status: number): { message: string; retryable: boolean } {
  switch (status) {
    case 401:
    case 403:
      return {
        message:
          "The Hugging Face access token for this project is invalid or lacks permission. The site owner needs to update it.",
        retryable: false,
      };
    case 402:
      return {
        message:
          "This project's free Hugging Face inference allowance is used up for now. Try an on-device model instead — those run in your browser and are always free.",
        retryable: false,
      };
    case 404:
    case 410:
      return {
        message:
          "This model is no longer offered by the inference providers. Pick a different model from the list.",
        retryable: false,
      };
    case 408:
      return {
        message: "The model took too long to respond. Trying again usually works.",
        retryable: true,
      };
    case 429:
      return {
        message:
          "The inference provider is rate-limiting requests right now. Wait about 30 seconds, then try again.",
        retryable: true,
      };
    default:
      return {
        message:
          "The inference provider had trouble serving this model. This is usually temporary — try again.",
        retryable: true,
      };
  }
}

async function callHuggingFace(model: ModelDef, transcript: string) {
  const doFetch = () =>
    fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model.hf_id,
        messages: [{ role: "user", content: buildPrompt(transcript) }],
        max_tokens: 1400,
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(60_000),
    });

  let res = await doFetch();
  // One retry for transient provider errors (cold starts, blips).
  if (res.status >= 500 || res.status === 429) {
    await new Promise((r) => setTimeout(r, 1_500));
    res = await doFetch();
  }
  return res;
}

// ---------------------------------------------------------------------------
// Persistence (PostgREST with the service role; RLS keeps the table private)
// ---------------------------------------------------------------------------

const REST = `${SUPABASE_URL}/rest/v1`;
const REST_HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

interface RunRow {
  id?: string;
  client_id: string;
  model_id: string;
  model_name: string;
  model_size_label: string;
  runtime: "cloud" | "device";
  input_type: string;
  input: string;
  extraction: unknown;
  duration_ms: number;
  item_count: number;
  coded_count: number;
  created_at?: string;
}

async function insertRun(row: RunRow): Promise<RunRow | null> {
  try {
    const res = await fetch(`${REST}/runs`, {
      method: "POST",
      headers: { ...REST_HEADERS, Prefer: "return=representation" },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      console.error("insertRun failed:", res.status, await res.text());
      return null;
    }
    const rows = await res.json();
    return Array.isArray(rows) ? rows[0] : rows;
  } catch (e) {
    console.error("insertRun exception:", e);
    return null;
  }
}

async function listRuns(clientId: string, limit: number) {
  const url =
    `${REST}/runs?client_id=eq.${encodeURIComponent(clientId)}` +
    `&order=created_at.desc&limit=${limit}`;
  const res = await fetch(url, { headers: REST_HEADERS });
  if (!res.ok) throw new Error(`runs query failed (${res.status})`);
  return await res.json();
}

async function deleteRun(clientId: string, id: string) {
  const url =
    `${REST}/runs?client_id=eq.${encodeURIComponent(clientId)}` +
    `&id=eq.${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { ...REST_HEADERS, Prefer: "count=exact" },
  });
  if (!res.ok) throw new Error(`delete failed (${res.status})`);
  const range = res.headers.get("content-range") ?? "";
  return !range.endsWith("/0");
}

async function clearRuns(clientId: string) {
  const url = `${REST}/runs?client_id=eq.${encodeURIComponent(clientId)}`;
  const res = await fetch(url, { method: "DELETE", headers: REST_HEADERS });
  if (!res.ok) throw new Error(`clear failed (${res.status})`);
}

function runToSummary(row: RunRow) {
  return {
    id: row.id,
    savedAt: row.created_at,
    modelId: row.model_id,
    modelName: row.model_name,
    modelSizeLabel: row.model_size_label,
    runtime: row.runtime,
    inputType: row.input_type,
    input: row.input,
    extraction: row.extraction,
    durationMs: row.duration_ms,
    itemCount: row.item_count,
    codedCount: row.coded_count,
  };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

function normalizePath(pathname: string) {
  // Strip "/functions/v1/api" or "/api" prefixes, then the "/v1" API version,
  // so the router below just sees e.g. "/models" or "/models/abc/extract".
  return pathname.replace(/^.*\/api/, "").replace(/^\/v1/, "") || "/";
}

function clientIdFrom(req: Request) {
  const id = req.headers.get("x-client-id")?.trim() ?? "";
  // Constrain to something sane so it can't be abused as a storage field.
  return id && id.length <= 64 ? id : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  const url = new URL(req.url);
  const path = normalizePath(url.pathname);

  try {
    if (req.method === "GET" && path === "/models") {
      return json(await modelPayload());
    }

    const extractMatch = path.match(/^\/models\/([^/]+)\/extract$/);
    if (req.method === "POST" && extractMatch) {
      if (!HF_TOKEN) {
        return errorJson(
          500,
          "The server is missing its Hugging Face token, so cloud models can't run. The site owner needs to configure HF_TOKEN."
        );
      }

      const id = decodeURIComponent(extractMatch[1]);
      const model = MODELS.find((m) => m.id === id);
      if (!model) {
        return errorJson(
          404,
          `"${id}" isn't a known cloud model. Refresh the page to load the current model list.`
        );
      }

      let body: { transcript?: string; inputType?: string };
      try {
        body = await req.json();
      } catch {
        return errorJson(400, "The request body wasn't valid JSON.");
      }
      const transcript = (body.transcript ?? "").trim();
      if (!transcript) {
        return errorJson(400, "Add a transcript or note first — the input was empty.");
      }
      if (transcript.length > MAX_INPUT_CHARS) {
        return errorJson(
          413,
          `That input is too long (${transcript.length.toLocaleString()} characters). Keep it under ${MAX_INPUT_CHARS.toLocaleString()}.`
        );
      }

      const startedAt = new Date().toISOString();

      let hfRes: Response;
      try {
        hfRes = await callHuggingFace(model, transcript);
      } catch (e) {
        const isTimeout = e instanceof Error && e.name === "TimeoutError";
        return errorJson(
          504,
          isTimeout
            ? "The model took more than a minute to respond, so we stopped waiting. Try again — a fresh request is usually faster."
            : "We couldn't reach the inference provider. Check your connection and try again.",
          { details: e instanceof Error ? e.message : String(e), retryable: true }
        );
      }

      if (!hfRes.ok) {
        const text = await hfRes.text();
        console.error(`HF ${model.hf_id} -> ${hfRes.status}: ${text.slice(0, 400)}`);
        const { message, retryable } = hfErrorMessage(hfRes.status);
        return errorJson(hfRes.status >= 500 ? 502 : hfRes.status, message, {
          details: text,
          retryable,
        });
      }

      const data = await hfRes.json();
      const content: string =
        data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? "";
      const parsed = extractJsonBlock(content);
      if (!parsed) {
        console.error(`Unparseable output from ${model.hf_id}:`, content.slice(0, 400));
        return errorJson(
          502,
          `${model.name} replied in a format we couldn't read. This happens occasionally — running it again almost always fixes it.`,
          { details: content, retryable: true }
        );
      }

      const completedAt = new Date().toISOString();
      const extraction = toExtractionResult(id, parsed, startedAt, completedAt);

      // Persist the run when the caller identifies itself; extraction still
      // succeeds if the insert fails.
      const clientId = clientIdFrom(req);
      let runId: string | undefined;
      if (clientId) {
        const { itemCount, codedCount } = countItems(extraction);
        const inserted = await insertRun({
          client_id: clientId,
          model_id: id,
          model_name: model.name,
          model_size_label: model.sizeLabel,
          runtime: "cloud",
          input_type: body.inputType === "structured_note" ? "structured_note" : "transcript",
          input: transcript,
          extraction,
          duration_ms:
            new Date(completedAt).getTime() - new Date(startedAt).getTime(),
          item_count: itemCount,
          coded_count: codedCount,
        });
        runId = inserted?.id;
      }

      return json({ ...extraction, runId });
    }

    if (path === "/runs" && req.method === "POST") {
      // On-device runs are reported by the browser after local inference.
      const clientId = clientIdFrom(req);
      if (!clientId) return errorJson(400, "Missing x-client-id header.");
      let body: any;
      try {
        body = await req.json();
      } catch {
        return errorJson(400, "The request body wasn't valid JSON.");
      }
      const extraction = body?.extraction;
      if (!extraction?.results || typeof extraction.results !== "object") {
        return errorJson(400, "Missing extraction payload.");
      }
      const { itemCount, codedCount } = countItems(extraction);
      const inserted = await insertRun({
        client_id: clientId,
        model_id: String(body.modelId ?? "unknown"),
        model_name: String(body.modelName ?? "Unknown model"),
        model_size_label: String(body.modelSizeLabel ?? ""),
        runtime: body.runtime === "cloud" ? "cloud" : "device",
        input_type:
          body.inputType === "structured_note" ? "structured_note" : "transcript",
        input: String(body.input ?? "").slice(0, MAX_INPUT_CHARS),
        extraction,
        duration_ms: Math.max(0, Number(body.durationMs) || 0),
        item_count: itemCount,
        coded_count: codedCount,
      });
      if (!inserted) return errorJson(500, "We couldn't save this run to history.");
      return json(runToSummary(inserted), 201);
    }

    if (path === "/runs" && req.method === "GET") {
      const clientId = clientIdFrom(req);
      if (!clientId) return json([]);
      const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 200));
      const rows = await listRuns(clientId, limit);
      return json(rows.map(runToSummary));
    }

    if (path === "/runs" && req.method === "DELETE") {
      const clientId = clientIdFrom(req);
      if (!clientId) return errorJson(400, "Missing x-client-id header.");
      await clearRuns(clientId);
      return json({ ok: true });
    }

    const runMatch = path.match(/^\/runs\/([^/]+)$/);
    if (runMatch && req.method === "DELETE") {
      const clientId = clientIdFrom(req);
      if (!clientId) return errorJson(400, "Missing x-client-id header.");
      const ok = await deleteRun(clientId, decodeURIComponent(runMatch[1]));
      return ok
        ? json({ ok: true })
        : errorJson(404, "That history entry no longer exists.");
    }

    if (req.method === "GET" && path === "/dashboard/stats") {
      const clientId = clientIdFrom(req);
      const models = await modelPayload();
      const online = models.filter((m) => m.status === "online").length;

      let extractionsToday = 0;
      let extractionsYesterday = 0;
      let avgDurationMs = 0;
      let itemCount = 0;
      let codedCount = 0;

      if (clientId) {
        const todayStart = url.searchParams.get("today");
        const yesterdayStart = url.searchParams.get("yesterday");
        const since =
          yesterdayStart && !Number.isNaN(Date.parse(yesterdayStart))
            ? yesterdayStart
            : new Date(Date.now() - 48 * 3600_000).toISOString();
        const rows: RunRow[] = await (async () => {
          const u =
            `${REST}/runs?client_id=eq.${encodeURIComponent(clientId)}` +
            `&created_at=gte.${encodeURIComponent(since)}` +
            `&select=created_at,duration_ms,item_count,coded_count&limit=1000`;
          const res = await fetch(u, { headers: REST_HEADERS });
          return res.ok ? await res.json() : [];
        })();

        const todayMs =
          todayStart && !Number.isNaN(Date.parse(todayStart))
            ? Date.parse(todayStart)
            : new Date().setUTCHours(0, 0, 0, 0);

        const today = rows.filter((r) => Date.parse(r.created_at!) >= todayMs);
        const yesterday = rows.filter((r) => Date.parse(r.created_at!) < todayMs);
        extractionsToday = today.length;
        extractionsYesterday = yesterday.length;
        avgDurationMs = today.length
          ? today.reduce((s, r) => s + (r.duration_ms ?? 0), 0) / today.length
          : 0;
        itemCount = today.reduce((s, r) => s + (r.item_count ?? 0), 0);
        codedCount = today.reduce((s, r) => s + (r.coded_count ?? 0), 0);
      }

      return json({
        modelsOnline: online,
        modelsTotal: models.length,
        extractionsToday,
        extractionsYesterday,
        avgProcessingS: avgDurationMs / 1000,
        codedRate: itemCount === 0 ? null : codedCount / itemCount,
      });
    }

    return errorJson(404, "Unknown API route.", { details: path });
  } catch (e) {
    console.error("Unhandled API error:", e);
    return errorJson(
      500,
      "Something went wrong on the server. Try again in a moment.",
      { details: e instanceof Error ? e.message : String(e), retryable: true }
    );
  }
});
