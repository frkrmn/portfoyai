alter table public.leads
  add column if not exists contacted_at timestamptz;

create index if not exists leads_site_uncontacted_idx
  on public.leads (site_id, created_at desc)
  where contacted_at is null;
