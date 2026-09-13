import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { switchTemplateConfig } from "./site-theme.mjs";

const original = {
  schema_version: 3,
  template_id: "clean-modern",
  colors: { background: "#ffffff", primary: "#123456", accent: "#abcdef", text: "#111111" },
  fonts: { heading: "Manrope", body: "Inter" },
  content: { headline: { tr: "Korunan başlık", en: "Preserved headline" }, bio: { tr: "Korunan içerik", en: "Preserved content" }, customField: "sakla" },
  media: { heroImage: "https://cdn.example.com/hero.jpg", gallery: ["https://cdn.example.com/one.jpg"] },
  seo: { canonical_url: "https://example.com" },
};
const switched = switchTemplateConfig(original, "land-plots");
assert.equal(switched.template_id, "land-plots");
assert.deepEqual(switched.content.headline, original.content.headline);
assert.equal(switched.content.customField, "sakla");
assert.deepEqual(switched.media, original.media);
assert.equal(switched.seo.canonical_url, original.seo.canonical_url);
assert.equal(switched.content.services.length, 4);
assert.equal(switched.content.processSteps.length, 3);
const repaired = switchTemplateConfig({ ...original, content: { ...original.content, services: [], processSteps: [] } }, "land-plots");
assert.equal(repaired.content.services.length, 4);
assert.equal(repaired.content.processSteps.length, 3);
assert.deepEqual(switchTemplateConfig(switched, "guided-match").content.services, switched.content.services, "template-specific data must remain available for undo/future switches");
assert.throws(() => switchTemplateConfig(original, "unknown"), /Unsupported template/);

const [siteHandler, previewHandler, switcher] = await Promise.all([
  readFile(new URL("./handlers/site.mjs", import.meta.url), "utf8"),
  readFile(new URL("./handlers/site-preview.mjs", import.meta.url), "utf8"),
  readFile(new URL("../src/portfoyai/dashboard/TemplateSwitcher.tsx", import.meta.url), "utf8"),
]);
assert.match(previewHandler, /searchParams\.get\("templateId"\)/);
assert.match(siteHandler, /previous_theme_config = current\.theme_config/);
assert.match(siteHandler, /restore_previous_template/);
assert.match(switcher, /current.*candidate/s);
assert.match(switcher, /clean-modern/);
assert.match(switcher, /bold-luxury/);
console.log("Theme switching preserves content/media and supports preview, safe defaults and undo.");
