import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { domainState, fallbackDnsRecords, normalizeCustomDomain, sslState } from "../src/lib/custom-domain.mjs";
import { isLoopbackHostname } from "../src/lib/platform-host.mjs";
import { addProjectDomain, inspectProjectDomain, removeProjectDomain, verifyProjectDomain } from "./vercel-domains.mjs";

assert.equal(normalizeCustomDomain(" MÜNİH.example. "), "xn--mnih-0ra.example");
for (const invalid of ["https://example.com", "example.com/path", "*.example.com", "localhost", "bad_domain.com"]) assert.throws(() => normalizeCustomDomain(invalid), /VALIDATION/);
assert.deepEqual(fallbackDnsRecords("example.com"), [{ type: "A", name: "@", value: "76.76.21.21" }]);
assert.deepEqual(fallbackDnsRecords("homes.example.com"), [{ type: "CNAME", name: "homes", value: "cname.vercel-dns.com" }]);
assert.equal(domainState({ verified: true, misconfigured: false }), "verified");
assert.equal(domainState({ verified: true, misconfigured: true }), "pending");
assert.equal(sslState({ verified: true, misconfigured: false }), "active");
assert.equal(sslState({ error: true }), "error");
for (const hostname of ["localhost", "app.localhost", "127.0.0.1", "127.12.34.56", "::1", "[::1]"]) assert.equal(isLoopbackHostname(hostname), true);
for (const hostname of ["example.com", "128.0.0.1", "localhost.example.com"]) assert.equal(isLoopbackHostname(hostname), false);

process.env.VERCEL_TOKEN = "test-token";
process.env.VERCEL_PROJECT_ID = "project-id";
process.env.VERCEL_TEAM_ID = "team-id";
const calls = [];
const fetchMock = async (url, options = {}) => {
  calls.push({ url: String(url), method: options.method || "GET", body: options.body });
  if (String(url).includes("/config")) return new Response(JSON.stringify({ misconfigured: false }), { status: 200 });
  return new Response(JSON.stringify({ name: "example.com", verified: true, verification: [] }), { status: 200 });
};
await addProjectDomain("example.com", fetchMock);
await verifyProjectDomain("example.com", fetchMock);
await removeProjectDomain("example.com", fetchMock);
const inspection = await inspectProjectDomain("example.com", fetchMock);
assert.equal(inspection.verified, true);
assert.equal(inspection.misconfigured, false);
assert.equal(calls[0].method, "POST");
assert.match(calls[0].url, /\/v10\/projects\/project-id\/domains\?teamId=team-id/);
assert.ok(calls.some((call) => call.url.includes("/verify") && call.method === "POST"));
assert.ok(calls.some((call) => call.method === "DELETE"));
assert.ok(calls.some((call) => call.url.includes("/v6/domains/example.com/config")));

const migration = await readFile(new URL("../supabase/migrations/20260914001000_custom_domains.sql", import.meta.url), "utf8");
assert.match(migration, /domain citext not null unique/);
assert.match(migration, /pending','verified','error/);
assert.match(migration, /ssl_status/);
const handler = await readFile(new URL("./handlers/site-domain.mjs", import.meta.url), "utf8");
assert.match(handler, /DOMAIN_CONFLICT/);
assert.match(handler, /removeProjectDomain/);
assert.match(handler, /verifyProjectDomain/);
assert.match(handler, /requireSitePermission/);
const router = await readFile(new URL("./api-router.mjs", import.meta.url), "utf8");
assert.match(router, /\/domain\$/);
assert.match(router, /public-domains/);
const ui = await readFile(new URL("../src/portfoyai/dashboard/CustomDomainSettings.tsx", import.meta.url), "utf8");
assert.match(ui, /data-custom-domain-settings/);
assert.match(ui, /dns_records/);
assert.match(ui, /ssl_status/);

console.log("Custom domain checks passed.");
