import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { listingPermissionForMethod, listingPermissionsByMethod, roleHasPermission, rolePermissions } from "./workspace-permissions.mjs";

assert.equal(roleHasPermission("owner", "member.manage"), true);
assert.equal(roleHasPermission("editor", "member.manage"), false);
assert.equal(roleHasPermission("editor", "site.publish"), true);
assert.equal(roleHasPermission("agent", "listing.write"), true);
assert.equal(roleHasPermission("agent", "site.write"), false);
assert.equal(roleHasPermission("viewer", "lead.read"), true);
assert.equal(roleHasPermission("viewer", "lead.write"), false);
assert.deepEqual(Object.keys(rolePermissions), ["owner", "editor", "agent", "viewer"]);
assert.deepEqual(listingPermissionsByMethod, {
  GET: "listing.read",
  POST: "listing.write",
  PATCH: "listing.write",
  DELETE: "listing.write",
});
assert.equal(listingPermissionForMethod("PATCH"), "listing.write");
assert.equal(listingPermissionForMethod("DELETE"), "listing.write");
assert.equal(listingPermissionForMethod("OPTIONS"), null);

const [migration, hardening, handler, router, sites, leads, site, versions, listings, listingItem, team, inviteUi, memberUi] = await Promise.all([
  readFile(new URL("../supabase/migrations/20260914000300_workspace_collaboration.sql", import.meta.url), "utf8"),
  readFile(new URL("../supabase/migrations/20260915000200_workspace_ownership_hardening.sql", import.meta.url), "utf8"),
  readFile(new URL("./handlers/workspaces.mjs", import.meta.url), "utf8"),
  readFile(new URL("./api-router.mjs", import.meta.url), "utf8"),
  readFile(new URL("./handlers/sites.mjs", import.meta.url), "utf8"),
  readFile(new URL("./handlers/leads.mjs", import.meta.url), "utf8"),
  readFile(new URL("./handlers/site.mjs", import.meta.url), "utf8"),
  readFile(new URL("./handlers/site-versions.mjs", import.meta.url), "utf8"),
  readFile(new URL("./handlers/site-listings.mjs", import.meta.url), "utf8"),
  readFile(new URL("./handlers/listing.mjs", import.meta.url), "utf8"),
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
assert.match(hardening, /has_column_privilege\('authenticated', 'public\.sites', 'user_id', 'UPDATE'\)/, "deployed grants must be audited before hardening");
assert.match(hardening, /SITE_IDENTITY_IMMUTABLE/);
assert.match(hardening, /current_user not in \('postgres', 'service_role', 'supabase_admin'\)/);
assert.match(hardening, /set user_id = owner_membership\.user_id/, "stale legacy ownership must be repaired from the canonical owner membership");
assert.match(hardening, /workspace_id is null and user_id = \(select auth\.uid\(\)\)/, "unmigrated legacy sites need an explicit fallback");
assert.match(hardening, /drop policy if exists "Site owners can read own sites"/);
assert.match(hardening, /drop policy if exists workspace_site_write/);
assert.match(hardening, /workspace\.ownership_transferred/);
assert.match(hardening, /revoke all on function public\.transfer_workspace_ownership.*anon, authenticated/i);
assert.match(hardening, /Rollback plan:/);
for (const flow of ["invitation.created", "invitation.accepted", "invitation.canceled", "member.role_changed", "member.removed"]) assert.ok(migration.includes(flow) || handler.includes(flow), `${flow} must be audited`);
assert.match(handler, /randomBytes\(32\)/);
assert.match(handler, /createHash\("sha256"\)/);
assert.match(handler, /normalizeEmail\(user\.email\) !== normalizeEmail\(invitation\.email\)/);
assert.match(handler, /Transfer ownership before changing or removing the owner/);
for (const route of ["members", "ownership", "invitations", "resend", "invitation-token"]) assert.ok(router.includes(route));
assert.match(handler, /Only the workspace owner can transfer ownership/);
assert.match(handler, /transfer_workspace_ownership/);
assert.match(sites, /accessibleSiteIds/);
assert.match(leads, /accessibleSiteIds/);
assert.match(site, /requireSitePermission/);
assert.match(versions, /requireSitePermission/);
assert.match(listings, /requireSitePermission/);
assert.match(listings, /requireSitePermission/);
assert.match(listingItem, /requireSitePermission\(user\.id, existing\.site_id, listingPermissionForMethod\(request\.method\)\)/);
assert.doesNotMatch(listingItem, /getOwnedSite/);
assert.match(team, /requireSitePermission/);
assert.match(inviteUi, /\/api\/invitations\/\$\{token\}/);
for (const action of ["Davet et", "Yeniden gönder", "İptal", "Çıkar"]) assert.ok(memberUi.includes(action));
console.log("Workspace collaboration role, isolation, migration, and flow contracts passed.");
