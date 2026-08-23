-- Optional urgency metadata used only by the urgent-deals template family.
alter table public.listings
  add column if not exists price_reduced_from numeric,
  add column if not exists urgent_sale boolean default false;

alter table public.listings
  drop constraint if exists listings_price_reduced_from_nonnegative;

alter table public.listings
  add constraint listings_price_reduced_from_nonnegative
  check (price_reduced_from is null or price_reduced_from >= 0);

create index if not exists listings_urgent_deals_idx
  on public.listings (site_id, created_at desc)
  where urgent_sale is true or price_reduced_from is not null;

notify pgrst, 'reload schema';
