# PortföyAI

PortföyAI is an AI-assisted website builder and portfolio workspace for Turkish real-estate professionals.

## Local development

```bash
npm install
npm run dev -- --port 4173
```

Open `http://localhost:4173`.

The onboarding generator uses Gemini and persists generated drafts in Supabase.

## Build

```bash
npm run build
```

## Main routes

- `/` — marketing landing page
- `/auth` — AI-assisted onboarding and live preview
- `/signup` and `/login` — Supabase email/password authentication (plus Google when enabled in Supabase)
- `/dashboard` — agent workspace
- `/site/kaya-gayrimenkul` — seeded public demo site

## Database

The Supabase schema and row-level-security policies are in `supabase/migrations`.

Set both server credentials (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) and browser-safe Auth credentials (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Never expose the service-role key through a `VITE_` variable.
