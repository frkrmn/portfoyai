alter table public.listings
  add column if not exists currency text;

update public.listings
set currency = 'TRY'
where currency is null or currency not in ('TRY', 'USD', 'GBP', 'EUR');

alter table public.listings
  alter column currency set default 'TRY',
  alter column currency set not null;

alter table public.listings
  drop constraint if exists listings_currency_check;

alter table public.listings
  add constraint listings_currency_check
  check (currency in ('TRY', 'USD', 'GBP', 'EUR'));
