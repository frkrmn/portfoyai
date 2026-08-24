import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";

const env = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
const baseUrl = process.env.AUTH_GENERATION_E2E_URL || "http://127.0.0.1:4173";
const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const auth = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const suffix = Date.now();
const email = `auth-first-${suffix}@example.com`;
const password = `AuthFirst-${suffix}!`;
let userId;
let siteId;

try {
  const anonymous = await fetch(`${baseUrl}/api/generate-theme`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "Ankara'da modern emlak danışmanlığı için sade bir site" }),
  });
  assert.equal(anonymous.status, 401);

  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw created.error || new Error("User creation failed.");
  userId = created.data.user.id;
  const signedIn = await auth.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.session) throw signedIn.error || new Error("Sign-in failed.");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${signedIn.data.session.access_token}` };
  const prompt = "Ankara'da genel amaçlı orta segment konut alım satımı yapan sade ve güvenilir bir emlakçıyım";

  const generatedResponse = await fetch(`${baseUrl}/api/generate-theme`, { method: "POST", headers, body: JSON.stringify({ prompt }) });
  const generated = await generatedResponse.json();
  assert.equal(generatedResponse.status, 200, JSON.stringify(generated));
  assert.ok(generated.site_id && generated.slug);
  siteId = generated.site_id;
  const owned = await admin.from("sites").select("id, user_id").eq("id", siteId).single();
  if (owned.error) throw owned.error;
  assert.equal(owned.data.user_id, userId);

  const secondResponse = await fetch(`${baseUrl}/api/generate-theme`, { method: "POST", headers, body: JSON.stringify({ prompt: "İzmir'de kurumsal ticari gayrimenkul sitesi istiyorum" }) });
  const second = await secondResponse.json();
  assert.equal(secondResponse.status, 409);
  assert.equal(second.code, "SITE_LIMIT_REACHED");
  assert.equal(second.existing_site.id, siteId);
  const count = await admin.from("sites").select("id", { count: "exact" }).eq("user_id", userId);
  if (count.error) throw count.error;
  assert.equal(count.count, 1);

  console.info(JSON.stringify({
    unauthenticated_generation_status: anonymous.status,
    authenticated_generation_status: generatedResponse.status,
    generated_site_id: siteId,
    second_generation_status: secondResponse.status,
    second_generation_code: second.code,
    owned_site_count: count.count,
  }, null, 2));
} finally {
  if (siteId) await admin.from("sites").delete().eq("id", siteId);
  if (userId) await admin.auth.admin.deleteUser(userId);
}
