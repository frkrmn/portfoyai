alter table public.listings
  add column if not exists investment_metrics jsonb not null default '{}'::jsonb;

alter table public.listings drop constraint if exists listings_investment_metrics_shape;
alter table public.listings add constraint listings_investment_metrics_shape check (
  jsonb_typeof(investment_metrics) = 'object'
  and (not (investment_metrics ? 'rental_yield') or investment_metrics->'rental_yield'->>'status' in ('actual', 'estimate'))
  and (not (investment_metrics ? 'price_per_m2') or investment_metrics->'price_per_m2'->>'status' in ('actual', 'estimate'))
);

comment on column public.listings.investment_metrics is
  'Provenance, as-of date, actual/estimate status and visibility for investment metrics.';
