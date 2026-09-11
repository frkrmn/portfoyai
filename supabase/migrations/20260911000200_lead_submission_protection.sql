create table if not exists public.lead_submission_attempts (
  id bigint generated always as identity primary key,
  site_id uuid not null references public.sites(id) on delete cascade,
  ip_hash text not null check (char_length(ip_hash) = 64),
  created_at timestamptz not null default now()
);

create index if not exists lead_submission_attempts_lookup_idx
  on public.lead_submission_attempts (site_id, ip_hash, created_at desc);

alter table public.lead_submission_attempts enable row level security;

create or replace function public.claim_lead_submission(p_site_id uuid, p_ip_hash text, p_limit integer, p_window_minutes integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  attempt_count integer;
begin
  if p_limit < 1 or p_window_minutes < 1 or char_length(p_ip_hash) <> 64 then
    raise exception 'Invalid lead rate-limit parameters';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_site_id::text || ':' || p_ip_hash, 0));
  delete from public.lead_submission_attempts where created_at < now() - interval '24 hours';
  select count(*) into attempt_count
  from public.lead_submission_attempts
  where site_id = p_site_id and ip_hash = p_ip_hash
    and created_at >= now() - make_interval(mins => p_window_minutes);
  if attempt_count >= p_limit then return false; end if;
  insert into public.lead_submission_attempts (site_id, ip_hash) values (p_site_id, p_ip_hash);
  return true;
end;
$$;

revoke all on function public.claim_lead_submission(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.claim_lead_submission(uuid, text, integer, integer) to service_role;

create index if not exists leads_site_phone_created_at_idx
  on public.leads (site_id, phone, created_at desc);
