do $$
begin
  if not exists (select 1 from pg_type where typname = 'listing_availability_status') then
    create type public.listing_availability_status as enum ('active', 'sold', 'rented');
  end if;
end
$$;

alter table public.listings
  add column if not exists listing_status public.listing_availability_status not null default 'active';

alter table public.sites
  add column if not exists show_closed_listings boolean not null default false;

update public.listings
set listing_status = case
  when listing_type = 'rent' then 'rented'::public.listing_availability_status
  else 'sold'::public.listing_availability_status
end
where status = 'sold' and listing_status = 'active';

update public.listings
set status = 'active'
where status = 'sold';

create index if not exists listings_site_availability_created_at_idx
  on public.listings (site_id, listing_status, created_at desc);

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
  if new.status <> 'active' or new.listing_status <> 'active' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.status = 'active' and old.listing_status = 'active' and new.status = 'active' and new.listing_status = 'active' and old.site_id = new.site_id then
      return new;
    end if;
  end if;

  select user_id into owner_id from public.sites where id = new.site_id;
  if owner_id is null then return new; end if;

  perform pg_advisory_xact_lock(hashtextextended(owner_id::text, 0));
  select plan into owner_plan from public.subscriptions where user_id = owner_id;
  owner_plan := coalesce(owner_plan, 'free');
  if owner_plan = 'pro' then return new; end if;

  select count(*) into active_count
  from public.listings l
  join public.sites s on s.id = l.site_id
  where s.user_id = owner_id
    and l.status = 'active'
    and l.listing_status = 'active'
    and (tg_op = 'INSERT' or l.id <> new.id);

  if active_count >= 5 then
    raise exception using errcode = 'P0001', message = 'FREE_LISTING_LIMIT';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_free_active_listing_limit on public.listings;
create trigger enforce_free_active_listing_limit
before insert or update of status, listing_status, site_id on public.listings
for each row execute function public.enforce_free_active_listing_limit();

notify pgrst, 'reload schema';
