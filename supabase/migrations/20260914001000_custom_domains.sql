create table if not exists public.site_domains (
  site_id uuid primary key references public.sites(id) on delete cascade,
  domain citext not null unique,
  status text not null default 'pending' check (status in ('pending','verified','error')),
  ssl_status text not null default 'pending' check (ssl_status in ('pending','active','error')),
  dns_records jsonb not null default '[]'::jsonb check (jsonb_typeof(dns_records) = 'array'),
  provider_data jsonb not null default '{}'::jsonb,
  error_code text,
  error_message text,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists site_domains_domain_lower_idx on public.site_domains(lower(domain::text));
alter table public.site_domains enable row level security;
create policy site_domain_member_read on public.site_domains for select to authenticated using (
  exists(select 1 from public.sites s where s.id = site_domains.site_id and (s.user_id = auth.uid() or public.is_workspace_member(s.workspace_id)))
);
create policy site_domain_authorized_write on public.site_domains for all to authenticated using (
  exists(select 1 from public.sites s where s.id = site_domains.site_id and (s.user_id = auth.uid() or public.has_workspace_role(s.workspace_id, array['owner','editor']::public.workspace_role[])))
) with check (
  exists(select 1 from public.sites s where s.id = site_domains.site_id and (s.user_id = auth.uid() or public.has_workspace_role(s.workspace_id, array['owner','editor']::public.workspace_role[])))
);
comment on table public.site_domains is 'One verified Vercel custom domain per site; globally unique to prevent conflicts.';
