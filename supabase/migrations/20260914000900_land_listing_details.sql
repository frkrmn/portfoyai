alter table public.listings
  add column if not exists land_details jsonb not null default '{}'::jsonb;

alter table public.listings drop constraint if exists listings_land_details_object;
alter table public.listings add constraint listings_land_details_object check (jsonb_typeof(land_details) = 'object');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('land-documents', 'land-documents', false, 10485760, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_read_land_document(object_name text) returns boolean
language sql stable security definer set search_path = public, storage, pg_temp as $$
  select exists (
    select 1 from public.sites s
    where s.id::text = (storage.foldername(object_name))[1]
      and (s.user_id = auth.uid() or (s.workspace_id is not null and public.is_workspace_member(s.workspace_id)))
  )
$$;
create or replace function public.can_write_land_document(object_name text) returns boolean
language sql stable security definer set search_path = public, storage, pg_temp as $$
  select exists (
    select 1 from public.sites s
    where s.id::text = (storage.foldername(object_name))[1]
      and (s.user_id = auth.uid() or (s.workspace_id is not null and public.has_workspace_role(s.workspace_id, array['owner','editor','agent']::public.workspace_role[])))
  )
$$;
revoke all on function public.can_read_land_document(text), public.can_write_land_document(text) from public;
grant execute on function public.can_read_land_document(text), public.can_write_land_document(text) to authenticated, service_role;

drop policy if exists land_documents_authorized_read on storage.objects;
create policy land_documents_authorized_read on storage.objects for select to authenticated
using (bucket_id = 'land-documents' and public.can_read_land_document(name));
drop policy if exists land_documents_authorized_insert on storage.objects;
create policy land_documents_authorized_insert on storage.objects for insert to authenticated
with check (bucket_id = 'land-documents' and public.can_write_land_document(name));
drop policy if exists land_documents_authorized_delete on storage.objects;
create policy land_documents_authorized_delete on storage.objects for delete to authenticated
using (bucket_id = 'land-documents' and public.can_write_land_document(name));

comment on column public.listings.land_details is 'Normalized land-only technical details. Document paths point to the private land-documents bucket.';
