-- Adds signed-in-user scoping to runs and a table for saved clinical notes
-- (transcript + generated note). Like `runs`, `notes` is reached only through
-- the `api` edge function (service role); RLS stays enabled with no policies so
-- anon/authenticated clients cannot touch it directly.

-- Signed-in users scope their history by user_id; anonymous users keep using
-- client_id (with user_id null). Nullable so existing rows stay valid.
alter table public.runs
  add column if not exists user_id text;

create index if not exists runs_user_created_idx
  on public.runs (user_id, created_at desc);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  client_id text not null default '',
  model_id text not null,
  model_name text not null,
  runtime text not null default 'cloud' check (runtime in ('cloud', 'device')),
  source text not null default 'pasted' check (source in ('recorded', 'pasted')),
  input_type text not null default 'transcript',
  transcript text not null default '',
  note jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists notes_user_created_idx
  on public.notes (user_id, created_at desc);

create index if not exists notes_client_created_idx
  on public.notes (client_id, created_at desc);

alter table public.notes enable row level security;
