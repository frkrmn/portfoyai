do $$
begin
  if not exists (select 1 from pg_type where typname = 'listing_property_category') then
    create type public.listing_property_category as enum ('konut', 'arsa', 'isyeri');
  end if;
  if not exists (select 1 from pg_type where typname = 'listing_property_subtype') then
    create type public.listing_property_subtype as enum ('daire', 'mustakil_ev', 'villa', 'rezidans');
  end if;
end
$$;

alter table public.listings
  add column if not exists property_category public.listing_property_category not null default 'konut',
  add column if not exists property_subtype public.listing_property_subtype default 'daire';

update public.listings
set property_category = 'konut', property_subtype = 'daire'
where property_category is null;

update public.listings
set property_subtype = null
where property_category <> 'konut';

create or replace function public.normalize_listing_property_taxonomy()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.property_category = 'konut' then
    new.property_subtype := coalesce(new.property_subtype, 'daire');
  else
    new.property_subtype := null;
  end if;
  return new;
end;
$$;

drop trigger if exists normalize_listing_property_taxonomy_trigger on public.listings;
create trigger normalize_listing_property_taxonomy_trigger
before insert or update of property_category, property_subtype on public.listings
for each row execute function public.normalize_listing_property_taxonomy();

alter table public.listings
  drop constraint if exists listings_property_taxonomy_check;

alter table public.listings
  add constraint listings_property_taxonomy_check check (
    (property_category = 'konut' and property_subtype is not null)
    or (property_category in ('arsa', 'isyeri') and property_subtype is null)
  );

create index if not exists listings_site_property_taxonomy_idx
  on public.listings (site_id, property_category, property_subtype);

notify pgrst, 'reload schema';
