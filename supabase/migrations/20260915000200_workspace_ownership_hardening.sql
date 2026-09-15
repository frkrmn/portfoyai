-- GRM-110 preflight: record the effective grant/policy state before replacing it.
do $$
declare
  policy_names text;
begin
  select string_agg(policyname, ', ' order by policyname) into policy_names
  from pg_policies where schemaname = 'public' and tablename = 'sites';
  raise notice 'GRM-110 preflight: authenticated table UPDATE=%, user_id UPDATE=%, workspace_id UPDATE=%, policies=%',
    has_table_privilege('authenticated', 'public.sites', 'UPDATE'),
    has_column_privilege('authenticated', 'public.sites', 'user_id', 'UPDATE'),
    has_column_privilege('authenticated', 'public.sites', 'workspace_id', 'UPDATE'),
    coalesce(policy_names, '(none)');
end $$;

-- Identity columns are never writable through an authenticated PostgREST role.
-- Trusted service-role flows and the audited ownership-transfer RPC execute as a
-- privileged database role and remain able to perform controlled changes.
create or replace function public.protect_site_identity_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (new.user_id is distinct from old.user_id or new.workspace_id is distinct from old.workspace_id)
     and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception using errcode = '42501', message = 'SITE_IDENTITY_IMMUTABLE';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_site_identity_columns on public.sites;
create trigger protect_site_identity_columns
before update of user_id, workspace_id on public.sites
for each row execute function public.protect_site_identity_columns();

-- Repair any stale or previously poisoned legacy ownership value by binding it
-- to the workspace's single canonical owner before legacy policies are removed.
update public.sites s
set user_id = owner_membership.user_id
from public.workspace_memberships owner_membership
where owner_membership.workspace_id = s.workspace_id
  and owner_membership.role = 'owner'
  and s.user_id is distinct from owner_membership.user_id;

-- Replace additive legacy/workspace policies with one canonical policy per
-- operation. user_id is retained only as a fallback for unmigrated rows.
drop policy if exists "Site owners can read own sites" on public.sites;
drop policy if exists "Site owners can update own sites" on public.sites;
drop policy if exists "Site owners can delete own sites" on public.sites;
drop policy if exists workspace_site_read on public.sites;
drop policy if exists workspace_site_write on public.sites;
drop policy if exists site_access_read on public.sites;
drop policy if exists site_access_update on public.sites;
drop policy if exists site_access_delete on public.sites;

create policy site_access_read on public.sites for select to authenticated using (
  (workspace_id is null and user_id = (select auth.uid()))
  or (workspace_id is not null and public.is_workspace_member(workspace_id))
);

create policy site_access_update on public.sites for update to authenticated using (
  (workspace_id is null and user_id = (select auth.uid()))
  or (workspace_id is not null and public.has_workspace_role(workspace_id, array['owner','editor']::public.workspace_role[]))
) with check (
  (workspace_id is null and user_id = (select auth.uid()))
  or (workspace_id is not null and public.has_workspace_role(workspace_id, array['owner','editor']::public.workspace_role[]))
);

create policy site_access_delete on public.sites for delete to authenticated using (
  (workspace_id is null and user_id = (select auth.uid()))
  or (workspace_id is not null and public.has_workspace_role(workspace_id, array['owner']::public.workspace_role[]))
);

create or replace function public.transfer_workspace_ownership(
  p_workspace_id uuid,
  p_new_owner_id uuid,
  p_actor_user_id uuid,
  p_request_id text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_owner_id uuid;
  target_role public.workspace_role;
begin
  perform 1 from public.workspaces where id = p_workspace_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'WORKSPACE_NOT_FOUND'; end if;

  select user_id into current_owner_id from public.workspace_memberships
  where workspace_id = p_workspace_id and role = 'owner' for update;
  if current_owner_id is distinct from p_actor_user_id then
    raise exception using errcode = '42501', message = 'ONLY_OWNER_CAN_TRANSFER';
  end if;
  if p_new_owner_id = current_owner_id then return jsonb_build_object('workspace_id', p_workspace_id, 'owner_user_id', current_owner_id); end if;

  select role into target_role from public.workspace_memberships
  where workspace_id = p_workspace_id and user_id = p_new_owner_id for update;
  if target_role is null then raise exception using errcode = 'P0002', message = 'TARGET_MEMBER_NOT_FOUND'; end if;

  update public.workspace_memberships set role = 'editor'
  where workspace_id = p_workspace_id and user_id = current_owner_id;
  update public.workspace_memberships set role = 'owner'
  where workspace_id = p_workspace_id and user_id = p_new_owner_id;
  update public.sites set user_id = p_new_owner_id where workspace_id = p_workspace_id;

  insert into public.workspace_audit_logs(workspace_id, actor_user_id, action, target_type, target_id, before, after, request_id)
  values (p_workspace_id, p_actor_user_id, 'workspace.ownership_transferred', 'membership', p_new_owner_id::text,
    jsonb_build_object('owner_user_id', current_owner_id), jsonb_build_object('owner_user_id', p_new_owner_id), left(p_request_id, 100));

  return jsonb_build_object('workspace_id', p_workspace_id, 'owner_user_id', p_new_owner_id, 'previous_owner_user_id', current_owner_id);
end;
$$;

revoke all on function public.transfer_workspace_ownership(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.transfer_workspace_ownership(uuid, uuid, uuid, text) to service_role;

-- Rollback plan: drop the trigger/function and these three site_access policies,
-- then recreate workspace_site_read/workspace_site_write plus the legacy policies
-- from migrations 20260821000100 and 20260914000300. Existing legacy rows remain
-- recoverable because user_id is preserved throughout this migration.
notify pgrst, 'reload schema';
