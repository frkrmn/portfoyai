import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";
import { formatListingPrice } from "../src/lib/listing-price.js";
import { insertGeneratedSite } from "./site-persistence.mjs";

const env = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
const baseUrl = process.env.CURRENCY_E2E_URL || "http://127.0.0.1:4173";
const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const suffix = Date.now();
const email = `currency-e2e-${suffix}@example.com`;
const password = `Currency-${suffix}!`;
let userId;
let siteId;

const draft = (overrides) => ({
  title: "Para Birimi Test İlanı",
  description: "Aynı site içindeki bağımsız ilan para birimini doğrulayan test ilanı.",
  price: 40_000,
  currency: "TRY",
  m2: 90,
  room_count: "2+1",
  listing_type: "rent",
  district: "Kadıköy",
  lat: 40.99,
  lng: 29.03,
  media: [],
  status: "active",
  features: ["Para birimi testi"],
  ...overrides,
});

try {
  const createdUser = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (createdUser.error) throw createdUser.error;
  userId = createdUser.data.user.id;
  const subscription = await admin.from("subscriptions").insert({ subject_id: userId, user_id: userId, plan: "pro" });
  if (subscription.error) throw subscription.error;

  const site = await insertGeneratedSite(admin, {
    template_id: "investment-focused",
    business_name: `Currency E2E ${suffix}`,
    tone: "Analitik ve profesyonel",
    primary_color: "#173F32",
    accent_color: "#D86F45",
    headline: "Farklı para birimlerinde yatırım fırsatları",
    region_focus: "Kadıköy",
  }, userId);
  siteId = site.id;

  const signedIn = await admin.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  const headers = { Authorization: `Bearer ${signedIn.data.session.access_token}`, "Content-Type": "application/json" };

  const tryResponse = await fetch(`${baseUrl}/api/sites/${siteId}/listings`, { method: "POST", headers, body: JSON.stringify(draft({ title: "TRY Kiralık", price: 40_000, currency: "TRY", listing_type: "rent" })) });
  const tryPayload = await tryResponse.json();
  assert.equal(tryResponse.status, 201, JSON.stringify(tryPayload));

  const usdResponse = await fetch(`${baseUrl}/api/sites/${siteId}/listings`, { method: "POST", headers, body: JSON.stringify(draft({ title: "USD Satılık", price: 100_000, currency: "USD", listing_type: "sale" })) });
  const usdPayload = await usdResponse.json();
  assert.equal(usdResponse.status, 201, JSON.stringify(usdPayload));

  const dashboardResponse = await fetch(`${baseUrl}/api/sites/${siteId}/listings`, { headers });
  const dashboardPayload = await dashboardResponse.json();
  const dashboardTry = dashboardPayload.listings.find((listing) => listing.id === tryPayload.listing.id);
  const dashboardUsd = dashboardPayload.listings.find((listing) => listing.id === usdPayload.listing.id);
  assert.equal(dashboardTry?.currency, "TRY");
  assert.equal(dashboardUsd?.currency, "USD");

  const publicResponse = await fetch(`${baseUrl}/api/public-sites/${site.slug}`);
  const publicPayload = await publicResponse.json();
  const publicTry = publicPayload.listings.find((listing) => listing.id === tryPayload.listing.id);
  const publicUsd = publicPayload.listings.find((listing) => listing.id === usdPayload.listing.id);
  assert.equal(publicTry?.currency, "TRY");
  assert.equal(publicUsd?.currency, "USD");
  assert.match(formatListingPrice(publicTry), /TRY/);
  assert.match(formatListingPrice(publicUsd), /USD/);

  console.info(JSON.stringify({
    same_site: site.slug,
    dashboard: [formatListingPrice(dashboardTry), formatListingPrice(dashboardUsd)],
    public_grid_and_detail_data: [formatListingPrice(publicTry), formatListingPrice(publicUsd)],
    investment_comparison_currency_labels: true,
    no_fx_conversion: true,
  }, null, 2));
} finally {
  if (siteId) await admin.from("sites").delete().eq("id", siteId);
  if (userId) await admin.auth.admin.deleteUser(userId);
}
