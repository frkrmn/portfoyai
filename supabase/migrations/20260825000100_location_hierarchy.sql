create table if not exists public.countries (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z]{2}$'),
  name text not null unique
);

create table if not exists public.provinces (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries(id) on delete cascade,
  name text not null,
  unique (country_id, name)
);

create table if not exists public.districts (
  id uuid primary key default gen_random_uuid(),
  province_id uuid not null references public.provinces(id) on delete cascade,
  name text not null,
  unique (province_id, name)
);

create table if not exists public.neighborhoods (
  id uuid primary key default gen_random_uuid(),
  district_id uuid not null references public.districts(id) on delete cascade,
  name text not null,
  unique (district_id, name)
);

create index if not exists provinces_country_id_idx on public.provinces (country_id);
create index if not exists districts_province_id_idx on public.districts (province_id);
create index if not exists neighborhoods_district_id_idx on public.neighborhoods (district_id);

insert into public.countries (code, name)
values ('TR', 'Türkiye')
on conflict (code) do update set name = excluded.name;

alter table public.listings
  add column if not exists country_id uuid references public.countries(id),
  add column if not exists province_id uuid references public.provinces(id),
  add column if not exists district_id uuid references public.districts(id),
  add column if not exists neighborhood_id uuid references public.neighborhoods(id);

alter table public.sites
  add column if not exists country_id uuid references public.countries(id),
  add column if not exists province_id uuid references public.provinces(id),
  add column if not exists district_id uuid references public.districts(id),
  add column if not exists neighborhood_id uuid references public.neighborhoods(id);

create index if not exists listings_country_id_idx on public.listings (country_id);
create index if not exists listings_province_id_idx on public.listings (province_id);
create index if not exists listings_district_id_idx on public.listings (district_id);
create index if not exists listings_neighborhood_id_idx on public.listings (neighborhood_id);
create index if not exists sites_country_id_idx on public.sites (country_id);
create index if not exists sites_province_id_idx on public.sites (province_id);
create index if not exists sites_district_id_idx on public.sites (district_id);
create index if not exists sites_neighborhood_id_idx on public.sites (neighborhood_id);

-- Resolve and validate the complete parent chain from the most-specific value.
-- This keeps the schema country-agnostic while defaulting records to Turkey now.
create or replace function public.resolve_location_hierarchy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  turkey_id uuid;
  resolved_country uuid;
  resolved_province uuid;
  resolved_district uuid;
begin
  select id into turkey_id from public.countries where code = 'TR';
  new.country_id := coalesce(new.country_id, turkey_id);

  if new.neighborhood_id is not null then
    select d.id, d.province_id, p.country_id
      into resolved_district, resolved_province, resolved_country
    from public.neighborhoods n
    join public.districts d on d.id = n.district_id
    join public.provinces p on p.id = d.province_id
    where n.id = new.neighborhood_id;
    if resolved_district is null then raise exception 'Invalid neighborhood_id'; end if;
    if new.district_id is not null and new.district_id <> resolved_district then raise exception 'Neighborhood does not belong to district'; end if;
    if new.province_id is not null and new.province_id <> resolved_province then raise exception 'District does not belong to province'; end if;
    if new.country_id is not null and new.country_id <> resolved_country then raise exception 'Province does not belong to country'; end if;
    new.district_id := resolved_district;
    new.province_id := resolved_province;
    new.country_id := resolved_country;
  elsif new.district_id is not null then
    select d.province_id, p.country_id into resolved_province, resolved_country
    from public.districts d join public.provinces p on p.id = d.province_id
    where d.id = new.district_id;
    if resolved_province is null then raise exception 'Invalid district_id'; end if;
    if new.province_id is not null and new.province_id <> resolved_province then raise exception 'District does not belong to province'; end if;
    if new.country_id is not null and new.country_id <> resolved_country then raise exception 'Province does not belong to country'; end if;
    new.province_id := resolved_province;
    new.country_id := resolved_country;
  elsif new.province_id is not null then
    select country_id into resolved_country from public.provinces where id = new.province_id;
    if resolved_country is null then raise exception 'Invalid province_id'; end if;
    if new.country_id is not null and new.country_id <> resolved_country then raise exception 'Province does not belong to country'; end if;
    new.country_id := resolved_country;
  end if;
  return new;
end;
$$;

drop trigger if exists listings_resolve_location_hierarchy on public.listings;
create trigger listings_resolve_location_hierarchy
before insert or update of country_id, province_id, district_id, neighborhood_id on public.listings
for each row execute function public.resolve_location_hierarchy();

drop trigger if exists sites_resolve_location_hierarchy on public.sites;
create trigger sites_resolve_location_hierarchy
before insert or update of country_id, province_id, district_id, neighborhood_id on public.sites
for each row execute function public.resolve_location_hierarchy();

update public.listings set country_id = (select id from public.countries where code = 'TR') where country_id is null;
update public.sites set country_id = (select id from public.countries where code = 'TR') where country_id is null;

alter table public.countries enable row level security;
alter table public.provinces enable row level security;
alter table public.districts enable row level security;
alter table public.neighborhoods enable row level security;
