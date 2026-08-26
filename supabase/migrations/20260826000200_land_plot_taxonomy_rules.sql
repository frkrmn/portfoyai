create or replace function public.normalize_listing_property_taxonomy()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.property_category = 'konut' then
    if new.property_subtype not in ('daire', 'mustakil_ev', 'villa', 'rezidans') or new.property_subtype is null then
      new.property_subtype := 'daire';
    end if;
  elsif new.property_category = 'arsa' then
    if new.property_subtype not in ('konut_imarli', 'ticari_imarli', 'tarla_tarimsal', 'villa_imarli', 'kentsel_donusum') or new.property_subtype is null then
      new.property_subtype := 'konut_imarli';
    end if;
  else
    new.property_subtype := null;
  end if;
  return new;
end;
$$;

update public.listings set property_subtype = 'daire'
where property_category = 'konut'
  and (property_subtype is null or property_subtype not in ('daire', 'mustakil_ev', 'villa', 'rezidans'));

update public.listings set property_subtype = 'konut_imarli'
where property_category = 'arsa'
  and (property_subtype is null or property_subtype not in ('konut_imarli', 'ticari_imarli', 'tarla_tarimsal', 'villa_imarli', 'kentsel_donusum'));

update public.listings set property_subtype = null where property_category = 'isyeri';

alter table public.listings drop constraint if exists listings_property_taxonomy_check;
alter table public.listings add constraint listings_property_taxonomy_check check (
  (property_category = 'konut' and property_subtype in ('daire', 'mustakil_ev', 'villa', 'rezidans'))
  or (property_category = 'arsa' and property_subtype in ('konut_imarli', 'ticari_imarli', 'tarla_tarimsal', 'villa_imarli', 'kentsel_donusum'))
  or (property_category = 'isyeri' and property_subtype is null)
);

notify pgrst, 'reload schema';
