import assert from "node:assert/strict";
import { applySiteVisibility } from "./handlers/public-site.mjs";
import { apiRouteInventory } from "./api-router.mjs";

const queryRecorder = () => {
  const filters = [];
  const query = {
    eq(column, value) {
      filters.push([column, value]);
      return query;
    },
  };
  return { query, filters };
};

const publicQuery = queryRecorder();
assert.equal(applySiteVisibility(publicQuery.query, { slug: "gizli-taslak" }), publicQuery.query);
assert.deepEqual(publicQuery.filters, [
  ["slug", "gizli-taslak"],
  ["status", "published"],
], "Public site queries must only return published sites");

const ownerQuery = queryRecorder();
assert.equal(applySiteVisibility(ownerQuery.query, { siteId: "site-1", ownerId: "owner-1" }), ownerQuery.query);
assert.deepEqual(ownerQuery.filters, [
  ["id", "site-1"],
  ["user_id", "owner-1"],
], "Authenticated previews must be scoped to the requested owner");

console.info("Public access policy: published-only public query and owner-scoped preview verified");

assert.equal(apiRouteInventory.some((route) => route.pattern.test("/api/public-sites/example/content-backfill")), false, "Anonymous backfill route must not exist");
assert.equal(apiRouteInventory.some((route) => route.pattern.test("/api/sites/00000000-0000-4000-8000-000000000000/content-backfill") && route.methods.includes("POST")), true, "Authenticated site backfill route must remain available");
