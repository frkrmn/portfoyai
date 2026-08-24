alter table public.sites
  add column if not exists previous_theme_config jsonb;

notify pgrst, 'reload schema';
