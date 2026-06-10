-- Persistent extraction runs (history + dashboard stats).
-- Accessed exclusively through the `api` edge function with the service role;
-- RLS stays enabled with no policies so anon/authenticated clients cannot
-- touch the table directly.
create extension if not exists pgcrypto;

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  model_id text not null,
  model_name text not null,
  model_size_label text not null default '',
  runtime text not null default 'cloud' check (runtime in ('cloud', 'device')),
  input_type text not null default 'transcript',
  input text not null,
  extraction jsonb not null,
  duration_ms integer not null default 0,
  item_count integer not null default 0,
  coded_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists runs_client_created_idx
  on public.runs (client_id, created_at desc);

alter table public.runs enable row level security;
