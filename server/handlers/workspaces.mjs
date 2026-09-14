import { createHash, randomBytes, randomUUID } from "node:crypto";
import { getAuthenticatedUser, getSupabaseClient, handleKnownError, methodNotAllowed, readJsonBody, sendJson, uuidPattern } from "../api-utils.mjs";
import { requireWorkspacePermission, roleHasPermission, workspaceFeatureEnabled } from "../workspace-permissions.mjs";

const invitationRoles = new Set(["editor", "agent", "viewer"]);
const normalizeEmail = (value) => String(value || "").trim().toLocaleLowerCase("en-US");
const tokenHash = (token) => createHash("sha256").update(token).digest("hex");
const requestId = (request) => String(request.headers["x-request-id"] || randomUUID()).slice(0, 100);
const publicUrl = (request) => process.env.PUBLIC_APP_URL || `${request.headers["x-forwarded-proto"] || "http"}://${request.headers.host || "localhost"}`;

async function audit(supabase, workspaceId, userId, action, targetType, targetId, before, after, request) {
  const { error } = await supabase.from("workspace_audit_logs").insert({ workspace_id: workspaceId, actor_user_id: userId, action, target_type: targetType, target_id: targetId, before, after, request_id: requestId(request) });
  if (error) throw error;
}

async function deliverInvitation({ email, inviteUrl, workspaceName }) {
  if (!process.env.RESEND_API_KEY || !process.env.WORKSPACE_INVITE_FROM) return false;
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.WORKSPACE_INVITE_FROM, to: [email], subject: `${workspaceName} workspace daveti`, html: `<p>${workspaceName} çalışma alanına davet edildiniz.</p><p><a href="${inviteUrl}">Daveti kabul et</a></p>` }) });
  if (!response.ok) throw new Error("Invitation delivery failed.");
  return true;
}

