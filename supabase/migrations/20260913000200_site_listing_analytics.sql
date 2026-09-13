create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  event_type text not null check (event_type in ('site_view', 'listing_view', 'lead_conversion')),
  session_hash text not null,
  source text not null default 'direct',
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  event_key text not null unique,
  occurred_at timestamptz not null default now()
);

create index if not exists analytics_events_site_occurred_idx on public.analytics_events (site_id, occurred_at desc);
create index if not exists analytics_events_listing_occurred_idx on public.analytics_events (listing_id, occurred_at desc) where listing_id is not null;
alter table public.analytics_events enable row level security;
drop policy if exists "Site owners read analytics" on public.analytics_events;
create policy "Site owners read analytics" on public.analytics_events for select to authenticated using (
  exists (select 1 from public.sites where sites.id = analytics_events.site_id and sites.user_id = (select auth.uid()))
);
notify pgrst, 'reload schema';
