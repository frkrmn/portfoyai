import { getSupabaseClient } from "./api-utils.mjs";

export const WORKSPACE_FEATURE_FLAG = "WORKSPACE_COLLABORATION_ENABLED";
export const workspaceFeatureEnabled = () => /^(1|true|on)$/i.test(process.env[WORKSPACE_FEATURE_FLAG] || "");

export const rolePermissions = Object.freeze({
  owner: ["workspace.read", "member.read", "member.manage", "site.read", "site.write", "site.publish", "listing.read", "listing.write", "lead.read", "lead.write", "lead.merge", "domain.read", "domain.write", "billing.read", "billing.write", "audit.read"],
  editor: ["workspace.read", "member.read", "site.read", "site.write", "site.publish", "listing.read", "listing.write", "lead.read", "lead.write", "lead.merge", "domain.read", "domain.write", "billing.read", "audit.read"],
  agent: ["site.read", "listing.read", "listing.write", "lead.read", "lead.write", "domain.read", "billing.read", "audit.read"],
  viewer: ["site.read", "listing.read", "lead.read", "domain.read", "billing.read", "audit.read"],
});

export const roleHasPermission = (role, permission) => Boolean(rolePermissions[role]?.includes(permission));

export async function ensurePersonalWorkspace(userId, supabase = getSupabaseClient()) {
  const existing = await supabase.from("workspace_memberships").select("workspace_id").eq("user_id", userId).eq("role", "owner").limit(1).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data.workspace_id;
  const slug = `workspace-${userId.replaceAll("-", "")}`;
  let workspace = await supabase.from("workspaces").insert({ name: "Workspace", slug, created_by: userId }).select("id").single();
  if (workspace.error?.code === "23505") workspace = await supabase.from("workspaces").select("id").eq("slug", slug).single();
  if (workspace.error) throw workspace.error;
  const membership = await supabase.from("workspace_memberships").upsert({ workspace_id: workspace.data.id, user_id: userId, role: "owner" }, { onConflict: "workspace_id,user_id" });
  if (membership.error) throw membership.error;
  return workspace.data.id;
}

export async function requireWorkspacePermission(userId, workspaceId, permission, supabase = getSupabaseClient()) {
  const { data, error } = await supabase.from("workspace_memberships").select("role").eq("workspace_id", workspaceId).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data || !roleHasPermission(data.role, permission)) throw new Error("FORBIDDEN");
  return data.role;
}

export async function accessibleSiteIds(userId, permission = "site.read", supabase = getSupabaseClient()) {
  if (!workspaceFeatureEnabled()) {
    const { data, error } = await supabase.from("sites").select("id").eq("user_id", userId);
    if (error) throw error;
    return (data || []).map(({ id }) => id);
  }
  const allowedRoles = Object.entries(rolePermissions).filter(([, permissions]) => permissions.includes(permission)).map(([role]) => role);
  const memberships = await supabase.from("workspace_memberships").select("workspace_id").eq("user_id", userId).in("role", allowedRoles);
  if (memberships.error) throw memberships.error;
  const workspaceIds = (memberships.data || []).map(({ workspace_id }) => workspace_id);
  if (!workspaceIds.length) return [];
  const sites = await supabase.from("sites").select("id").in("workspace_id", workspaceIds);
  if (sites.error) throw sites.error;
  return (sites.data || []).map(({ id }) => id);
}

export async function requireSitePermission(userId, siteId, permission, supabase = getSupabaseClient()) {
  const { data: site, error } = await supabase.from("sites").select("id,user_id,workspace_id").eq("id", siteId).maybeSingle();
  if (error) throw error;
  if (!site) throw new Error("NOT_FOUND");
  if (!workspaceFeatureEnabled() || !site.workspace_id) {
    if (site.user_id !== userId) throw new Error("NOT_FOUND");
    return { site, role: "owner", legacy: true };
  }
  return { site, role: await requireWorkspacePermission(userId, site.workspace_id, permission, supabase), legacy: false };
}
