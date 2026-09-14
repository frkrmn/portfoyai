create extension if not exists citext;
do $$ begin create type public.workspace_role as enum ('owner', 'editor', 'agent', 'viewer'); exception when duplicate_object then null; end $$;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(), name text not null check (char_length(name) between 1 and 120),
  slug citext not null unique, created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.workspace_memberships (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, role public.workspace_role not null,
  joined_at timestamptz not null default now(), invited_by uuid references auth.users(id), primary key (workspace_id, user_id)
);
create unique index if not exists workspace_single_owner_idx on public.workspace_memberships(workspace_id) where role = 'owner';
create index if not exists workspace_memberships_user_idx on public.workspace_memberships(user_id, workspace_id);
create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email citext not null, role public.workspace_role not null check (role <> 'owner'), token_hash text not null unique,
  invited_by uuid not null references auth.users(id), expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz, canceled_at timestamptz, created_at timestamptz not null default now()
);
create unique index if not exists workspace_active_invitation_idx on public.workspace_invitations(workspace_id, email) where accepted_at is null and canceled_at is null;
create table if not exists public.workspace_audit_logs (
  id bigint generated always as identity primary key, workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid references auth.users(id), action text not null, target_type text not null, target_id text,
  before jsonb, after jsonb, request_id text, ip_hash text, created_at timestamptz not null default now()
);
create index if not exists workspace_audit_logs_scope_idx on public.workspace_audit_logs(workspace_id, created_at desc);

alter table public.sites add column if not exists workspace_id uuid references public.workspaces(id);
alter table public.subscriptions add column if not exists workspace_id uuid references public.workspaces(id);
alter table public.lead_notification_preferences add column if not exists workspace_id uuid references public.workspaces(id);

do $$ declare owner_id uuid; workspace_uuid uuid; begin
  for owner_id in select distinct user_id from (select user_id from public.sites where user_id is not null union select user_id from public.subscriptions where user_id is not null union select user_id from public.lead_notification_preferences where user_id is not null) owners loop
    select workspace_id into workspace_uuid from public.workspace_memberships where user_id = owner_id and role = 'owner' limit 1;
    if workspace_uuid is null then
      insert into public.workspaces(name, slug, created_by) values ('Workspace', 'workspace-' || replace(owner_id::text, '-', ''), owner_id) returning id into workspace_uuid;
      insert into public.workspace_memberships(workspace_id, user_id, role) values (workspace_uuid, owner_id, 'owner');
    end if;
    update public.sites set workspace_id = workspace_uuid where user_id = owner_id and workspace_id is null;
    update public.subscriptions set workspace_id = workspace_uuid where user_id = owner_id and workspace_id is null;
    update public.lead_notification_preferences set workspace_id = workspace_uuid where user_id = owner_id and workspace_id is null;
  end loop;
end $$;
create index if not exists sites_workspace_idx on public.sites(workspace_id);
create index if not exists subscriptions_workspace_idx on public.subscriptions(workspace_id);

create or replace function public.is_workspace_member(target_workspace uuid) returns boolean language sql stable security definer set search_path = public, pg_temp as $$ select exists(select 1 from public.workspace_memberships where workspace_id = target_workspace and user_id = auth.uid()) $$;
create or replace function public.has_workspace_role(target_workspace uuid, allowed_roles public.workspace_role[]) returns boolean language sql stable security definer set search_path = public, pg_temp as $$ select exists(select 1 from public.workspace_memberships where workspace_id = target_workspace and user_id = auth.uid() and role = any(allowed_roles)) $$;
revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.has_workspace_role(uuid, public.workspace_role[]) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated, service_role;
grant execute on function public.has_workspace_role(uuid, public.workspace_role[]) to authenticated, service_role;

alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.workspace_audit_logs enable row level security;
create policy workspace_member_read on public.workspaces for select to authenticated using (public.is_workspace_member(id));
create policy membership_member_read on public.workspace_memberships for select to authenticated using (public.has_workspace_role(workspace_id, array['owner','editor']::public.workspace_role[]));
create policy invitation_manager_read on public.workspace_invitations for select to authenticated using (public.has_workspace_role(workspace_id, array['owner','editor']::public.workspace_role[]));
create policy audit_member_read on public.workspace_audit_logs for select to authenticated using (public.is_workspace_member(workspace_id));

create policy workspace_site_read on public.sites for select to authenticated using (workspace_id is not null and public.is_workspace_member(workspace_id));
create policy workspace_site_write on public.sites for update to authenticated using (public.has_workspace_role(workspace_id, array['owner','editor']::public.workspace_role[])) with check (public.has_workspace_role(workspace_id, array['owner','editor']::public.workspace_role[]));
create policy workspace_listing_read on public.listings for select to authenticated using (exists(select 1 from public.sites s where s.id = listings.site_id and public.is_workspace_member(s.workspace_id)));
create policy workspace_listing_write on public.listings for all to authenticated using (exists(select 1 from public.sites s where s.id = listings.site_id and public.has_workspace_role(s.workspace_id, array['owner','editor','agent']::public.workspace_role[]))) with check (exists(select 1 from public.sites s where s.id = listings.site_id and public.has_workspace_role(s.workspace_id, array['owner','editor','agent']::public.workspace_role[])));
create policy workspace_lead_read on public.leads for select to authenticated using (exists(select 1 from public.sites s where s.id = leads.site_id and public.is_workspace_member(s.workspace_id)));
create policy workspace_lead_write on public.leads for update to authenticated using (exists(select 1 from public.sites s where s.id = leads.site_id and public.has_workspace_role(s.workspace_id, array['owner','editor','agent']::public.workspace_role[])));
create policy workspace_team_read on public.team_members for select to authenticated using (exists(select 1 from public.sites s where s.id = team_members.site_id and public.is_workspace_member(s.workspace_id)));
create policy workspace_team_write on public.team_members for all to authenticated using (exists(select 1 from public.sites s where s.id = team_members.site_id and public.has_workspace_role(s.workspace_id, array['owner','editor']::public.workspace_role[]))) with check (exists(select 1 from public.sites s where s.id = team_members.site_id and public.has_workspace_role(s.workspace_id, array['owner','editor']::public.workspace_role[])));

create or replace function public.accept_workspace_invitation(p_token_hash text, p_user_id uuid, p_request_id text default null) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare invitation public.workspace_invitations; membership public.workspace_memberships;
begin
  select * into invitation from public.workspace_invitations where token_hash = p_token_hash for update;
  if invitation.id is null or invitation.canceled_at is not null or invitation.expires_at <= now() then raise exception 'Invitation is not available'; end if;
  if invitation.accepted_at is not null then select * into membership from public.workspace_memberships where workspace_id = invitation.workspace_id and user_id = p_user_id; return to_jsonb(membership); end if;
  insert into public.workspace_memberships(workspace_id,user_id,role,invited_by) values(invitation.workspace_id,p_user_id,invitation.role,invitation.invited_by) on conflict(workspace_id,user_id) do update set role=excluded.role returning * into membership;
  update public.workspace_invitations set accepted_at=now() where id=invitation.id;
  insert into public.workspace_audit_logs(workspace_id,actor_user_id,action,target_type,target_id,after,request_id) values(invitation.workspace_id,p_user_id,'invitation.accepted','membership',p_user_id::text,jsonb_build_object('role',invitation.role),p_request_id);
  return to_jsonb(membership);
end $$;
revoke all on function public.accept_workspace_invitation(text,uuid,text) from public, anon, authenticated;
grant execute on function public.accept_workspace_invitation(text,uuid,text) to service_role;

-- Rollback: disable WORKSPACE_COLLABORATION_ENABLED. Legacy owner policies and user_id remain intact.
