-- Optional investment metrics. Existing listings remain valid with NULL values,
-- and templates that do not consume these columns are unaffected.
alter table public.listings
  add column if not exists rental_yield_percent numeric,
  add column if not exists roi_notes text;

comment on column public.listings.rental_yield_percent is
  'Estimated annual gross rental yield percentage; optional.';

comment on column public.listings.roi_notes is
  'Short, optional investment outlook note shown by investment-focused templates.';
