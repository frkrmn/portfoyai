import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";

const env = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
const baseUrl = process.env.VERSIONING_E2E_URL || "http://127.0.0.1:4173";
const auth = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const signedIn = await auth.auth.signInWithPassword({ email: "user@portfoyai.com", password: "123456" });
if (signedIn.error) throw signedIn.error;
const token = signedIn.data.session.access_token;
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
const { data: original, error } = await service.from("sites").select("*").eq("user_id", signedIn.data.user.id).limit(1).single();
if (error) throw error;
const marker = `GRM-73-${Date.now()}`;

try {
  const draft = await fetch(`${baseUrl}/api/sites/${original.id}`, { method: "PATCH", headers, body: JSON.stringify({ headline: marker, expected_revision: original.draft_revision }) }).then(async (response) => ({ status: response.status, body: await response.json() }));
  assert.equal(draft.status, 200);
  const revision = draft.body.site.draft_revision;
  const publish = await fetch(`${baseUrl}/api/sites/${original.id}/publish`, { method: "POST", headers, body: JSON.stringify({ expected_revision: revision }) }).then(async (response) => ({ status: response.status, body: await response.json() }));
  assert.equal(publish.status, 200);
  const version = publish.body.version;
  const liveAfterPublish = await fetch(`${baseUrl}/api/public-sites/${original.slug}`).then((response) => response.json());
  assert.equal(liveAfterPublish.config.headline, marker);

  const nextDraft = await fetch(`${baseUrl}/api/sites/${original.id}`, { method: "PATCH", headers, body: JSON.stringify({ headline: `${marker}-draft`, expected_revision: revision }) }).then(async (response) => ({ status: response.status, body: await response.json() }));
  assert.equal(nextDraft.status, 200);
  const liveWhileDraftChanges = await fetch(`${baseUrl}/api/public-sites/${original.slug}`).then((response) => response.json());
  assert.equal(liveWhileDraftChanges.config.headline, marker);
  const conflict = await fetch(`${baseUrl}/api/sites/${original.id}`, { method: "PATCH", headers, body: JSON.stringify({ headline: "stale", expected_revision: revision }) });
  assert.equal(conflict.status, 409);
  const rollback = await fetch(`${baseUrl}/api/sites/${original.id}/rollback`, { method: "POST", headers, body: JSON.stringify({ version }) });
  assert.equal(rollback.status, 200);
  const unauthorized = await fetch(`${baseUrl}/api/sites/${original.id}/versions`);
  assert.equal(unauthorized.status, 401);
  console.info(JSON.stringify({ draft_isolated: true, atomic_publish: true, rollback: true, conflict_409: true, unauthorized_401: true }, null, 2));
} finally {
  await service.from("site_versions").delete().eq("site_id", original.id).gt("version", original.published_version || 0);
  const restore = { ...original };
  delete restore.id; delete restore.created_at;
  await service.from("sites").update(restore).eq("id", original.id);
}
