import assert from "node:assert/strict";
import { createServer } from "vite";
import { backfillPublicSiteContent } from "./handlers/public-site-content-backfill.mjs";
import { buildContentTranslationRequest, mergeTranslatedContent, needsContentEnglishBackfill } from "./site-content-i18n.mjs";
import { buildThemeConfig } from "./site-persistence.mjs";

const originalTheme = {
  template_id: "guided-match",
  content: {
    headline: "Doğru ev, doğru sorularla bulunur",
    bio: "Sizi dinleyen kişisel danışmanlık.",
    tagline: "Doğru eve birlikte ulaşalım.",
    feelings: ["Sakin", "Enerjik"],
    timings: ["Hemen", "Henüz araştırıyorum"],
  },
};
const translated = {
  headline: { tr: "Doğru ev, doğru sorularla bulunur", en: "The right questions lead to the right home" },
  bio: { tr: "Sizi dinleyen kişisel danışmanlık.", en: "Personal guidance built around listening." },
  tagline: { tr: "Doğru eve birlikte ulaşalım.", en: "Let's find your way home, together." },
  feelings: [{ tr: "Sakin", en: "Calm" }, { tr: "Enerjik", en: "Vibrant" }],
  timings: [{ tr: "Hemen", en: "Right away" }, { tr: "Henüz araştırıyorum", en: "Just exploring" }],
};

assert.equal(needsContentEnglishBackfill(originalTheme.content), true);
const request = buildContentTranslationRequest(originalTheme.content);
assert.deepEqual(request.source.feelings, ["Sakin", "Enerjik"]);
const merged = mergeTranslatedContent(originalTheme.content, translated);
assert.equal(merged.headline.en, translated.headline.en);
assert.equal(needsContentEnglishBackfill(merged), false);
const generatedTheme = buildThemeConfig({ template_id: "guided-match", business_name: "Test", primary_color: "#173f32", accent_color: "#d7a84b", headline: translated.headline, tone: translated.bio, content: { feelings: translated.feelings, timings: translated.timings } });
assert.deepEqual(generatedTheme.content.headline, translated.headline);
assert.deepEqual(generatedTheme.content.bio, translated.bio);

let row = { id: "site-1", slug: "legacy-site", status: "published", theme_config: structuredClone(originalTheme) };
let generationCalls = 0;
const query = (operation, payload) => {
  const chain = {
    eq() { return chain; }, select() { return chain; },
    async maybeSingle() { if (operation === "select") return { data: structuredClone(row), error: null }; row.theme_config = structuredClone(payload.theme_config); return { data: { id: row.id }, error: null }; },
    async single() { row.theme_config = structuredClone(payload.theme_config); return { data: { theme_config: structuredClone(row.theme_config) }, error: null }; },
    then(resolve) { if (operation === "update") row.theme_config = structuredClone(payload.theme_config); return Promise.resolve({ data: null, error: null }).then(resolve); },
  };
  return chain;
};
const supabase = { from() { return { select() { return query("select"); }, update(payload) { return query("update", payload); } }; } };
const generate = async ({ source }) => {
  generationCalls += 1;
  assert.equal(source.headline, originalTheme.content.headline);
  return JSON.stringify({ content: translated });
};

const first = await backfillPublicSiteContent("legacy-site", { supabase, generate });
assert.equal(first.body.backfilled, true);
assert.equal(first.body.cached, false);
assert.equal(row.theme_config.site_content_i18n.status, "complete");
const second = await backfillPublicSiteContent("legacy-site", { supabase, generate });
assert.equal(second.body.backfilled, false);
assert.equal(second.body.cached, true);
assert.equal(generationCalls, 1);

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
try {
  const editor = await vite.ssrLoadModule("/src/portfoyai/content-editor.tsx");
  const original = { headline: { tr: "Türkçe başlık", en: "English headline" } };
  const next = editor.setInstanceValue(original, "content.headline", "Edited English headline", "en");
  assert.equal(next.headline.tr, "Türkçe başlık");
  assert.equal(next.headline.en, "Edited English headline");
  const legacy = editor.setInstanceValue({ headline: "Eski Türkçe başlık" }, "content.headline", "New English headline", "en");
  assert.deepEqual(legacy.headline, { tr: "Eski Türkçe başlık", en: "New English headline" });
} finally {
  await vite.close();
}

console.info(JSON.stringify({ one_time_backfill: true, persisted_cache_prevents_second_generation: generationCalls === 1, independent_editor_languages: true, legacy_turkish_fallback_preserved: true }, null, 2));
