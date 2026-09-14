import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { HELP_CONTENT_VERSION, searchHelpArticles } from "../src/lib/help-content.ts";

assert.equal(HELP_CONTENT_VERSION, 1);
assert.ok(searchHelpArticles("yayın", "tr").some((item) => item.id === "publish"));
assert.ok(searchHelpArticles("analytics", "en").some((item) => item.id === "analytics"));
assert.equal(searchHelpArticles("does-not-exist", "en").length, 0);
assert.ok(searchHelpArticles("", "tr").every((item) => item.title.tr && item.body.tr));

const [ui, handler, router, migration] = await Promise.all([
  readFile(new URL("../src/portfoyai/dashboard/HelpCenter.tsx", import.meta.url), "utf8"),
  readFile(new URL("./handlers/support-requests.mjs", import.meta.url), "utf8"),
  readFile(new URL("./api-router.mjs", import.meta.url), "utf8"),
  readFile(new URL("../supabase/migrations/20260914000200_support_requests.sql", import.meta.url), "utf8"),
]);
assert.match(ui, /role="dialog"/); assert.match(ui, /aria-modal="true"/); assert.match(ui, /sm:place-items-center/); assert.match(ui, /role="alert"/);
assert.match(ui, /fastate_onboarding_guide_v/); assert.match(ui, /HELP_CONTENT_VERSION/); assert.match(ui, /Do not share passwords/);
assert.match(handler, /allowedSections/); assert.match(handler, /app_version/); assert.match(handler, /randomUUID/); assert.match(handler, /eq\("user_id", user\.id\)/);
assert.match(router, /support-requests/); assert.match(migration, /enable row level security/i); assert.match(migration, /support_requests_select_own/);
console.log("Help center and support flow contract passed.");
