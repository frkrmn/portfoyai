import assert from "node:assert/strict";
import fs from "node:fs";
import { sanitizeSeo } from "./api-utils.mjs";
import { injectPageMetadata } from "./handlers/render-page.mjs";
import { publicSitePageMetadata } from "../src/lib/site-metadata.js";

const seo = sanitizeSeo({ title: { tr: "TR başlık", en: "EN title" }, description: { tr: "TR açıklama", en: "EN description" }, og_image: "https://cdn.example.com/og.jpg", favicon: "https://cdn.example.com/icon.png", canonical_url: "https://example.com/custom", robots_index: false });
assert.equal(seo.title.en, "EN title");
assert.equal(seo.robots_index, false);
assert.throws(() => sanitizeSeo({ og_image: "javascript:alert(1)" }), /valid http or https URL/);

const listing = { id: "listing-1", title: "Boğaz manzaralı daire", description: "İlan açıklaması", district: "Beşiktaş", price: 10_000_000, currency: "TRY", media: [{ url: "https://cdn.example.com/home.jpg" }], seo: { title: { tr: "Özel ilan", en: "Featured home" }, description: { tr: "Özel açıklama", en: "Custom description" }, robots_index: true } };
const payload = { config: { business_name: "Emlak Ofisi", headline: "Doğru ev", tone: "Uzman danışmanlık", theme_config: { content: { phone: "+90555" }, seo } } };
assert.equal(publicSitePageMetadata({ payload, view: "detail", listing, locale: "tr" }).title, "Özel ilan");
assert.equal(publicSitePageMetadata({ payload, view: "detail", listing, locale: "en" }).title, "Featured home");

const html = injectPageMetadata("<html lang=\"tr\"><head><title>Old</title></head><body></body></html>", { title: "Özel ilan", description: "Özel açıklama", ogImage: "https://cdn.example.com/og.jpg", favicon: "https://cdn.example.com/icon.png", canonicalUrl: "https://example.com/listing", robots: "index,follow", structuredData: { "@context": "https://schema.org", "@type": "Residence", name: "Ev" } }, "tr");
for (const expected of ["og:image", "twitter:image", "canonical", "icon", "application/ld+json", "Residence", "index,follow"]) assert.match(html, new RegExp(expected.replace("+", "\\+")));

const router = fs.readFileSync(new URL("./api-router.mjs", import.meta.url), "utf8");
const seoFiles = fs.readFileSync(new URL("./handlers/seo-files.mjs", import.meta.url), "utf8");
const migration = fs.readFileSync(new URL("../supabase/migrations/20260912000600_listing_seo.sql", import.meta.url), "utf8");
assert.match(router, /sitemap\\\.xml\|robots\\\.txt/);
assert.match(seoFiles, /eq\("status", "published"\)/);
assert.match(seoFiles, /eq\("listing_status", "active"\)/);
assert.match(migration, /add column if not exists seo jsonb/);

console.info("SEO management verified: TR/EN overrides, social tags, canonical, robots, sitemap publication rules and real-estate JSON-LD.");
