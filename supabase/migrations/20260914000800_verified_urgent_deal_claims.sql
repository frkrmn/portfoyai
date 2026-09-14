alter table public.listings
  add column if not exists price_history jsonb not null default '[]'::jsonb,
  add column if not exists urgent_verified_by uuid references auth.users(id) on delete set null,
  add column if not exists urgent_verified_at timestamptz,
  add column if not exists urgent_expires_at timestamptz;

alter table public.listings drop constraint if exists listings_price_history_array;
alter table public.listings add constraint listings_price_history_array check (jsonb_typeof(price_history) = 'array');

-- Legacy urgency flags have no verifier or expiry, so they cannot remain public claims.
update public.listings
set urgent_sale = false
where urgent_sale is true
  and (urgent_verified_by is null or urgent_verified_at is null or urgent_expires_at is null);

alter table public.listings drop constraint if exists listings_urgency_verification_complete;
alter table public.listings add constraint listings_urgency_verification_complete check (
  urgent_sale is not true or (
    urgent_verified_by is not null and urgent_verified_at is not null and
    urgent_expires_at is not null and urgent_expires_at > urgent_verified_at
  )
);

comment on column public.listings.price_history is 'Server-maintained price audit events; client payloads cannot overwrite this field.';
