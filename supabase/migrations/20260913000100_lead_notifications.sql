alter table public.leads add column if not exists listing_id uuid references public.listings(id) on delete set null;

create table if not exists public.lead_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_enabled boolean not null default true,
  whatsapp_enabled boolean not null default false,
  browser_enabled boolean not null default true,
  email_to text,
  whatsapp_to text,
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('email', 'whatsapp', 'browser')),
  status text not null default 'pending' check (status in ('pending', 'ready', 'delivered', 'failed')),
  attempts integer not null default 0,
  idempotency_key text not null unique,
  last_error text,
  delivered_at timestamptz,
  next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lead_notification_deliveries_user_created_idx
  on public.lead_notification_deliveries (user_id, created_at desc);

alter table public.lead_notification_preferences enable row level security;
alter table public.lead_notification_deliveries enable row level security;

drop policy if exists "Users manage notification preferences" on public.lead_notification_preferences;
create policy "Users manage notification preferences" on public.lead_notification_preferences
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "Users read notification deliveries" on public.lead_notification_deliveries;
create policy "Users read notification deliveries" on public.lead_notification_deliveries
  for select to authenticated using (user_id = (select auth.uid()));

notify pgrst, 'reload schema';
