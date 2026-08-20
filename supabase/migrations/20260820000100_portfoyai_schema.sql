-- PortföyAI schema scaffold
-- Tables and policies mirror the app's local demo state.

create extension if not exists "pgcrypto";

do $$
begin
  create type public.plan_type as enum ('free', 'pro');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.site_status as enum ('draft', 'published');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.listing_status as enum ('active', 'passive', 'sold');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.listing_type as enum ('sale', 'rent');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  phone text not null,
  region text not null,
  plan public.plan_type not null default 'free',
  created_at timestamptz not null default now(),
  business_name text not null,
  tone text not null,
  color_direction text not null,
  bio text not null
);

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  subdomain text not null unique,
  custom_domain text,
  theme_config jsonb not null,
  status public.site_status not null default 'draft',
  created_at timestamptz not null default now(),
  hero_title text not null,
  hero_subtitle text not null
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  title text not null,
  description text not null,
  price numeric not null,
  currency text not null default 'TRY',
  m2 numeric not null,
  room_count text not null,
  listing_type public.listing_type not null,
  district text not null,
  lat numeric not null,
  lng numeric not null,
  media jsonb not null default '[]'::jsonb,
  status public.listing_status not null default 'active',
  features jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  name text not null,
  phone text not null,
  message text not null,
  source text not null,
  created_at timestamptz not null default now()
);

alter table public.agents enable row level security;
alter table public.sites enable row level security;
alter table public.listings enable row level security;
alter table public.leads enable row level security;

create policy "Agents can read own profile"
on public.agents for select
using (auth.uid()::text = id::text);

create policy "Agents can manage own profile"
on public.agents for all
using (auth.uid()::text = id::text)
with check (auth.uid()::text = id::text);

create policy "Agents can read own sites"
on public.sites for select
using (
  exists (
    select 1 from public.agents a
    where a.id = sites.agent_id and auth.uid()::text = a.id::text
  )
);

create policy "Agents can manage own sites"
on public.sites for all
using (
  exists (
    select 1 from public.agents a
    where a.id = sites.agent_id and auth.uid()::text = a.id::text
  )
)
with check (
  exists (
    select 1 from public.agents a
    where a.id = sites.agent_id and auth.uid()::text = a.id::text
  )
);

create policy "Agents can read own listings"
on public.listings for select
using (
  exists (
    select 1 from public.sites s
    join public.agents a on a.id = s.agent_id
    where s.id = listings.site_id and auth.uid()::text = a.id::text
  )
);

create policy "Agents can manage own listings"
on public.listings for all
using (
  exists (
    select 1 from public.sites s
    join public.agents a on a.id = s.agent_id
    where s.id = listings.site_id and auth.uid()::text = a.id::text
  )
)
with check (
  exists (
    select 1 from public.sites s
    join public.agents a on a.id = s.agent_id
    where s.id = listings.site_id and auth.uid()::text = a.id::text
  )
);

create policy "Agents can read own leads"
on public.leads for select
using (
  exists (
    select 1 from public.sites s
    join public.agents a on a.id = s.agent_id
    where s.id = leads.site_id and auth.uid()::text = a.id::text
  )
);

create policy "Public can create leads"
on public.leads for insert
with check (true);

create policy "Agents can manage own leads"
on public.leads for all
using (
  exists (
    select 1 from public.sites s
    join public.agents a on a.id = s.agent_id
    where s.id = leads.site_id and auth.uid()::text = a.id::text
  )
)
with check (
  exists (
    select 1 from public.sites s
    join public.agents a on a.id = s.agent_id
    where s.id = leads.site_id and auth.uid()::text = a.id::text
  )
);
