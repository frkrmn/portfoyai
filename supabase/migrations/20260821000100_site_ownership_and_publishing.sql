-- Link sites directly to Supabase Auth users while preserving unclaimed guest drafts.
alter table public.sites
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists sites_user_id_idx on public.sites (user_id);

alter table public.sites enable row level security;

-- Replace the legacy agent_id ownership policies. A site's authenticated owner is
-- now authoritative for reads and mutations through the Supabase client.
drop policy if exists "Agents can read own sites" on public.sites;
drop policy if exists "Agents can manage own sites" on public.sites;
drop policy if exists "Site owners can read own sites" on public.sites;
drop policy if exists "Site owners can update own sites" on public.sites;
drop policy if exists "Site owners can delete own sites" on public.sites;

create policy "Site owners can read own sites"
on public.sites for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Site owners can update own sites"
on public.sites for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Site owners can delete own sites"
on public.sites for delete
to authenticated
using (user_id = (select auth.uid()));

-- There is intentionally no anonymous SELECT policy on the full sites table.
-- /site/:slug is served by the narrow /api/public-sites/:slug projection, whose
-- server-side service-role client bypasses RLS only for that explicitly public path.
