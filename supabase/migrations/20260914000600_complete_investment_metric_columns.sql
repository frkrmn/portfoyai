alter table public.listings
  add column if not exists rental_yield_percent numeric,
  add column if not exists roi_notes text,
  add column if not exists investment_metrics jsonb not null default '{}'::jsonb;

alter table public.listings drop constraint if exists listings_rental_yield_range;
alter table public.listings add constraint listings_rental_yield_range check (
  rental_yield_percent is null or (rental_yield_percent > 0 and rental_yield_percent <= 100)
);
