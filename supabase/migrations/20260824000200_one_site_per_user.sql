-- Normal users may own one site. ADMIN_EMAILS is evaluated by the server, which
-- writes owner_limit_exempt=true for admin-created sites so the database rule
-- can preserve the explicit admin exception.
alter table public.sites
  add column if not exists owner_limit_exempt boolean not null default false;

-- Preserve pre-existing duplicate sites without deleting customer data. Only
-- the oldest row participates in the normal-user uniqueness rule; the API still
-- blocks every non-admin owner that already has any site.
with ranked as (
  select id, row_number() over (partition by user_id order by created_at, id) as owner_row
  from public.sites
  where user_id is not null
)
update public.sites as site
set owner_limit_exempt = true
from ranked
where site.id = ranked.id and ranked.owner_row > 1;

create unique index if not exists sites_one_per_user_idx
  on public.sites (user_id)
  where user_id is not null and owner_limit_exempt = false;

-- Only the trusted service-role generation handler may grant the row-level
-- exception. Authenticated clients cannot bypass the index by writing the flag.
create or replace function public.protect_site_owner_limit_exemption()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    new.owner_limit_exempt := false;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_site_owner_limit_exemption on public.sites;
create trigger protect_site_owner_limit_exemption
before insert or update of owner_limit_exempt on public.sites
for each row execute function public.protect_site_owner_limit_exemption();
