alter table public.lead_activities
  add column if not exists schema_version integer not null default 1,
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists consent boolean not null default false;

create table if not exists public.guided_match_results (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  token_hash text not null unique,
  schema_version integer not null default 1,
  locale text not null check (locale in ('tr', 'en')),
  answers jsonb not null,
  recommendations jsonb not null,
  summary text not null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists guided_match_results_lead_idx on public.guided_match_results(lead_id, created_at desc);
alter table public.guided_match_results enable row level security;
-- Tokens are resolved only by the service-role API. No direct browser policies.
