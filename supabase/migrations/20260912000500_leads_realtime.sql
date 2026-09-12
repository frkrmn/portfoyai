-- RLS remains the authorization boundary for Realtime change delivery. The
-- existing "Site owners can read own leads" SELECT policy limits events to
-- leads whose site belongs to auth.uid().
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'leads'
  ) then
    alter publication supabase_realtime add table public.leads;
  end if;
end
$$;
