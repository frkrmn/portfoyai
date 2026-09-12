-- Contract phase: apply only after application reads and writes the canonical
-- normal-column/JSONB sources introduced by 20260912000100 are deployed.
alter table public.sites
  drop column if exists tone,
  drop column if exists primary_color,
  drop column if exists accent_color,
  drop column if exists headline;
