import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { collectAnalytics, recordLeadConversion } from "./handlers/analytics.mjs";
import { analyticsVisitorHash, mintAnalyticsToken, verifyAnalyticsToken } from "./analytics-protection.mjs";

const response = () => ({ setHeader() {}, end(value) { this.body = JSON.parse(value); } });
process.env.ANALYTICS_SIGNING_SECRET = "test-only-analytics-secret";
const siteId = "22222222-2222-4222-8222-222222222222";
const tokenRequest = { headers: { "user-agent": "Test Browser", "x-real-ip": "203.0.113.8" } };
const token = mintAnalyticsToken(tokenRequest, siteId, 1_000_000);
assert.equal(verifyAnalyticsToken(tokenRequest, token, siteId, 1_000_100)?.visitor, analyticsVisitorHash(tokenRequest, siteId));
assert.equal(verifyAnalyticsToken({ headers: { ...tokenRequest.headers, "x-real-ip": "203.0.113.9" } }, token, siteId, 1_000_100), null, "tokens must be bound to the visitor fingerprint");
assert.equal(verifyAnalyticsToken(tokenRequest, token, "33333333-3333-4333-8333-333333333333", 1_000_100), null, "tokens must be bound to one site");
assert.equal(verifyAnalyticsToken(tokenRequest, token, siteId, 3_000_000), null, "expired tokens must be rejected");
let conversionRow;
await recordLeadConversion({ from(table) { assert.equal(table, "analytics_events"); return { async upsert(row, options) { conversionRow = row; assert.equal(options.onConflict, "event_key"); return { error: null }; } }; } }, { id: "44444444-4444-4444-8444-444444444444", site_id: siteId, listing_id: null, source: "public-site" });
assert.equal(conversionRow.event_type, "lead_conversion");
assert.equal(conversionRow.lead_id, "44444444-4444-4444-8444-444444444444");
let res = response();
await collectAnalytics({ headers: { dnt: "1", "user-agent": "Mozilla" }, body: {} }, res, { from() { throw new Error("filtered traffic must not query storage"); } });
assert.equal(res.statusCode, 202); assert.equal(res.body.reason, "filtered");
res = response();
await collectAnalytics({ headers: { "user-agent": "Googlebot" }, body: {} }, res, { from() { throw new Error("bots must not query storage"); } });
assert.equal(res.statusCode, 202);

const liveToken = mintAnalyticsToken(tokenRequest, siteId);
const claimedVisitors = [];
let savedEvents = 0;
const analyticsStore = {
  from(table) {
    if (table === "sites") return { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: { id: siteId } }; } };
    if (table === "analytics_events") return { upsert() { savedEvents += 1; return this; }, select() { return this; }, async maybeSingle() { return { data: { id: "event" }, error: null }; } };
    throw new Error(`Unexpected table ${table}`);
  },
  async rpc(name, args) { assert.equal(name, "claim_public_ingestion_budget"); claimedVisitors.push(args.p_visitor_hash); return { data: true, error: null }; },
};
for (const session_id of ["caller-session-one", "rotated-caller-session-two"]) {
  res = response();
  await collectAnalytics({ ...tokenRequest, body: { site_id: siteId, event_type: "site_view", visitor_token: liveToken, session_id } }, res, analyticsStore);
  assert.equal(res.statusCode, 201);
}
assert.equal(savedEvents, 2);
assert.equal(claimedVisitors[0], claimedVisitors[1], "caller session rotation must not change the rate-limit identity");
res = response();
await collectAnalytics({ ...tokenRequest, body: { site_id: siteId, event_type: "site_view", visitor_token: liveToken } }, res, { ...analyticsStore, async rpc() { return { data: false, error: null }; } });
assert.equal(res.statusCode, 429, "events over the atomic ingestion budget must be rejected");
assert.equal(res.body.error, "Analytics event budget exceeded.");
res = response();
await collectAnalytics({ ...tokenRequest, body: { site_id: siteId, event_type: "lead_conversion", lead_id: "44444444-4444-4444-8444-444444444444", visitor_token: liveToken } }, res, analyticsStore);
assert.equal(res.statusCode, 400, "anonymous callers cannot create conversion events");

const migration = await readFile(new URL("../supabase/migrations/20260913000200_site_listing_analytics.sql", import.meta.url), "utf8");
const protectionMigration = await readFile(new URL("../supabase/migrations/20260915000100_public_telemetry_abuse_protection.sql", import.meta.url), "utf8");
assert.match(migration, /site_view.*listing_view.*lead_conversion/i);
assert.match(migration, /event_key text not null unique/i);
assert.match(migration, /Site owners read analytics/i);
const handler = await readFile(new URL("./handlers/analytics.mjs", import.meta.url), "utf8");
assert.match(handler, /utm_source/); assert.match(handler, /referrer_host/); assert.match(handler, /session_hash/);
assert.match(handler, /eventTypes = new Set\(\["site_view", "listing_view"\]\)/);
assert.match(protectionMigration, /pg_advisory_xact_lock/);
assert.match(protectionMigration, /analytics_daily_rollups/);
assert.match(protectionMigration, /rollup_and_prune_public_telemetry/);
assert.match(protectionMigration, /revoke all on function public\.claim_public_ingestion_budget.*anon, authenticated/i);
assert.doesNotMatch(migration, /\bip_address\b|\buser_agent\b|\bfull_url\b/i);
const client = await readFile(new URL("../src/lib/public-analytics.ts", import.meta.url), "utf8");
assert.match(client, /navigator\.doNotTrack/); assert.match(client, /new URL\(document\.referrer\)\.hostname/);
assert.match(client, /analytics\/session/); assert.match(client, /visitor_token/); assert.doesNotMatch(client, /lead_conversion/);
const renderer = await readFile(new URL("../src/templates/SiteRenderer.tsx", import.meta.url), "utf8");
assert.match(renderer, /previewSiteId \|\| view === "team"/);
const dashboard = await readFile(new URL("../src/portfoyai/dashboard/AnalyticsPanel.tsx", import.meta.url), "utf8");
assert.match(dashboard, /conversion_rate/); assert.match(dashboard, /by_listing/); assert.match(dashboard, /sources/);

console.info("Analytics verified: privacy schema, DNT/bot/internal filtering, idempotency, site/listing conversion and traffic-source reporting.");
