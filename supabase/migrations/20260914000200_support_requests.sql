create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  site_id uuid references public.sites(id) on delete set null,
  category text not null check (category in ('getting-started','site-editor','publishing','leads','billing','other')),
  message text not null check (char_length(message) between 10 and 2000),
  context jsonb not null default '{}'::jsonb,
  request_id text not null,
  status text not null default 'open' check (status in ('open','in_progress','resolved')),
  created_at timestamptz not null default now()
);
create index if not exists support_requests_user_created_idx on public.support_requests(user_id, created_at desc);
alter table public.support_requests enable row level security;
create policy support_requests_select_own on public.support_requests for select to authenticated using (user_id = (select auth.uid()));
-- Writes go through the authenticated, validated API; no direct client insert policy.
