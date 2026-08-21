-- Give every persisted site its own stable public route identifier.

alter table public.sites
  add column if not exists slug text;

create unique index if not exists sites_slug_key on public.sites (slug);
