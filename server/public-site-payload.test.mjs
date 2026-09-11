import assert from "node:assert/strict";
import { publicThemeConfig, serializePublicListing } from "./handlers/public-site.mjs";

const inline = `data:image/jpeg;base64,${"A".repeat(2_000_000)}`;
const rawTheme = {
  template_id: "investment-focused",
  colors: { primary: "#173f32", accent: "#d86f45" },
  content: { headline: "Yatırım fırsatları", legacyHero: inline },
  media: { heroImage: "https://cdn.example/hero.webp", legacyGallery: [inline] },
  previous_theme_config: { media: inline },
  generation_prompt: "dashboard-only",
  site_content_i18n: { debug: "dashboard-only" },
};
const listing = {
  id: "listing-1", site_id: "private-site", title: "Test", description: "Test", price: 1, currency: "TRY", m2: 1, room_count: "1+1", listing_type: "sale", district: "Kadıköy", lat: 41, lng: 29,
  media: [{ id: "legacy", url: inline, thumbUrl: inline, alt: "legacy" }, { id: "stored", url: "https://cdn.example/main.webp", thumbUrl: "https://cdn.example/thumb.webp", alt: "stored" }],
  status: "active", listing_status: "active", property_category: "konut", property_subtype: "daire", created_at: "2026-09-11T00:00:00Z", features: [], country_id: "private", province_id: "private", district_id: "private", neighborhood_id: "private",
};

const beforeBytes = Buffer.byteLength(JSON.stringify({ theme_config: rawTheme, listings: [listing] }));
const payload = { theme_config: publicThemeConfig(rawTheme), listings: [serializePublicListing(listing)] };
const afterJson = JSON.stringify(payload);
const afterBytes = Buffer.byteLength(afterJson);
assert(!afterJson.includes("data:image/"), "Public payload must never contain inline images");
assert(!afterJson.includes("previous_theme_config") && !afterJson.includes("generation_prompt") && !afterJson.includes("site_content_i18n"));
assert(!afterJson.includes("private-site") && !afterJson.includes("country_id"));
assert(afterBytes < 150_000, `Public payload exceeds 150 KB budget: ${afterBytes}`);
assert(afterBytes < beforeBytes * 0.1, `Expected at least 90% fixture reduction: ${beforeBytes} -> ${afterBytes}`);
console.info(`Public payload fixture: ${beforeBytes} bytes -> ${afterBytes} bytes (${Math.round((1 - afterBytes / beforeBytes) * 100)}% smaller)`);
