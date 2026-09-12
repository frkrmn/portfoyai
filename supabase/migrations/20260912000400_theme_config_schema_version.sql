update public.sites set theme_config = jsonb_set(coalesce(theme_config, '{}'::jsonb), '{schema_version}', '3'::jsonb, true)
where theme_config->>'schema_version' is distinct from '3';
alter table public.sites drop constraint if exists sites_theme_config_schema_version_check;
alter table public.sites add constraint sites_theme_config_schema_version_check check (theme_config->>'schema_version' = '3');
