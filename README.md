# PortföyAI

PortföyAI is an AI-assisted website builder and portfolio workspace for Turkish real-estate professionals.

## Local development

```bash
npm install
npm run dev -- --port 4173
```

Open `http://localhost:4173`.

The onboarding generator uses the authenticated local Codex CLI session. The model can be configured with `CODEX_SITE_BUILDER_MODEL`; it defaults to `gpt-5.6-sol`.

## Build

```bash
npm run build
```

## Main routes

- `/` — marketing landing page
- `/auth` — AI-assisted onboarding and live preview
- `/dashboard` — agent workspace
- `/site/kaya-gayrimenkul` — seeded public demo site

## Database

The Supabase schema and row-level-security policies are in `supabase/migrations`.
