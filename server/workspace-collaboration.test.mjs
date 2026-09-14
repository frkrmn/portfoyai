import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { roleHasPermission, rolePermissions } from "./workspace-permissions.mjs";

assert.equal(roleHasPermission("owner", "member.manage"), true);
assert.equal(roleHasPermission("editor", "member.manage"), false);
assert.equal(roleHasPermission("editor", "site.publish"), true);
assert.equal(roleHasPermission("agent", "listing.write"), true);
assert.equal(roleHasPermission("agent", "site.write"), false);
assert.equal(roleHasPermission("viewer", "lead.read"), true);
assert.equal(roleHasPermission("viewer", "lead.write"), false);
assert.deepEqual(Object.keys(rolePermissions), ["owner", "editor", "agent", "viewer"]);

const [migration, handler, router, sites, leads, site, versions, listings, team, inviteUi, memberUi] = await Promise.all([
  readFile(new URL("../supabase/migrations/20260914000300_workspace_collaboration.sql", import.meta.url), "utf8"),
  readFile(new URL("./handlers/workspaces.mjs", import.meta.url), "utf8"),
  readFile(new URL("./api-router.mjs", import.meta.url), "utf8"),
  readFile(new URL("./handlers/sites.mjs", import.meta.url), "utf8"),
  readFile(new URL("./handlers/leads.mjs", import.meta.url), "utf8"),
  readFile(new URL("./handlers/site.mjs", import.meta.url), "utf8"),
  readFile(new URL("./handlers/site-versions.mjs", import.meta.url), "utf8"),
  readFile(new URL("./handlers/site-listings.mjs", import.meta.url), "utf8"),
  readFile(new URL("./handlers/team-members.mjs", import.meta.url), "utf8"),
  readFile(new URL("../src/portfoyai/invite.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/portfoyai/dashboard/WorkspaceMembers.tsx", import.meta.url), "utf8"),
]);
for (const table of ["workspaces", "workspace_memberships", "workspace_invitations", "workspace_audit_logs"]) assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
assert.match(migration, /workspace_single_owner_idx/);
assert.match(migration, /token_hash text not null unique/);
assert.match(migration, /for update/);
assert.match(migration, /workspace_id = target_workspace and user_id = auth\.uid\(\)/, "RLS helper must isolate workspaces");
assert.match(migration, /Rollback: disable WORKSPACE_COLLABORATION_ENABLED/);
for (const flow of ["invitation.created", "invitation.accepted", "invitation.canceled", "member.role_changed", "member.removed"]) assert.ok(migration.includes(flow) || handler.includes(flow), `${flow} must be audited`);
assert.match(handler, /randomBytes\(32\)/);
assert.match(handler, /createHash\("sha256"\)/);
assert.match(handler, /normalizeEmail\(user\.email\) !== normalizeEmail\(invitation\.email\)/);
assert.match(handler, /Transfer ownership before changing or removing the owner/);
for (const route of ["members", "invitations", "resend", "invitation-token"]) assert.ok(router.includes(route));
assert.match(sites, /accessibleSiteIds/);
assert.match(leads, /accessibleSiteIds/);
assert.match(site, /requireSitePermission/);
assert.match(versions, /requireSitePermission/);
assert.match(listings, /requireSitePermission/);
assert.match(team, /requireSitePermission/);
assert.match(inviteUi, /\/api\/invitations\/\$\{token\}/);
for (const action of ["Davet et", "Yeniden gönder", "İptal", "Çıkar"]) assert.ok(memberUi.includes(action));
console.log("Workspace collaboration role, isolation, migration, and flow contracts passed.");
