import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildThemeConfig } from "./site-persistence.mjs";
import { canonicalSiteProjection } from "./site-source-of-truth.mjs";
import { mergeThemeConfig } from "./site-theme.mjs";

const legacyTheme = {
  template_id: "clean-modern",
  colors: { primary: "#111111", accent: "#222222" },
  content: { businessName: "Eski kopya", headline: { tr: "Eski başlık", en: "Old headline" }, bio: { tr: "Eski ton", en: "Old tone" }, phone: "eski" },
};
const { themeConfig, topLevel } = mergeThemeConfig(legacyTheme, {
  business_name: "Kanonik Marka", headline: "Yeni başlık", tone: "Yeni ton", primary_color: "#123456", accent_color: "#abcdef",
  phone: "+90 555 000 00 00", email: "hello@example.com", address: "Kadıköy", region_focus: "İstanbul", map_url: "https://maps.example.com/location",
});
assert.deepEqual(topLevel, { business_name: "Kanonik Marka", phone: "+90 555 000 00 00", email: "hello@example.com", address: "Kadıköy", region_focus: "İstanbul", map_url: "https://maps.example.com/location" });
assert.equal(themeConfig.schema_version, 3);
assert.deepEqual(themeConfig.content.headline, { tr: "Yeni başlık", en: "Old headline" });
assert.deepEqual(themeConfig.content.bio, { tr: "Yeni ton", en: "Old tone" });
for (const key of ["businessName", "phone", "email", "address", "regionFocus", "mapUrl"]) assert.equal(key in themeConfig.content, false, `${key} must not be persisted twice`);

const projected = canonicalSiteProjection({ id: "site-1", business_name: "Kanonik Marka", phone: "+90", email: "hello@example.com", address: "Kadıköy", region_focus: "İstanbul", map_url: "https://maps.example.com", theme_config: themeConfig });
assert.equal(projected.headline, "Yeni başlık");
assert.equal(projected.tone, "Yeni ton");
assert.equal(projected.primary_color, "#123456");
assert.equal(projected.theme_config.content.businessName, "Kanonik Marka");
assert.equal(projected.theme_config.content.regionFocus, "İstanbul");

const generated = buildThemeConfig({ template_id: "clean-modern", business_name: "Marka", headline: { tr: "Başlık", en: "Headline" }, tone: { tr: "Ton", en: "Tone" }, primary_color: "#123456", accent_color: "#abcdef", region_focus: "İstanbul", content: {} });
assert.equal(generated.schema_version, 3);
assert.equal("businessName" in generated.content, false);
assert.equal("regionFocus" in generated.content, false);

const migration = `${await readFile(new URL("../supabase/migrations/20260912000100_site_source_of_truth.sql", import.meta.url), "utf8")}\n${await readFile(new URL("../supabase/migrations/20260912000200_remove_duplicate_site_columns.sql", import.meta.url), "utf8")}`;
for (const column of ["tone", "primary_color", "accent_color", "headline"]) assert.match(migration, new RegExp(`drop column if exists ${column}`));
assert.match(migration, /schema_version/);
console.info("Site source of truth: canonical writes, compatibility projection and lossless migration verified");
