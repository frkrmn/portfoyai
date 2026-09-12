alter table public.sites
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists address text,
  add column if not exists region_focus text,
  add column if not exists map_url text;

update public.sites
set
  phone = coalesce(phone, theme_config->'content'->>'phone'),
  email = coalesce(email, theme_config->'content'->>'email'),
  address = coalesce(address, theme_config->'content'->>'address'),
  region_focus = coalesce(region_focus, theme_config->'content'->>'regionFocus'),
  map_url = coalesce(map_url, theme_config->'content'->>'mapUrl'),
  theme_config = jsonb_set(
    jsonb_set(
      jsonb_set(
        coalesce(theme_config, '{}'::jsonb),
        '{content}',
        (coalesce(theme_config->'content', '{}'::jsonb)
          || case when not coalesce(theme_config->'content', '{}'::jsonb) ? 'headline' and headline is not null then jsonb_build_object('headline', headline) else '{}'::jsonb end
          || case when not coalesce(theme_config->'content', '{}'::jsonb) ? 'bio' and tone is not null then jsonb_build_object('bio', tone) else '{}'::jsonb end)
          - array['businessName','phone','email','address','regionFocus','mapUrl'],
        true
      ),
      '{colors}',
      coalesce(theme_config->'colors', '{}'::jsonb)
        || case when not coalesce(theme_config->'colors', '{}'::jsonb) ? 'primary' and primary_color is not null then jsonb_build_object('primary', primary_color) else '{}'::jsonb end
        || case when not coalesce(theme_config->'colors', '{}'::jsonb) ? 'accent' and accent_color is not null then jsonb_build_object('accent', accent_color) else '{}'::jsonb end,
      true
    ),
    '{schema_version}', '3'::jsonb, true
  );

alter table public.sites
  alter column theme_config set default '{"schema_version":3}'::jsonb,
  alter column theme_config set not null;

alter table public.sites
  add constraint sites_map_url_http_check check (map_url is null or map_url = '' or map_url ~ '^https?://');
