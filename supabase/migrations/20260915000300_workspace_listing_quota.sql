-- Enforce the free active-listing entitlement at the canonical workspace scope.
create or replace function public.enforce_free_active_listing_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_workspace_id uuid;
  legacy_owner_id uuid;
  quota_key text;
  is_pro boolean;
  active_count integer;
begin
  if new.status <> 'active' or new.listing_status <> 'active' then return new; end if;

  -- Updates that do not consume new capacity remain available at the limit.
  if tg_op = 'UPDATE'
     and old.status = 'active' and old.listing_status = 'active'
     and new.status = 'active' and new.listing_status = 'active'
     and old.site_id = new.site_id then
    return new;
  end if;

  select workspace_id, user_id into target_workspace_id, legacy_owner_id
  from public.sites where id = new.site_id;
  if target_workspace_id is null and legacy_owner_id is null then return new; end if;

  quota_key := case when target_workspace_id is not null
    then 'workspace:' || target_workspace_id::text
    else 'legacy-user:' || legacy_owner_id::text end;
  perform pg_advisory_xact_lock(hashtextextended(quota_key, 0));

  if target_workspace_id is not null then
    select exists(
      select 1 from public.subscriptions
      where workspace_id = target_workspace_id and plan = 'pro'
    ) into is_pro;
  else
    select exists(
      select 1 from public.subscriptions
      where user_id = legacy_owner_id and plan = 'pro'
    ) into is_pro;
  end if;
  if is_pro then return new; end if;

  select count(*) into active_count
  from public.listings l
  join public.sites s on s.id = l.site_id
  where l.status = 'active'
    and l.listing_status = 'active'
    and (tg_op = 'INSERT' or l.id <> new.id)
    and (
      (target_workspace_id is not null and s.workspace_id = target_workspace_id)
      or (target_workspace_id is null and s.workspace_id is null and s.user_id = legacy_owner_id)
    );

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

-- Deactivate/delete naturally releases capacity because only currently active
-- rows are counted. Rollback can restore the user-scoped function from
-- 20260825000300_listing_availability.sql without changing stored data.
notify pgrst, 'reload schema';
