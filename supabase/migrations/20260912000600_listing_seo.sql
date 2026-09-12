alter table public.listings
  add column if not exists seo jsonb not null default '{}'::jsonb;

comment on column public.listings.seo is 'Localized title/description and social/canonical/robots overrides managed by the listing owner.';
