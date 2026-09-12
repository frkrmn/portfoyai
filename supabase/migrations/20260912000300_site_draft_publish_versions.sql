alter table public.sites
  add column if not exists published_snapshot jsonb,
  add column if not exists draft_revision bigint not null default 1,
  add column if not exists published_version bigint not null default 0,
  add column if not exists published_at timestamptz;

update public.sites
set published_snapshot = jsonb_build_object(
  'theme_config', theme_config,
  'business_name', business_name,
  'phone', phone,
  'email', email,
  'address', address,
  'region_focus', region_focus,
  'map_url', map_url,
  'show_closed_listings', show_closed_listings,
  'show_team_section', show_team_section,
  'team_section_label', team_section_label,
  'country_id', country_id,
  'province_id', province_id,
  'district_id', district_id,
  'neighborhood_id', neighborhood_id
), published_version = 1, published_at = coalesce(published_at, created_at)
where status = 'published' and published_snapshot is null;

create table if not exists public.site_versions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  version bigint not null,
  snapshot jsonb not null,
  published_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (site_id, version)
);

create index if not exists site_versions_site_created_idx on public.site_versions(site_id, created_at desc);
alter table public.site_versions enable row level security;
create policy "Site owners can read version history" on public.site_versions for select to authenticated
using (exists (select 1 from public.sites where sites.id = site_versions.site_id and sites.user_id = (select auth.uid())));

create or replace function public.publish_site_version(p_site_id uuid, p_user_id uuid, p_expected_revision bigint)
returns public.sites
language plpgsql security definer set search_path = public
as $$
declare s public.sites; next_version bigint; snapshot jsonb;
begin
  select * into s from public.sites where id = p_site_id and user_id = p_user_id for update;
  if not found then raise exception 'SITE_NOT_FOUND'; end if;
  if s.draft_revision <> p_expected_revision then raise exception 'REVISION_CONFLICT'; end if;
  next_version := s.published_version + 1;
  snapshot := jsonb_build_object('theme_config', s.theme_config, 'business_name', s.business_name, 'phone', s.phone, 'email', s.email, 'address', s.address, 'region_focus', s.region_focus, 'map_url', s.map_url, 'show_closed_listings', s.show_closed_listings, 'show_team_section', s.show_team_section, 'team_section_label', s.team_section_label, 'country_id', s.country_id, 'province_id', s.province_id, 'district_id', s.district_id, 'neighborhood_id', s.neighborhood_id);
  insert into public.site_versions(site_id, version, snapshot, published_by) values (s.id, next_version, snapshot, p_user_id);
  update public.sites set published_snapshot = snapshot, published_version = next_version, published_at = now(), status = 'published' where id = s.id returning * into s;
  return s;
end $$;

create or replace function public.rollback_site_version(p_site_id uuid, p_user_id uuid, p_version bigint)
returns public.sites
language plpgsql security definer set search_path = public
as $$
declare s public.sites; target jsonb; next_version bigint;
begin
  select * into s from public.sites where id = p_site_id and user_id = p_user_id for update;
  if not found then raise exception 'SITE_NOT_FOUND'; end if;
  select snapshot into target from public.site_versions where site_id = p_site_id and version = p_version;
  if target is null then raise exception 'VERSION_NOT_FOUND'; end if;
  next_version := s.published_version + 1;
  insert into public.site_versions(site_id, version, snapshot, published_by) values (s.id, next_version, target, p_user_id);
  update public.sites set published_snapshot = target, published_version = next_version, published_at = now(), status = 'published' where id = s.id returning * into s;
  return s;
end $$;

revoke all on function public.publish_site_version(uuid, uuid, bigint) from public;
revoke all on function public.rollback_site_version(uuid, uuid, bigint) from public;
grant execute on function public.publish_site_version(uuid, uuid, bigint) to service_role;
grant execute on function public.rollback_site_version(uuid, uuid, bigint) to service_role;
