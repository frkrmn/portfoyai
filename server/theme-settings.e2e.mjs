import assert from "node:assert/strict";
import { loadEnv } from "vite";
import { createClient } from "@supabase/supabase-js";

const env = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
const testEmail = process.env.E2E_TEST_EMAIL || env.E2E_TEST_EMAIL;
const testPassword = process.env.E2E_TEST_PASSWORD || env.E2E_TEST_PASSWORD;
if (!testEmail || !testPassword) throw new Error("E2E_TEST_EMAIL and E2E_TEST_PASSWORD are required.");
const supabase = createClient(env.SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const auth = await supabase.auth.signInWithPassword({ email: testEmail, password: testPassword });
if (auth.error || !auth.data.session) throw auth.error || new Error("Test login failed.");
const headers = { Authorization: `Bearer ${auth.data.session.access_token}`, "Content-Type": "application/json" };

const read = async (response) => {
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
};
const sitesPayload = await read(await fetch("http://127.0.0.1:4173/api/sites", { headers }));
const site = sitesPayload.sites?.[0];
if (!site) throw new Error("The test user has no owned site.");

const firstFonts = await read(await fetch("http://127.0.0.1:4173/api/fonts", { headers }));
const secondFonts = await read(await fetch("http://127.0.0.1:4173/api/fonts", { headers }));
assert.ok(firstFonts.fonts.length > 1500, "The complete Google Fonts catalog should be returned");
assert.equal(secondFonts.cache, "hit", "The second catalog request should use the server cache");
const fraunces = firstFonts.fonts.find((font) => font.family === "Fraunces");
const robotoSlab = firstFonts.fonts.find((font) => font.family === "Roboto Slab");
assert.ok(fraunces?.variants.includes("700italic"));
assert.ok(robotoSlab?.variants.includes("regular"));

const patch = async (changes) => read(await fetch(`http://127.0.0.1:4173/api/sites/${site.id}`, { method: "PATCH", headers, body: JSON.stringify(changes) }));
const publicSite = async () => read(await fetch(`http://127.0.0.1:4173/api/public-sites/${site.slug}`));

await patch({ heading_font: "Fraunces", heading_weight: 700, heading_italic: true, body_font: "Roboto Slab", body_weight: 400, body_italic: false, buttonColorSource: "accent" });
let live = await publicSite();
assert.equal(live.config.theme_config.fonts.heading, "Fraunces");
assert.equal(live.config.theme_config.fonts.headingWeight, 700);
assert.equal(live.config.theme_config.fonts.headingItalic, true);
assert.equal(live.config.theme_config.fonts.body, "Roboto Slab");
assert.equal(live.config.theme_config.colors.buttonColorSource, "accent");

await patch({ buttonColorSource: "primary" });
live = await publicSite();
assert.equal(live.config.theme_config.colors.buttonColorSource, "primary");

await patch({ buttonColorSource: "custom", buttonColorCustom: "#7C3AED" });
live = await publicSite();
assert.equal(live.config.theme_config.colors.buttonColorSource, "custom");
assert.equal(live.config.theme_config.colors.buttonColorCustom, "#7C3AED");

const refined = await read(await fetch(`http://127.0.0.1:4173/api/sites/${site.id}/refine`, { method: "POST", headers, body: JSON.stringify({ request: "buton rengi ana renkle aynı olsun" }) }));
assert.deepEqual(refined.applied_fields, ["colors.buttonColorSource"]);
assert.equal(refined.unsupported_note, null);
live = await publicSite();
assert.equal(live.config.theme_config.colors.buttonColorSource, "primary");

console.info(JSON.stringify({
  site: { id: site.id, slug: site.slug },
  font_catalog_count: firstFonts.fonts.length,
  font_cache: [firstFonts.cache, secondFonts.cache],
  heading: { family: live.config.theme_config.fonts.heading, weight: live.config.theme_config.fonts.headingWeight, italic: live.config.theme_config.fonts.headingItalic },
  body: { family: live.config.theme_config.fonts.body, weight: live.config.theme_config.fonts.bodyWeight, italic: live.config.theme_config.fonts.bodyItalic },
  button_sources_tested: ["accent", "primary", "custom"],
  refine_result: { applied_fields: refined.applied_fields, unsupported_note: refined.unsupported_note, final_source: live.config.theme_config.colors.buttonColorSource },
}, null, 2));
