-- Ensure investment metrics exist and migrate starter rows created while an
-- older PostgREST schema was still active. Existing non-investment rows remain
-- NULL and are unaffected.
alter table public.listings
  add column if not exists rental_yield_percent numeric,
  add column if not exists roi_notes text;

update public.listings as listing
set rental_yield_percent = (
  select replace(feature, 'Tahmini kira getirisi: %', '')::numeric
  from jsonb_array_elements_text(listing.features) as feature
  where feature like 'Tahmini kira getirisi: %'
  limit 1
)
where listing.rental_yield_percent is null
  and exists (
    select 1
    from jsonb_array_elements_text(listing.features) as feature
    where feature like 'Tahmini kira getirisi: %'
  );

update public.listings as listing
set roi_notes = (
  select replace(feature, 'Yatırım görünümü: ', '')
  from jsonb_array_elements_text(listing.features) as feature
  where feature like 'Yatırım görünümü: %'
  limit 1
)
where listing.roi_notes is null
  and exists (
    select 1
    from jsonb_array_elements_text(listing.features) as feature
    where feature like 'Yatırım görünümü: %'
  );
