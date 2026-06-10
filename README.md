# NeoScribe

AI clinical documentation playground from [Plural Health](https://www.pluralhealth.ai).
Paste a clinician–patient conversation, watch it become structured findings
(complaints, diagnoses, medications, …) with model-suggested ICD-10 / SNOMED /
RxNorm codes, and compare how different models handle the same input — from a
70B hosted model down to a 135M model **running entirely inside your browser**.

## What it does

- **Workspace** (`/chat`) — run one model on a transcript or structured note.
  One-click sample inputs, ⌘↵ to run, live token streaming for on-device
  models, and honest plain-English errors when something fails.
- **Compare** (`/compare`) — 2–3 models side-by-side on the same input, with
  per-finding diff highlighting, leaders per metric, and PDF / Markdown / JSON
  export.
- **Models** (`/models`) — the full catalog. Cloud models show live
  availability; on-device models show download size, RAM needs, and a
  device-fit verdict *before* anything heavy happens.
- **History** (`/history`) — every run is persisted automatically (Supabase
  Postgres, scoped to an anonymous per-browser id). Filter, search, re-run,
  export CSV/JSON, or clear everything.
- **Dashboard** (`/`) — live model availability and your real usage stats.

### Two runtimes

| | Cloud | On-device |
| --- | --- | --- |
| Where | Hugging Face Inference Providers (via a Supabase Edge Function) | Your browser — WebGPU when available, WASM otherwise |
| Models | GPT-OSS 20B, Llama 3.3 70B, Gemma 4 26B, DeepSeek V4 Flash, Qwen 2.5 7B, Qwen 3 4B | SmolLM2 135M/360M, Gemma 3 270M, Qwen 2.5 0.5B, Qwen 3 0.6B, Llama 3.2 1B |
| Privacy | Input is sent to the inference provider | Input never leaves the device |
| Cost | Uses the project's HF inference allowance | Free, always |

Before an on-device model downloads, NeoScribe checks WebGPU support, reported
RAM, and free browser storage, then shows a clear verdict (good fit / will be
slow / not recommended) with the exact download size. Models that would be
unusable on the device (e.g. Llama 3.2 1B without WebGPU) are blocked with an
explanation instead of failing halfway through.

## Stack

- **Next.js 15** (App Router) + React 19, TypeScript
- **Tailwind v3** + shadcn/ui + lucide-react, light/dark/system theme
- **TanStack Query** (server state) + **Zustand** (UI state)
- **@huggingface/transformers** (transformers.js) in a Web Worker for
  on-device inference
- **Supabase**: one Edge Function (`api`) fronting Hugging Face + Postgres
  (`runs` table) for persistent history
- Hosted on **Vercel**

## Local development

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The app talks to the deployed Supabase function
by default, so cloud models, history, and stats work out of the box.

### Environment variables

| Variable | Example | What it does |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `https://<ref>.supabase.co/functions/v1/api` | Origin of the API. The client appends `/v1/...`. Defaults to the production function. |
| `NEXT_PUBLIC_SITE_URL` | `https://neoscribe.vercel.app` | Used for `metadataBase`, canonical URLs, and OG images. |

Set both in Vercel → Settings → Environment Variables (they're `NEXT_PUBLIC_*`,
so they bake into the bundle at build time). `NEXT_PUBLIC_USE_MOCKS` is gone —
the mock layer was removed.

## Backend

Everything lives in [supabase/functions/api/index.ts](supabase/functions/api/index.ts):

- `GET /v1/models` — catalog with live availability (checked against the HF
  router, cached 5 min)
- `POST /v1/models/:id/extract` — runs the extraction prompt, retries
  transient provider errors once, maps failures to human-readable messages
  (quota, rate-limit, cold start, …), and persists the run
- `GET/POST/DELETE /v1/runs` — history, scoped by the `x-client-id` header
- `GET /v1/dashboard/stats` — per-client stats computed from Postgres

Secrets: `HF_TOKEN` (Hugging Face read token), optional `ALLOWED_ORIGIN`.
`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

Deploy after changes:

```bash
supabase functions deploy api --no-verify-jwt   # edge function
supabase db push                                # migrations (supabase/migrations)
```

The `runs` table has RLS enabled with no policies — only the edge function
(service role) can touch it.

## Testing

```bash
npm run build          # typecheck + lint + build
npm run start          # serve the production build on :3000
npm run e2e            # drives real Chrome through every core flow
```

The e2e script (scripts/e2e.mjs, uses your installed Chrome via
puppeteer-core) verifies: dashboard stats, a real cloud extraction, the
on-device download gate + an actual in-browser inference run, history
persistence, a two-model comparison, mobile-viewport overflow, and the theme
toggle.

## Project layout

```
src/
├─ app/(app)/        # dashboard, chat, compare, models, history
├─ components/
│  ├─ chat/          # ModelRail, CenterColumn (run + streaming), ExtractionOutput, …
│  ├─ compare/       # CompareColumn, CompareSummary, AddModelDialog, ExportMenu
│  ├─ dashboard/     # WelcomeStrip, QuickStats, Quickstart, RecentRuns
│  ├─ history/       # FiltersBar, HistoryTable, HistoryDetailSheet
│  ├─ layout/        # AppShell, Header (status + theme), Sidebar
│  ├─ models/        # ModelCard, LocalModelGate (device-fit check)
│  └─ providers/     # QueryProvider, ThemeProvider
└─ lib/
   ├─ api/           # typed client (descriptive ApiError) + types
   ├─ local/         # on-device engine: catalog, device checks, worker, prompts
   ├─ hooks/         # useModels (cloud + on-device merged, live status)
   ├─ stores/        # chatStore (workspace state incl. streaming)
   ├─ samples.ts     # one-click demo inputs
   └─ clientId.ts    # anonymous per-browser id for history
supabase/
├─ functions/api/    # the whole backend
└─ migrations/       # runs table
```

## Notes on honesty

Code suggestions come from the models themselves and are **not validated
against a terminology server** — the UI says so wherever they appear. Tiny
on-device models get a simplified prompt (no codes) because asking a 135M
model for ICD-10 codes mostly produces fiction; seeing *that* difference is
half the point of the playground.
