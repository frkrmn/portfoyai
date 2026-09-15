create table if not exists public.ai_usage_reservations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 128),
  provider text not null check (char_length(provider) between 1 and 50),
  model text not null check (char_length(model) between 1 and 120),
  operation text not null check (char_length(operation) between 1 and 120),
  status text not null default 'reserved' check (status in ('reserved','completed','failed')),
  reserved_tokens integer not null check (reserved_tokens between 1 and 100000),
  actual_tokens integer check (actual_tokens between 0 and 1000000),
  cached_response jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  unique (workspace_id, idempotency_key)
);

create index if not exists ai_usage_workspace_created_idx on public.ai_usage_reservations(workspace_id, created_at desc);
alter table public.ai_usage_reservations enable row level security;

create or replace function public.reserve_ai_usage(
  p_workspace_id uuid, p_user_id uuid, p_idempotency_key text,
  p_provider text, p_model text, p_operation text, p_reserved_tokens integer
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  existing public.ai_usage_reservations;
  workspace_plan text;
  daily_request_limit integer;
  daily_token_limit integer;
  concurrency_limit integer;
  minute_limit integer;
  daily_requests integer;
  daily_tokens bigint;
  active_requests integer;
  minute_requests integer;
  reservation_id uuid;
begin
  if not exists(select 1 from public.workspace_memberships where workspace_id = p_workspace_id and user_id = p_user_id) then
    return jsonb_build_object('allowed', false, 'reason', 'FORBIDDEN');
  end if;
  if char_length(p_idempotency_key) not between 16 and 128 or p_reserved_tokens not between 1 and 100000 then
    return jsonb_build_object('allowed', false, 'reason', 'INVALID_RESERVATION');
  end if;

  perform pg_advisory_xact_lock(hashtextextended('ai-budget:' || p_workspace_id::text, 0));
  select * into existing from public.ai_usage_reservations where workspace_id = p_workspace_id and idempotency_key = p_idempotency_key for update;
  if existing.id is not null then
    if existing.status = 'completed' then
      return jsonb_build_object('allowed', true, 'cached', true, 'reservation_id', existing.id, 'response', existing.cached_response);
    end if;
    if existing.status = 'reserved' and existing.created_at > now() - interval '5 minutes' then
      return jsonb_build_object('allowed', false, 'reason', 'AI_REQUEST_IN_PROGRESS');
    end if;
  end if;

  update public.ai_usage_reservations set status = 'failed', error_code = 'RESERVATION_TIMEOUT', settled_at = now()
  where workspace_id = p_workspace_id and status = 'reserved' and created_at <= now() - interval '5 minutes';

  select case when exists(select 1 from public.subscriptions where workspace_id = p_workspace_id and plan = 'pro') then 'pro' else 'free' end into workspace_plan;
  if workspace_plan = 'pro' then daily_request_limit := 500; daily_token_limit := 5000000; concurrency_limit := 5; minute_limit := 30;
  else daily_request_limit := 20; daily_token_limit := 100000; concurrency_limit := 1; minute_limit := 5; end if;

  select count(*), coalesce(sum(coalesce(actual_tokens, reserved_tokens)), 0) into daily_requests, daily_tokens
  from public.ai_usage_reservations where workspace_id = p_workspace_id and created_at >= date_trunc('day', now()) and status in ('reserved','completed');
  select count(*) into active_requests from public.ai_usage_reservations where workspace_id = p_workspace_id and status = 'reserved' and created_at > now() - interval '5 minutes';
  select count(*) into minute_requests from public.ai_usage_reservations where workspace_id = p_workspace_id and created_at > now() - interval '1 minute';

  if daily_requests >= daily_request_limit or daily_tokens + p_reserved_tokens > daily_token_limit then return jsonb_build_object('allowed', false, 'reason', 'AI_DAILY_BUDGET'); end if;
  if active_requests >= concurrency_limit then return jsonb_build_object('allowed', false, 'reason', 'AI_CONCURRENCY_LIMIT'); end if;
  if minute_requests >= minute_limit then return jsonb_build_object('allowed', false, 'reason', 'AI_RATE_LIMIT'); end if;

  if existing.id is not null then
    update public.ai_usage_reservations set user_id=p_user_id, provider=p_provider, model=p_model, operation=p_operation, status='reserved', reserved_tokens=p_reserved_tokens, actual_tokens=null, cached_response=null, error_code=null, created_at=now(), settled_at=null where id=existing.id returning id into reservation_id;
  else
    insert into public.ai_usage_reservations(workspace_id,user_id,idempotency_key,provider,model,operation,reserved_tokens)
    values(p_workspace_id,p_user_id,p_idempotency_key,left(p_provider,50),left(p_model,120),left(p_operation,120),p_reserved_tokens) returning id into reservation_id;
  end if;
  return jsonb_build_object('allowed', true, 'cached', false, 'reservation_id', reservation_id, 'plan', workspace_plan);
end;
$$;

create or replace function public.settle_ai_usage(
  p_reservation_id uuid, p_actual_tokens integer, p_outcome text, p_cached_response jsonb default null, p_error_code text default null
) returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  if p_outcome not in ('completed','failed') then return false; end if;
  update public.ai_usage_reservations set status=p_outcome, actual_tokens=greatest(0,coalesce(p_actual_tokens,0)), cached_response=case when p_outcome='completed' then p_cached_response else null end, error_code=left(p_error_code,100), settled_at=now()
  where id=p_reservation_id and status='reserved';
  return found;
end;
$$;

revoke all on function public.reserve_ai_usage(uuid,uuid,text,text,text,text,integer) from public,anon,authenticated;
revoke all on function public.settle_ai_usage(uuid,integer,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.reserve_ai_usage(uuid,uuid,text,text,text,text,integer) to service_role;
grant execute on function public.settle_ai_usage(uuid,integer,text,jsonb,text) to service_role;
notify pgrst, 'reload schema';
