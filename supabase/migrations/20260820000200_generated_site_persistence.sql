-- Persist anonymous Gemini-generated site drafts in the existing sites table.

alter table public.sites
  add column if not exists session_id text,
  add column if not exists business_name text,
  add column if not exists tone text,
  add column if not exists primary_color text,
  add column if not exists accent_color text,
  add column if not exists headline text;

-- Generated drafts do not have an agent, subdomain, or the legacy page fields yet.
alter table public.sites
  alter column agent_id drop not null,
  alter column subdomain drop not null,
  alter column theme_config drop not null,
  alter column hero_title drop not null,
  alter column hero_subtitle drop not null;

-- Preserve the generated-config projection for any rows created by the original schema.
update public.sites as site
set
  business_name = coalesce(site.business_name, agent.business_name),
  tone = coalesce(site.tone, agent.tone),
  primary_color = coalesce(site.primary_color, site.theme_config ->> 'primary'),
  accent_color = coalesce(site.accent_color, site.theme_config ->> 'accent'),
  headline = coalesce(site.headline, site.hero_title)
from public.agents as agent
where site.agent_id = agent.id;

alter table public.sites
  alter column business_name set not null,
  alter column tone set not null,
  alter column primary_color set not null,
  alter column accent_color set not null,
  alter column headline set not null;

create index if not exists sites_session_id_idx on public.sites (session_id);
