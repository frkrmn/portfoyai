create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  name text not null,
  role text not null,
  bio text,
  photo_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists team_members_site_sort_idx
  on public.team_members (site_id, sort_order, created_at);

alter table public.sites
  add column if not exists show_team_section boolean not null default false,
  add column if not exists team_section_label text;

alter table public.team_members enable row level security;

drop policy if exists "Owners can read team members" on public.team_members;
create policy "Owners can read team members" on public.team_members for select
using (exists (select 1 from public.sites where sites.id = team_members.site_id and sites.user_id = auth.uid()));

drop policy if exists "Owners can insert team members" on public.team_members;
create policy "Owners can insert team members" on public.team_members for insert
with check (exists (select 1 from public.sites where sites.id = team_members.site_id and sites.user_id = auth.uid()));

drop policy if exists "Owners can update team members" on public.team_members;
create policy "Owners can update team members" on public.team_members for update
using (exists (select 1 from public.sites where sites.id = team_members.site_id and sites.user_id = auth.uid()))
with check (exists (select 1 from public.sites where sites.id = team_members.site_id and sites.user_id = auth.uid()));

drop policy if exists "Owners can delete team members" on public.team_members;
create policy "Owners can delete team members" on public.team_members for delete
using (exists (select 1 from public.sites where sites.id = team_members.site_id and sites.user_id = auth.uid()));

insert into public.team_members (site_id, name, role, bio, photo_url, sort_order)
select site.id, member->>'name', member->>'role', nullif(member->>'bio', ''), nullif(member->>'photo_url', ''), member_index - 1
from public.sites site
cross join lateral jsonb_array_elements(coalesce(site.theme_config->'content'->'teamMembers', '[]'::jsonb)) with ordinality as item(member, member_index)
where site.theme_config->>'template_id' = 'land-plots'
  and member->>'name' is not null
  and member->>'role' is not null
  and not exists (select 1 from public.team_members existing where existing.site_id = site.id);

update public.sites
set show_team_section = true
where theme_config->>'template_id' = 'land-plots'
  and exists (select 1 from public.team_members where team_members.site_id = sites.id);

notify pgrst, 'reload schema';
