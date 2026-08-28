import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const baseUrl = process.env.CONTENT_EDITOR_E2E_URL || "http://127.0.0.1:4173";
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
assert(url && serviceKey && anonKey, "Supabase environment variables are required.");

const service = createClient(url, serviceKey, { auth: { persistSession: false } });
const auth = createClient(url, anonKey, { auth: { persistSession: false } });
const { data: signedIn, error: signInError } = await auth.auth.signInWithPassword({
  email: process.env.E2E_TEST_EMAIL || "user@portfoyai.com",
  password: process.env.E2E_TEST_PASSWORD || "123456",
});
if (signInError) throw signInError;
const token = signedIn.session.access_token;

const getSite = async (slug) => {
  const response = await fetch(`${baseUrl}/api/public-sites/${slug}`);
  const payload = await response.json();
  assert.equal(response.status, 200, JSON.stringify(payload));
  return payload;
};

const land = await getSite("erta-arsa-emlak-danismanligi-demo");
const landOriginal = structuredClone(land.config.theme_config.content);
const landMarker = `Hizmetlerimiz E2E ${Date.now()}`;
const landServices = structuredClone(landOriginal.services);
landServices[0].title = `Arsa danışmanlığı E2E ${Date.now()}`;
try {
  const response = await fetch(`${baseUrl}/api/sites/${land.id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ content: { servicesTitle: landMarker, services: landServices } }),
  });
  const payload = await response.json();
  assert.equal(response.status, 200, JSON.stringify(payload));
  const publicSite = await getSite(land.slug);
  assert.equal(publicSite.config.theme_config.content.servicesTitle, landMarker);
  assert.equal(publicSite.config.theme_config.content.services[0].title, landServices[0].title);
  console.log("PASS land-plots: plain text + services array saved through authenticated PATCH and visible publicly");
} finally {
  await fetch(`${baseUrl}/api/sites/${land.id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ content: landOriginal }),
  });
}

const { data: guidedRow, error: guidedError } = await service.from("sites").select("*").eq("slug", "kisisel-emlak-rehberi").single();
if (guidedError) throw guidedError;
const guidedOriginal = structuredClone(guidedRow.theme_config);
const guidedMarker = `Sana uygun evi bulalım E2E ${Date.now()}`;
const feelings = [...guidedOriginal.content.feelings];
feelings[0] = `Sakin ve huzurlu E2E ${Date.now()}`;
try {
  const nextTheme = structuredClone(guidedOriginal);
  nextTheme.content = { ...nextTheme.content, matchTitle: guidedMarker, feelings };
  const { error } = await service.from("sites").update({ theme_config: nextTheme }).eq("id", guidedRow.id);
  if (error) throw error;
  const publicSite = await getSite(guidedRow.slug);
  assert.equal(publicSite.config.theme_config.content.matchTitle, guidedMarker);
  assert.equal(publicSite.config.theme_config.content.feelings[0], feelings[0]);
  console.log("PASS guided-match: plain text + feelings array visible publicly");
} finally {
  const { error } = await service.from("sites").update({ theme_config: guidedOriginal }).eq("id", guidedRow.id);
  if (error) throw error;
}

console.log("PASS test changes restored");
