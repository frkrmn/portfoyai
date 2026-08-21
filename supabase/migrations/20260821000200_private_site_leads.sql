-- Public contact submissions are stored here, but lead contents are readable only
-- by the authenticated owner of the site they belong to.
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  name text not null,
  phone text not null,
  message text,
  created_at timestamptz not null default now()
);

-- The original scaffold required message/source. Keep old databases compatible
-- with the smaller public contact payload without adding legacy fields to new ones.
alter table public.leads alter column message drop not null;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'leads' and column_name = 'source'
  ) then
    alter table public.leads alter column source set default 'public-site';
  end if;
end $$;

create index if not exists leads_site_id_created_at_idx
  on public.leads (site_id, created_at desc);

alter table public.leads enable row level security;

-- Remove every legacy policy, including the anonymous INSERT and agent_id-based
-- policies. Public writes now go through the validated POST /api/leads endpoint.
drop policy if exists "Agents can read own leads" on public.leads;
drop policy if exists "Public can create leads" on public.leads;
drop policy if exists "Agents can manage own leads" on public.leads;
drop policy if exists "Site owners can read own leads" on public.leads;

create policy "Site owners can read own leads"
on public.leads for select
to authenticated
using (
  exists (
    select 1
    from public.sites
    where sites.id = leads.site_id
      and sites.user_id = (select auth.uid())
  )
);

-- No direct INSERT, UPDATE, or DELETE policies are intentionally defined.
