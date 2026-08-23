-- Fake-door pricing experiment and enforceable free-tier entitlements.
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  subject_id text not null unique,
  user_id uuid unique references auth.users(id) on delete cascade,
  session_id text unique,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  pricing_variant text check (pricing_variant in ('A', 'B')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.experiment_events (
  id uuid primary key default gen_random_uuid(),
  subject_id text not null,
  variant text not null check (variant in ('A', 'B')),
  event_type text not null check (event_type in ('pricing_view', 'upgrade_click', 'paywall_view')),
  context text,
  created_at timestamptz not null default now()
);

create index if not exists experiment_events_subject_created_at_idx
  on public.experiment_events (subject_id, created_at desc);

create index if not exists experiment_events_variant_type_idx
  on public.experiment_events (variant, event_type);

alter table public.subscriptions enable row level security;
alter table public.experiment_events enable row level security;

-- Entitlements and experiment telemetry are deliberately server-only. The API
-- uses the service role after resolving the bearer token/session header.
drop policy if exists "Subjects can read subscriptions" on public.subscriptions;
drop policy if exists "Subjects can write experiment events" on public.experiment_events;

-- Protect the listing limit even if another API/client is added later. Guest
-- generation is unaffected because unclaimed sites have no user_id.
create or replace function public.enforce_free_active_listing_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  owner_plan text;
  active_count integer;
begin
  if new.status <> 'active' then
    return new;
  end if;

  -- Editing an already-active listing must remain possible. Only a newly active
  -- row (INSERT or passive/sold -> active) consumes another free slot.
  if tg_op = 'UPDATE' then
    if old.status = 'active' and new.status = 'active' and old.site_id = new.site_id then
      return new;
    end if;
  end if;

  select user_id into owner_id from public.sites where id = new.site_id;
  if owner_id is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(owner_id::text, 0));
  select plan into owner_plan from public.subscriptions where user_id = owner_id;
  owner_plan := coalesce(owner_plan, 'free');
  if owner_plan = 'pro' then
    return new;
  end if;

  select count(*) into active_count
  from public.listings l
  join public.sites s on s.id = l.site_id
  where s.user_id = owner_id
    and l.status = 'active'
    and (tg_op = 'INSERT' or l.id <> new.id);

  if active_count >= 5 then
    raise exception using
      errcode = 'P0001',
      message = 'FREE_LISTING_LIMIT';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_free_active_listing_limit on public.listings;
create trigger enforce_free_active_listing_limit
before insert or update of status, site_id on public.listings
for each row execute function public.enforce_free_active_listing_limit();

notify pgrst, 'reload schema';
