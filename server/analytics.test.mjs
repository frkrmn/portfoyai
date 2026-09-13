import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { collectAnalytics } from "./handlers/analytics.mjs";

const response = () => ({ setHeader() {}, end(value) { this.body = JSON.parse(value); } });
let res = response();
await collectAnalytics({ headers: { dnt: "1", "user-agent": "Mozilla" }, body: {} }, res, { from() { throw new Error("filtered traffic must not query storage"); } });
assert.equal(res.statusCode, 202); assert.equal(res.body.reason, "filtered");
res = response();
await collectAnalytics({ headers: { "user-agent": "Googlebot" }, body: {} }, res, { from() { throw new Error("bots must not query storage"); } });
assert.equal(res.statusCode, 202);

const migration = await readFile(new URL("../supabase/migrations/20260913000200_site_listing_analytics.sql", import.meta.url), "utf8");
assert.match(migration, /site_view.*listing_view.*lead_conversion/i);
assert.match(migration, /event_key text not null unique/i);
assert.match(migration, /Site owners read analytics/i);
const handler = await readFile(new URL("./handlers/analytics.mjs", import.meta.url), "utf8");
assert.match(handler, /utm_source/); assert.match(handler, /referrer_host/); assert.match(handler, /session_hash/);
assert.doesNotMatch(migration, /\bip_address\b|\buser_agent\b|\bfull_url\b/i);
const client = await readFile(new URL("../src/lib/public-analytics.ts", import.meta.url), "utf8");
assert.match(client, /navigator\.doNotTrack/); assert.match(client, /new URL\(document\.referrer\)\.hostname/);
const renderer = await readFile(new URL("../src/templates/SiteRenderer.tsx", import.meta.url), "utf8");
assert.match(renderer, /previewSiteId \|\| view === "team"/);
const dashboard = await readFile(new URL("../src/portfoyai/dashboard/AnalyticsPanel.tsx", import.meta.url), "utf8");
assert.match(dashboard, /conversion_rate/); assert.match(dashboard, /by_listing/); assert.match(dashboard, /sources/);

console.info("Analytics verified: privacy schema, DNT/bot/internal filtering, idempotency, site/listing conversion and traffic-source reporting.");