async function createInvitation(request, response, user, workspaceId, supabase) {
  await requireWorkspacePermission(user.id, workspaceId, "member.manage", supabase);
  const body = await readJsonBody(request);
  const email = normalizeEmail(body.email);
  const role = String(body.role || "viewer");
  if (!/^\S+@\S+\.\S+$/.test(email) || !invitationRoles.has(role)) return sendJson(response, 400, { error: "A valid email and invitation role are required." });
  const members = await supabase.from("workspace_memberships").select("user_id").eq("workspace_id", workspaceId);
  if (members.error) throw members.error;
  for (const member of members.data || []) { const result = await supabase.auth.admin.getUserById(member.user_id); if (normalizeEmail(result.data?.user?.email) === email) return sendJson(response, 409, { error: "This user is already a member." }); }
  const active = await supabase.from("workspace_invitations").select("id").eq("workspace_id", workspaceId).eq("email", email).is("accepted_at", null).is("canceled_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (active.error) throw active.error;
  if (active.data) return sendJson(response, 409, { error: "An active invitation already exists." });
  const token = randomBytes(32).toString("base64url");
  const created = await supabase.from("workspace_invitations").insert({ workspace_id: workspaceId, email, role, token_hash: tokenHash(token), invited_by: user.id }).select("id,email,role,expires_at,created_at").single();
  if (created.error) throw created.error;
  const workspace = await supabase.from("workspaces").select("name").eq("id", workspaceId).single();
  if (workspace.error) throw workspace.error;
  const inviteUrl = `${publicUrl(request)}/invite/${token}`;
  const delivered = await deliverInvitation({ email, inviteUrl, workspaceName: workspace.data.name });
  await audit(supabase, workspaceId, user.id, "invitation.created", "invitation", created.data.id, null, { email: email.replace(/(^.).*(@.*$)/, "$1***$2"), role }, request);
  return sendJson(response, 201, { invitation: created.data, delivered, ...(delivered ? {} : { invite_url: inviteUrl }) });
}

async function invitationPreview(request, response, token, accept) {
  const supabase = getSupabaseClient();
  const result = await supabase.from("workspace_invitations").select("id,email,role,expires_at,accepted_at,canceled_at,workspace_id,workspace:workspaces(name)").eq("token_hash", tokenHash(token)).maybeSingle();
  if (result.error) throw result.error;
  const invitation = result.data;
  if (!invitation || invitation.canceled_at || new Date(invitation.expires_at) <= new Date()) return sendJson(response, 404, { error: "Invitation is not available." });
  if (!accept) return sendJson(response, 200, { invitation: { email: invitation.email, role: invitation.role, workspace_name: invitation.workspace?.name, expires_at: invitation.expires_at, accepted: Boolean(invitation.accepted_at) } });
  const user = await getAuthenticatedUser(request);
  if (normalizeEmail(user.email) !== normalizeEmail(invitation.email)) return sendJson(response, 403, { error: "Sign in with the invited email address." });
  const accepted = await supabase.rpc("accept_workspace_invitation", { p_token_hash: tokenHash(token), p_user_id: user.id, p_request_id: requestId(request) });
  if (accepted.error) throw accepted.error;
  return sendJson(response, 200, { membership: accepted.data });
}

export default async function handler(request, response) {
  if (!workspaceFeatureEnabled()) return sendJson(response, 404, { error: "Not found" });
  try {
    const action = request.query?.workspaceAction;
    if (action === "invitation-token") {
      if (!["GET", "POST"].includes(request.method)) return methodNotAllowed(response, ["GET", "POST"]);
      return invitationPreview(request, response, request.query.token, request.method === "POST");
    }
    const user = await getAuthenticatedUser(request);
    const workspaceId = request.query?.workspaceId;
    if (!uuidPattern.test(workspaceId || "")) return sendJson(response, 400, { error: "A valid workspace id is required." });
    const supabase = getSupabaseClient();
    if (action === "members" && request.method === "GET") {
      await requireWorkspacePermission(user.id, workspaceId, "member.read", supabase);
      const result = await supabase.from("workspace_memberships").select("user_id,role,joined_at,invited_by").eq("workspace_id", workspaceId).order("joined_at");
      if (result.error) throw result.error;
      return sendJson(response, 200, { members: result.data });
    }
    if (action === "member" && ["PATCH", "DELETE"].includes(request.method)) {
      await requireWorkspacePermission(user.id, workspaceId, "member.manage", supabase);
      const target = request.query.userId;
      const current = await supabase.from("workspace_memberships").select("role").eq("workspace_id", workspaceId).eq("user_id", target).maybeSingle();
      if (current.error) throw current.error;
      if (!current.data) return sendJson(response, 404, { error: "Member not found." });
      if (current.data.role === "owner") return sendJson(response, 409, { error: "Transfer ownership before changing or removing the owner." });
      if (request.method === "DELETE") { const removed = await supabase.from("workspace_memberships").delete().eq("workspace_id", workspaceId).eq("user_id", target); if (removed.error) throw removed.error; await audit(supabase, workspaceId, user.id, "member.removed", "membership", target, { role: current.data.role }, null, request); return sendJson(response, 204, {}); }
      const body = await readJsonBody(request); const role = String(body.role || "");
      if (!invitationRoles.has(role)) return sendJson(response, 400, { error: "Invalid role." });
      const changed = await supabase.from("workspace_memberships").update({ role }).eq("workspace_id", workspaceId).eq("user_id", target).select("user_id,role,joined_at").single();
      if (changed.error) throw changed.error; await audit(supabase, workspaceId, user.id, "member.role_changed", "membership", target, current.data, { role }, request); return sendJson(response, 200, { member: changed.data });
    }
    if (action === "invitations" && request.method === "POST") return createInvitation(request, response, user, workspaceId, supabase);
    if (action === "invitations" && request.method === "GET") { await requireWorkspacePermission(user.id, workspaceId, "member.read", supabase); const result = await supabase.from("workspace_invitations").select("id,email,role,expires_at,accepted_at,canceled_at,created_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false }); if (result.error) throw result.error; return sendJson(response, 200, { invitations: result.data }); }
    if (action === "invitation" && request.method === "DELETE") { await requireWorkspacePermission(user.id, workspaceId, "member.manage", supabase); const updated = await supabase.from("workspace_invitations").update({ canceled_at: new Date().toISOString() }).eq("id", request.query.invitationId).eq("workspace_id", workspaceId).is("accepted_at", null).select("id").maybeSingle(); if (updated.error) throw updated.error; if (!updated.data) return sendJson(response, 404, { error: "Active invitation not found." }); await audit(supabase, workspaceId, user.id, "invitation.canceled", "invitation", updated.data.id, null, null, request); return sendJson(response, 204, {}); }
    if (action === "resend" && request.method === "POST") { await requireWorkspacePermission(user.id, workspaceId, "member.manage", supabase); const old = await supabase.from("workspace_invitations").select("email,role").eq("id", request.query.invitationId).eq("workspace_id", workspaceId).is("accepted_at", null).maybeSingle(); if (old.error) throw old.error; if (!old.data) return sendJson(response, 404, { error: "Active invitation not found." }); await supabase.from("workspace_invitations").update({ canceled_at: new Date().toISOString() }).eq("id", request.query.invitationId); request.body = old.data; return createInvitation(request, response, user, workspaceId, supabase); }
    return methodNotAllowed(response, ["GET", "POST", "PATCH", "DELETE"]);
  } catch (error) { return handleKnownError(response, error, "[workspaces] Request failed"); }
}
