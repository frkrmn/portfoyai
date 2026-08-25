import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";

const env = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
const baseUrl = process.env.LOCATIONS_E2E_URL || "http://127.0.0.1:4173";
const email = process.env.E2E_TEST_EMAIL || "user@portfoyai.com";
const password = process.env.E2E_TEST_PASSWORD || "123456";
const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const auth = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const signedIn = await auth.auth.signInWithPassword({ email, password });
if (signedIn.error || !signedIn.data.session) throw signedIn.error || new Error("Test sign-in failed.");
const userId = signedIn.data.user.id;
const headers = { Authorization: `Bearer ${signedIn.data.session.access_token}`, "Content-Type": "application/json" };
const siteResult = await admin.from("sites").select("id,theme_config,country_id,province_id,district_id,neighborhood_id").eq("user_id", userId).limit(1).single();
if (siteResult.error) throw siteResult.error;
const site = siteResult.data;
const listingResult = await admin.from("listings").select("id,district,country_id,province_id,district_id,neighborhood_id").eq("site_id", site.id).limit(1).single();
if (listingResult.error) throw listingResult.error;
const listing = listingResult.data;

const turkey = await admin.from("countries").select("id").eq("code", "TR").single();
const province = await admin.from("provinces").select("id,name").eq("country_id", turkey.data.id).eq("name", "İSTANBUL").single();
const district = await admin.from("districts").select("id,name").eq("province_id", province.data.id).eq("name", "KADIKÖY").single();
const neighborhood = await admin.from("neighborhoods").select("id,name").eq("district_id", district.data.id).limit(1).single();
for (const result of [turkey, province, district, neighborhood]) if (result.error) throw result.error;

try {
  const listingResponse = await fetch(`${baseUrl}/api/listings/${listing.id}`, { method: "PATCH", headers, body: JSON.stringify({ district: district.data.name, country_id: turkey.data.id, province_id: province.data.id, district_id: district.data.id, neighborhood_id: neighborhood.data.id }) });
  const listingPayload = await listingResponse.json();
  assert.equal(listingResponse.status, 200, JSON.stringify(listingPayload));
  assert.equal(listingPayload.listing.province_id, province.data.id);
  assert.equal(listingPayload.listing.district_id, district.data.id);
  assert.equal(listingPayload.listing.neighborhood_id, neighborhood.data.id);

  const siteResponse = await fetch(`${baseUrl}/api/sites/${site.id}`, { method: "PATCH", headers, body: JSON.stringify({ region_focus: `${neighborhood.data.name}, ${district.data.name}, ${province.data.name}`, country_id: turkey.data.id, province_id: province.data.id, district_id: district.data.id, neighborhood_id: neighborhood.data.id }) });
  const sitePayload = await siteResponse.json();
  assert.equal(siteResponse.status, 200, JSON.stringify(sitePayload));
  assert.equal(sitePayload.site.neighborhood_id, neighborhood.data.id);
  assert.match(sitePayload.site.theme_config.content.regionFocus, /KADIKÖY/);

  console.info(JSON.stringify({ listing_structured_location_persisted: true, site_region_target_persisted: true, hierarchy: [province.data.name, district.data.name, neighborhood.data.name] }, null, 2));
} finally {
  await admin.from("listings").update({ district: listing.district, country_id: listing.country_id, province_id: listing.province_id, district_id: listing.district_id, neighborhood_id: listing.neighborhood_id }).eq("id", listing.id);
  await admin.from("sites").update({ theme_config: site.theme_config, country_id: site.country_id, province_id: site.province_id, district_id: site.district_id, neighborhood_id: site.neighborhood_id }).eq("id", site.id);
}
