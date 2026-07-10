# NeoScribe

An AI clinical documentation playground: record (or paste) a clinician–patient
consultation, get a structured clinical note you can edit and export — and
compare how different language models handle the same input, from a 70B hosted
model down to a 135M model **running entirely inside your browser**.

> **Portfolio note** — NeoScribe is a demo/portfolio brand, not a real product
> or medical device. Model output is illustrative and never validated against
> a terminology server; the UI says so wherever codes appear.

## Features

- **Scribe** (`/scribe`) — the headline flow. Record a consultation; Whisper
  transcribes it **on-device** (the audio never leaves the browser), then your
  chosen model turns the transcript into a structured clinical note with
  live streaming for on-device models. Review, edit, save, and export to
  Markdown, Word (`docx`), or PDF.
- **Workspace** (`/chat`) — run one model on a transcript or rough note and get
  structured findings (complaints, diagnoses, medications, …) with
  model-suggested ICD-10 / SNOMED / RxNorm codes. One-click samples, ⌘↵ to run.
- **Compare** (`/compare`) — 2–3 models side-by-side on the same input, with
  per-finding diff highlighting and PDF / Markdown / JSON export.
- **Models** (`/models`) — the full catalog. Cloud models show live
  availability; on-device models show download size, RAM needs, and a
  device-fit verdict *before* anything heavy downloads.
- **Notes** (`/notes`) & **History** (`/history`) — every note and extraction
  run persists (Supabase Postgres, scoped to your account or an anonymous
  per-browser id). Filter, search, re-run, re-open in the scribe, export
  CSV/JSON.
- **Dashboard** (`/dashboard`) — live model availability and usage stats.
- **Auth** — email/password sign-up plus a public shared demo account
  ("Explore the demo account" on `/login`).

## Two runtimes

| | Cloud | On-device |
| --- | --- | --- |
| Where | Hugging Face Inference Providers / OpenRouter, fronted by a Supabase Edge Function | Your browser — WebGPU when available, WASM otherwise |
| Models | GPT-OSS 20B, Llama 3.3 70B, Gemma 3/4 (26–31B), DeepSeek, Qwen, MedGemma 4B (optional dedicated endpoint) | SmolLM2 135M/360M, Gemma 3 270M/1B, Qwen 2.5 0.5B, Qwen 3 0.6B, Llama 3.2 1B + Whisper Tiny/Base for speech |
| Privacy | Input text is sent to the inference provider | Nothing leaves the device |

Before an on-device model downloads, NeoScribe probes WebGPU support, reported
RAM, and free browser storage, then shows a verdict (good fit / will be slow /
blocked) with the exact download size. Tiny models get a simplified prompt (no
codes) — watching a 135M model against a 70B one is half the point.

## Architecture

- **Next.js 15** (App Router) + React 19, TypeScript
- **Tailwind** + shadcn/ui + lucide-react; light/dark/system theme
- **TanStack Query** (server state) + **Zustand** (UI state)
- **@huggingface/transformers** (transformers.js) in Web Workers for on-device
  text generation *and* Whisper ASR
- **Supabase** — Auth, Postgres (`runs`, `notes` tables, RLS locked to the
  service role), and one Edge Function (`supabase/functions/api/index.ts`)
  that is the entire backend:
  - `GET /v1/models` — catalog + live availability (5-min cache)
  - `POST /v1/models/:id/extract` · `POST /v1/models/:id/note`
  - `GET/POST/DELETE /v1/runs` · `GET/POST/DELETE /v1/notes`
  - `GET /v1/dashboard/stats`

  Requests are scoped to the signed-in user (JWT) or an anonymous
  `x-client-id` header.

```
src/
├─ app/               # landing, login/signup, (app)/ dashboard·scribe·chat·notes·compare·models·history
├─ components/        # per-surface components + shadcn/ui primitives
└─ lib/
   ├─ api/            # typed client + types
   ├─ local/          # on-device engine: model/ASR catalogs, device-fit checks, workers
   ├─ notes/          # note pipeline: prompts, parsing, synthesis, render, MD/DOCX/PDF exporters
   └─ stores/         # chatStore, scribeStore (Zustand)
supabase/
├─ functions/api/     # the whole backend
└─ migrations/        # runs + notes tables
```

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project values
npm run dev
```

### Environment variables

| Variable | What it does |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Origin of the deployed `api` edge function; the client appends `/v1/...` |
| `NEXT_PUBLIC_SITE_URL` | Used for `metadataBase`, canonical URLs, OG images (no trailing slash) |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Auth (public keys) |

Edge-function secrets (set with `supabase secrets set`): `HF_TOKEN` (Hugging
Face read token), optional `OPENROUTER_API_KEY`, optional `ALLOWED_ORIGIN`,
optional `MEDGEMMA_ENDPOINT_{URL,MODEL,TOKEN}` for the gated MedGemma
endpoint. `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are injected
automatically.

### Deploy

```bash
supabase functions deploy api --no-verify-jwt   # edge function
supabase db push                                # migrations
ADMIN_EMAIL=… ADMIN_PASSWORD=… node scripts/seed-users.mjs   # auth users (admin + demo)
```

## Testing

```bash
npm run build   # typecheck + lint + build
npm run start   # serve the production build on :3000
npm run e2e     # drives real Chrome through the core flows (scripts/e2e.mjs)
```

The e2e script (puppeteer-core against your installed Chrome) covers dashboard
stats, a real cloud extraction, the on-device download gate plus an actual
in-browser inference run, history persistence, a two-model comparison,
mobile-viewport overflow, and the theme toggle.
