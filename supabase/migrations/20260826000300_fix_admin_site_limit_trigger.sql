create or replace function public.protect_site_owner_limit_exemption()
returns trigger
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
  jwt_role text := coalesce(
    auth.role(),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    current_setting('request.jwt.claim.role', true),
    ''
  );
begin
  if jwt_role <> 'service_role' then
    new.owner_limit_exempt := false;
  end if;
  return new;
end;
$$;

notify pgrst, 'reload schema';
