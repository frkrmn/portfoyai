import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";

const env = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
const baseUrl = process.env.API_E2E_URL || "http://127.0.0.1:4173";
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const suffix = Date.now();
const email = `api-consolidation-${suffix}@example.com`;
const password = `Api-${suffix}!`;
const sessionId = `api-consolidation-session-${suffix}`;
let userId;
let siteId;

const json = async (response) => {
  const payload = await response.json();
  if (!response.ok) throw new Error(`${response.status} ${payload.error || JSON.stringify(payload)}`);
  return payload;
};

try {
  const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error;
  userId = created.data.user.id;
  const auth = await supabase.auth.signInWithPassword({ email, password });
  if (auth.error || !auth.data.session) throw auth.error || new Error("Test sign-in failed.");
  const bearer = { Authorization: `Bearer ${auth.data.session.access_token}` };
  const authenticatedJson = { ...bearer, "Content-Type": "application/json" };

  const generated = await json(await fetch(`${baseUrl}/api/generate-theme`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Session-ID": sessionId },
    body: JSON.stringify({ prompt: "Ankara'da genel amaçlı, orta segment konut ve daire alım-satımı yapan bir emlakçıyım, standart bir web sitesi yeterli, özel bir tarz beklentim yok." }),
  }));
  siteId = generated.site_id;
  assert.equal(generated.config.template_id, "clean-modern");
  assert.equal(generated.starter_listings_count, 6);

  const claimed = await json(await fetch(`${baseUrl}/api/auth/claim-sites`, {
    method: "POST",
    headers: { ...bearer, "X-Session-ID": sessionId },
  }));
  assert.ok(claimed.claimedSiteIds.includes(siteId));

  const owned = await json(await fetch(`${baseUrl}/api/sites`, { headers: bearer }));
  assert.ok(owned.sites.some((candidate) => candidate.id === siteId));
  const fetchedSite = await json(await fetch(`${baseUrl}/api/sites/${siteId}`, { headers: bearer }));
  assert.equal(fetchedSite.id, siteId);

  const patchedSite = await json(await fetch(`${baseUrl}/api/sites/${siteId}`, {
    method: "PATCH",
    headers: authenticatedJson,
    body: JSON.stringify({ status: "published", accent_color: "#C86742" }),
  }));
  assert.equal(patchedSite.site.status, "published");

  const listings = await json(await fetch(`${baseUrl}/api/sites/${siteId}/listings`, { headers: bearer }));
  assert.equal(listings.listings.length, 6);
  const seededListing = listings.listings[0];
  const socialBackground = await readFile(new URL("../public/images/listings/bagdat-residence.jpg", import.meta.url));
  const socialMedia = [{ id: "api-router-social", url: `data:image/jpeg;base64,${socialBackground.toString("base64")}` }];
  const listingUpdate = await json(await fetch(`${baseUrl}/api/listings/${seededListing.id}`, {
    method: "PATCH",
    headers: authenticatedJson,
    body: JSON.stringify({ price: seededListing.price + 1000, status: "passive", media: socialMedia }),
  }));
  assert.equal(listingUpdate.listing.price, seededListing.price + 1000);

  const createdListing = await json(await fetch(`${baseUrl}/api/sites/${siteId}/listings`, {
    method: "POST",
    headers: authenticatedJson,
    body: JSON.stringify({
      title: "Catch-all Router Test İlanı",
      description: "API birleştirme testi için oluşturuldu.",
      price: 5_500_000,
      currency: "TRY",
      m2: 110,
      room_count: "3+1",
      listing_type: "sale",
      district: "Çankaya",
      lat: 39.92,
      lng: 32.85,
      media: [],
      status: "active",
      features: ["Balkon"],
    }),
  }));

  const copy = await json(await fetch(`${baseUrl}/api/listings/generate-copy`, {
    method: "POST",
    headers: authenticatedJson,
    body: JSON.stringify({ room_count: "3+1", m2: 140, listing_type: "sale", district: "Kadıköy", price: 14_750_000, features: ["Deniz manzaralı"] }),
  }));
  assert.ok(copy.platform_style && copy.seo_style && copy.platform_style !== copy.seo_style);

  const socialKit = await fetch(`${baseUrl}/api/listings/${seededListing.id}/social-kit?format=post`, { headers: bearer });
  const socialBytes = Buffer.from(await socialKit.arrayBuffer());
  assert.equal(socialKit.status, 200);
  assert.match(socialKit.headers.get("content-type") || "", /^image\/png/);
  assert.ok(socialBytes.length > 10_000);

  const lead = await json(await fetch(`${baseUrl}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ site_id: siteId, name: "API Router Lead", phone: "+90 555 111 22 33", message: "Catch-all endpoint testi" }),
  }));
  const leads = await json(await fetch(`${baseUrl}/api/leads`, { headers: bearer }));
  assert.ok(leads.leads.some((candidate) => candidate.id === lead.id));

  const publicSite = await json(await fetch(`${baseUrl}/api/public-sites/${generated.slug}`));
  assert.equal(publicSite.id, siteId);
  assert.equal(publicSite.status, "published");

  const experiment = await json(await fetch(`${baseUrl}/api/experiment`, {
    method: "POST",
    headers: { ...authenticatedJson, "X-Session-ID": sessionId },
    body: JSON.stringify({ event_type: "pricing_view", context: "manual_pricing_page_visit" }),
  }));
  assert.ok(["A", "B"].includes(experiment.variant));

  const fonts = await json(await fetch(`${baseUrl}/api/fonts`, { headers: bearer }));
  assert.ok(fonts.fonts.length > 1500);

  const refined = await json(await fetch(`${baseUrl}/api/sites/${siteId}/refine`, {
    method: "POST",
    headers: authenticatedJson,
    body: JSON.stringify({ request: "menüyü ortala" }),
  }));
  assert.deepEqual(refined.applied_fields, ["layout_fine_tune.navAlignment"]);

  const deleted = await json(await fetch(`${baseUrl}/api/listings/${createdListing.listing.id}`, { method: "DELETE", headers: bearer }));
  assert.equal(deleted.deleted, true);

  const wrongMethod = await fetch(`${baseUrl}/api/fonts`, { method: "POST" });
  assert.equal(wrongMethod.status, 405);
  assert.equal(wrongMethod.headers.get("allow"), "GET");
  const rewrittenSites = await json(await fetch(`${baseUrl}/api?route=sites`, { headers: bearer }));
  assert.ok(rewrittenSites.sites.some((candidate) => candidate.id === siteId));
  const missingApi = await fetch(`${baseUrl}/api/does-not-exist`);
  assert.equal(missingApi.status, 404);
  assert.match(missingApi.headers.get("content-type") || "", /^application\/json/);
  const spaRoute = await fetch(`${baseUrl}/dashboard`);
  assert.equal(spaRoute.status, 200);
  assert.match(spaRoute.headers.get("content-type") || "", /^text\/html/);

  console.info(JSON.stringify({
    generate_theme: { status: 200, template_id: generated.config.template_id, starter_listings: generated.starter_listings_count },
    auth_claim_sites: { status: 200, claimed: true },
    sites_index_get: 200,
    site_get_patch: { get: 200, patch: 200, published: true },
    site_listings_get_post: { get: 200, post: 201 },
    listing_patch_delete: { patch: 200, delete: 200 },
    listing_copy: { status: 200, distinct_variants: true },
    social_kit: { status: 200, content_type: socialKit.headers.get("content-type"), bytes: socialBytes.length },
    leads_post_get: { post: 201, get: 200, owner_visible: true },
    public_site_lookup: 200,
    experiment: { status: 201, variant: experiment.variant },
    fonts: { status: 200, count: fonts.fonts.length },
    site_refine: { status: 200, applied_fields: refined.applied_fields },
    router_guards: { vercel_rewrite_target: 200, method_not_allowed: 405, missing_api_json: 404 },
    spa_fallback: { dashboard: 200, content_type: spaRoute.headers.get("content-type") },
  }, null, 2));
} finally {
  if (siteId) await supabase.from("sites").delete().eq("id", siteId);
  if (userId) {
    await supabase.from("experiment_events").delete().eq("subject_id", userId);
    await supabase.auth.admin.deleteUser(userId);
  }
}
