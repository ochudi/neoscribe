# NeoScribe

AI clinical documentation playground from [Plural Health](https://www.pluralhealth.ai). Compare models, inspect extractions, and ship faster than your differential.

## Stack

- **Next.js 15** (App Router) + React 19, TypeScript
- **Tailwind v3** + shadcn/ui (greyscale theme, Slate base) + lucide-react
- **Zustand** (chat + history stores; history persists to `localStorage`)
- **TanStack Query** for model health polling
- **react-hook-form + zod** for forms
- Hosted on **Vercel**

## Local development

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

### Environment variables

Copy `.env.local` to your shell (and to Vercel → Settings → Environment Variables):

| Variable | Default | What it does |
| --- | --- | --- |
| `NEXT_PUBLIC_USE_MOCKS` | `true` | When `true`, the API client returns in-memory fixtures and the app works without a backend. |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000` | Origin of the model gateway. The client appends `/v1/...`. Ignored when mocks are on. |
| `NEXT_PUBLIC_SITE_URL` | `https://neoscribe.vercel.app` | Used for `metadataBase`, canonical URLs, and OG images. Set this on Vercel. |

## Routes

- `/` — Dashboard (model health, today's stats, recent runs, quickstart)
- `/chat` — Single-model extraction workspace (3-column shell, sticky output)
- `/compare` — Side-by-side comparison across 2-3 models, with diff highlighting + PDF/MD/JSON export
- `/models` — Model catalog with status, capabilities, copy-endpoint
- `/history` — Audit log of saved extractions (localStorage v1), filter / sort / sheet detail / CSV+JSON export

## Project layout

```
src/
├─ app/
│  ├─ (app)/        # routes that share the AppShell layout
│  ├─ error.tsx     # per-route error boundary
│  ├─ global-error.tsx
│  ├─ not-found.tsx
│  ├─ icon.png      # favicon (Next App Router convention)
│  ├─ apple-icon.png
│  └─ opengraph-image.tsx  # 1200x630 OG card via next/og
├─ components/
│  ├─ chat/         # ModelRail, CenterColumn, ExtractionOutput, MetadataRail, InputEditor
│  ├─ compare/      # AddModelDialog, CompareColumn, CompareSummary, ExportMenu
│  ├─ dashboard/    # WelcomeStrip, QuickStats, RecentRuns, ActiveModels, Quickstart
│  ├─ history/      # FiltersBar, HistoryTable, HistoryDetailSheet
│  ├─ layout/       # AppShell, Header, Sidebar, PageContainer
│  ├─ models/       # ModelCard
│  ├─ providers/    # QueryProvider (TanStack Query)
│  ├─ system/       # ErrorShell (shared error/not-found chrome)
│  └─ ui/           # shadcn primitives
└─ lib/
   ├─ api/          # typed client + mocks
   ├─ stores/       # chatStore, historyStore
   ├─ constants.ts  # APP_NAME, API_BASE_URL, EXTRACTION_CATEGORIES
   └─ utils.ts      # cn()
```

## Switching from mocks to a real backend

1. Spin up an API that implements:
   - `GET /v1/models` → `Model[]`
   - `GET /v1/models/:id/health` → `ModelHealth`
   - `POST /v1/models/:id/extract` → `ExtractionResult`
   - `GET /v1/runs?limit=10` → `RunSummary[]`
   - `GET /v1/dashboard/stats` → `DashboardStats`
   - Type shapes live in [src/lib/api/mocks.ts](src/lib/api/mocks.ts).
2. Set `NEXT_PUBLIC_USE_MOCKS=false` and point `NEXT_PUBLIC_API_BASE_URL` at it.
3. Redeploy on Vercel (these are `NEXT_PUBLIC_*` so they're baked into the client bundle at build time).

## Scripts

```bash
npm run dev    # next dev
npm run build  # next build (also runs typecheck + ESLint)
npm run start  # next start (after build)
npm run lint   # ESLint
```
