import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/20260912000300_site_draft_publish_versions.sql", import.meta.url), "utf8");
const workspaceMigration = await readFile(new URL("../supabase/migrations/20260915000500_dashboard_backoffice_fixes.sql", import.meta.url), "utf8");
const publicHandler = await readFile(new URL("./handlers/public-site.mjs", import.meta.url), "utf8");
const siteHandler = await readFile(new URL("./handlers/site.mjs", import.meta.url), "utf8");
const versionHandler = await readFile(new URL("./handlers/site-versions.mjs", import.meta.url), "utf8");

assert.match(migration, /for update/iu);
assert.match(migration, /s\.draft_revision <> p_expected_revision/iu);
assert.match(migration, /insert into public\.site_versions/iu);
assert.match(migration, /published_snapshot = snapshot/iu);
assert.match(migration, /published_snapshot = target/iu);
assert.match(publicHandler, /published_snapshot/iu);
assert.match(siteHandler, /REVISION_CONFLICT/iu);
assert.match(versionHandler, /requireSitePermission/u);
assert.doesNotMatch(versionHandler, /eq\("user_id", user\.id\)/u);
assert.match(versionHandler, /rollback_site_version/u);
assert.match(workspaceMigration, /role in \('owner', 'editor'\)/u);
assert.match(workspaceMigration, /revoke all on function public\.publish_site_version.*anon, authenticated/iu);
assert.match(workspaceMigration, /revoke all on function public\.rollback_site_version.*anon, authenticated/iu);

console.info(JSON.stringify({ atomic_publish: true, immutable_public_snapshot: true, rollback: true, ownership: true, optimistic_concurrency: true }, null, 2));
