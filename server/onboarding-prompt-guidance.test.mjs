import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { enrichPrompt, evaluatePrompt, promptSuggestions } from "../src/lib/prompt-guidance.ts";

assert.equal(evaluatePrompt("").score, 0);
const completeTr = "Kadıköy'de ailelere konut satışı sunan modern bir danışmanım";
assert.equal(evaluatePrompt(completeTr).score, 4);
assert.deepEqual(evaluatePrompt("Kadıköy'de çalışıyorum").missing.sort(), ["audience", "expertise", "visual"]);
const enriched = enrichPrompt("Kadıköy'de çalışıyorum", promptSuggestions.tr.audience);
assert.match(enriched, /Kadıköy/); assert.match(enriched, /ailelere/);
assert.equal(enrichPrompt(enriched, promptSuggestions.tr.audience), enriched, "suggestions must be idempotent");
assert.doesNotMatch(enrichPrompt("", "<script>alert(1)</script>"), /[<>]/, "suggestions must be inserted as plain text");
assert.ok(promptSuggestions.en.visual.includes("warm"));

const [view, tr, en, handler, migration] = await Promise.all([
  readFile(new URL("../src/portfoyai/views.tsx", import.meta.url), "utf8"),
  readFile(new URL("../locales/tr/common.json", import.meta.url), "utf8"),
  readFile(new URL("../locales/en/common.json", import.meta.url), "utf8"),
  readFile(new URL("./handlers/experiment.mjs", import.meta.url), "utf8"),
  readFile(new URL("../supabase/migrations/20260914000400_onboarding_analytics_events.sql", import.meta.url), "utf8"),
]);
for (const content of [tr, en]) for (const key of ["accountTitle", "timeTitle", "draftTitle", "region", "audience", "expertise", "visual"]) assert.ok(content.includes(`\"${key}\"`));
assert.match(view, /overflow-x-auto/, "suggestions must remain reachable on mobile");
assert.match(view, /focus-visible:ring-2/); assert.match(view, /aria-pressed/); assert.match(view, /role="status"/);
for (const event of ["prompt_suggestion_click", "prompt_quality_ready", "onboarding_generation_start"]) { assert.ok(view.includes(event)); assert.ok(handler.includes(event)); assert.ok(migration.includes(event)); }
console.log("Onboarding prompt guidance, expectations, i18n, accessibility, and analytics contracts passed.");
