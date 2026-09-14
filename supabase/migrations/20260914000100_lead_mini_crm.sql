alter table public.leads
  add column if not exists email text,
  add column if not exists crm_status text not null default 'new',
  add column if not exists assignee text,
  add column if not exists note text,
  add column if not exists reminder_at timestamptz;

alter table public.leads drop constraint if exists leads_crm_status_check;
alter table public.leads add constraint leads_crm_status_check
  check (crm_status in ('new', 'contacted', 'appointment', 'won', 'lost'));

create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists lead_activities_lead_created_idx on public.lead_activities (lead_id, created_at desc);
create index if not exists leads_site_crm_status_idx on public.leads (site_id, crm_status, created_at desc);
alter table public.lead_activities enable row level security;

create or replace function public.merge_owned_leads(p_primary_id uuid, p_duplicate_id uuid, p_user_id uuid)
returns public.leads language plpgsql security definer set search_path = public as $$
declare primary_lead public.leads; duplicate_lead public.leads;
begin
  select l.* into primary_lead from public.leads l join public.sites s on s.id=l.site_id where l.id=p_primary_id and s.user_id=p_user_id for update;
  select l.* into duplicate_lead from public.leads l where l.id=p_duplicate_id and l.site_id=primary_lead.site_id for update;
  if primary_lead.id is null or duplicate_lead.id is null or primary_lead.id=duplicate_lead.id then raise exception 'LEAD_NOT_FOUND'; end if;
  update public.leads set
    email=coalesce(nullif(primary_lead.email,''), duplicate_lead.email),
    message=concat_ws(E'\n\n', nullif(primary_lead.message,''), nullif(duplicate_lead.message,'')),
    note=concat_ws(E'\n', nullif(primary_lead.note,''), nullif(duplicate_lead.note,'')),
    reminder_at=coalesce(primary_lead.reminder_at, duplicate_lead.reminder_at)
  where id=p_primary_id returning * into primary_lead;
  update public.lead_activities set lead_id=p_primary_id where lead_id=p_duplicate_id;
  insert into public.lead_activities(lead_id,user_id,activity_type,detail) values(p_primary_id,p_user_id,'merged','Duplicate lead merged: '||p_duplicate_id::text);
  delete from public.leads where id=p_duplicate_id;
  return primary_lead;
end $$;
revoke all on function public.merge_owned_leads(uuid,uuid,uuid) from public;
grant execute on function public.merge_owned_leads(uuid,uuid,uuid) to service_role;
