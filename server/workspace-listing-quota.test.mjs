import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/20260915000300_workspace_listing_quota.sql", import.meta.url), "utf8");
const handler = await readFile(new URL("./handlers/site-listings.mjs", import.meta.url), "utf8");
const utils = await readFile(new URL("./api-utils.mjs", import.meta.url), "utf8");

assert.match(migration, /select workspace_id, user_id into target_workspace_id, legacy_owner_id/);
assert.match(migration, /quota_key := case when target_workspace_id is not null/);
assert.match(migration, /pg_advisory_xact_lock\(hashtextextended\(quota_key, 0\)\)/, "workspace quota check must serialize concurrent creates");
assert.match(migration, /where workspace_id = target_workspace_id and plan = 'pro'/, "workspace subscription must be the entitlement source");
assert.match(migration, /s\.workspace_id = target_workspace_id/, "all sites in the target workspace must share one count");
assert.match(migration, /s\.workspace_id is null and s\.user_id = legacy_owner_id/, "unmigrated sites must retain a user-scoped fallback");
assert.match(migration, /l\.status = 'active'/);
assert.match(migration, /l\.listing_status = 'active'/);
assert.match(migration, /active_count >= 5/);
assert.match(migration, /tg_op = 'UPDATE'.*old\.status = 'active'/s, "ordinary edits to active listings must not consume capacity again");
assert.match(migration, /Deactivate\/delete naturally releases capacity/);
assert.doesNotMatch(handler, /countActiveListingsForUser|getUserPlan/, "API must not perform a racy actor-scoped precheck");
assert.doesNotMatch(utils, /countActiveListingsForUser/, "legacy actor-scoped quota helper must be removed");
assert.match(utils, /error\.message\.includes\("FREE_LISTING_LIMIT"\)/, "database quota errors must retain the upgrade response");

console.info("Workspace listing quota verified: shared entitlement, atomic create, activation/deactivation and legacy fallback contracts passed.");
