-- Atomic public telemetry budgets and bounded raw-event retention.
create table if not exists public.public_ingestion_budgets (
  scope text not null check (scope in ('analytics', 'experiment')),
  tenant_key text not null,
  visitor_hash text not null,
  window_start timestamptz not null,
  event_count integer not null default 0 check (event_count >= 0),
  expires_at timestamptz not null,
  primary key (scope, tenant_key, visitor_hash, window_start)
);

alter table public.public_ingestion_budgets enable row level security;

create or replace function public.claim_public_ingestion_budget(
  p_scope text,
  p_tenant_key text,
  p_visitor_hash text,
  p_visitor_limit integer,
  p_tenant_limit integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window timestamptz := date_trunc('minute', v_now) - make_interval(mins => extract(minute from v_now)::integer % 10);
  v_day timestamptz := date_trunc('day', v_now);
  v_visitor_count integer;
  v_tenant_count integer;
begin
  if p_scope not in ('analytics', 'experiment') or length(p_tenant_key) > 100 or length(p_visitor_hash) <> 64
     or p_visitor_limit < 1 or p_tenant_limit < 1 then
    return false;
  end if;

  -- Locks serialize both the visitor window and tenant/day counters so rotating
  -- caller session ids cannot win a check-then-insert race.
  perform pg_advisory_xact_lock(hashtextextended(p_scope || ':visitor:' || p_tenant_key || ':' || p_visitor_hash || ':' || v_window::text, 0));
  perform pg_advisory_xact_lock(hashtextextended(p_scope || ':tenant:' || p_tenant_key || ':' || v_day::text, 0));

  select coalesce(sum(event_count), 0) into v_visitor_count
  from public.public_ingestion_budgets
  where scope = p_scope and tenant_key = p_tenant_key and visitor_hash = p_visitor_hash and window_start = v_window;

  select coalesce(sum(event_count), 0) into v_tenant_count
  from public.public_ingestion_budgets
  where scope = p_scope and tenant_key = p_tenant_key and window_start >= v_day;

  if v_visitor_count >= p_visitor_limit or v_tenant_count >= p_tenant_limit then return false; end if;

  insert into public.public_ingestion_budgets(scope, tenant_key, visitor_hash, window_start, event_count, expires_at)
  values (p_scope, p_tenant_key, p_visitor_hash, v_window, 1, v_now + interval '2 days')
  on conflict (scope, tenant_key, visitor_hash, window_start)
  do update set event_count = public.public_ingestion_budgets.event_count + 1, expires_at = excluded.expires_at;
  return true;
end;
$$;

revoke all on function public.claim_public_ingestion_budget(text, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.claim_public_ingestion_budget(text, text, text, integer, integer) to service_role;

create table if not exists public.analytics_daily_rollups (
  site_id uuid not null references public.sites(id) on delete cascade,
  day date not null,
  event_type text not null check (event_type in ('site_view', 'listing_view', 'lead_conversion')),
  event_count bigint not null check (event_count >= 0),
  primary key (site_id, day, event_type)
);

alter table public.analytics_daily_rollups enable row level security;
drop policy if exists "Site members read analytics rollups" on public.analytics_daily_rollups;
create policy "Site members read analytics rollups" on public.analytics_daily_rollups for select to authenticated using (
  exists (
    select 1 from public.sites s
    left join public.workspace_memberships wm on wm.workspace_id = s.workspace_id and wm.user_id = (select auth.uid())
    where s.id = analytics_daily_rollups.site_id and (s.user_id = (select auth.uid()) or wm.user_id is not null)
  )
);

create or replace function public.rollup_and_prune_public_telemetry()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.analytics_daily_rollups(site_id, day, event_type, event_count)
  select site_id, occurred_at::date, event_type, count(*)
  from public.analytics_events
  where occurred_at < date_trunc('day', now() - interval '30 days')
  group by site_id, occurred_at::date, event_type
  on conflict (site_id, day, event_type) do update set event_count = excluded.event_count;

  delete from public.analytics_events where occurred_at < date_trunc('day', now() - interval '30 days');
  delete from public.experiment_events where created_at < now() - interval '90 days';
  delete from public.public_ingestion_budgets where expires_at < now();
end;
$$;

revoke all on function public.rollup_and_prune_public_telemetry() from public, anon, authenticated;
grant execute on function public.rollup_and_prune_public_telemetry() to service_role;

-- Supabase projects with pg_cron enabled run retention daily. Projects without
-- pg_cron can invoke the same server-only function from their scheduler.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if not exists (select 1 from cron.job where jobname = 'rollup-and-prune-public-telemetry') then
      perform cron.schedule('rollup-and-prune-public-telemetry', '17 3 * * *', 'select public.rollup_and_prune_public_telemetry()');
    end if;
  end if;
end $$;

notify pgrst, 'reload schema';
