import { randomUUID } from "node:crypto";
import { getAuthenticatedUser, getSupabaseClient, handleKnownError, methodNotAllowed, readJsonBody, sendJson, uuidPattern } from "../api-utils.mjs";
import { requireSitePermission } from "../workspace-permissions.mjs";
const categories = new Set(["getting-started", "site-editor", "publishing", "leads", "billing", "other"]);
const allowedSections = new Set(["overview", "analytics", "site", "content", "images", "listings", "leads"]);
export default async function handler(request, response) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  try {
    const user = await getAuthenticatedUser(request);
    const body = await readJsonBody(request);
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const category = categories.has(body.category) ? body.category : "other";
    const siteId = uuidPattern.test(String(body.site_id || "")) ? body.site_id : null;
    if (message.length < 10 || message.length > 2000) return sendJson(response, 400, { error: "Message must be between 10 and 2000 characters." });
    if (siteId) {
      try { await requireSitePermission(user.id, siteId, "site.read"); }
      catch (error) { if (["NOT_FOUND", "FORBIDDEN"].includes(error?.message)) return sendJson(response, 404, { error: "Site not found." }); throw error; }
    }
    const requestId = randomUUID();
    const context = { section: allowedSections.has(body.context?.section) ? body.context.section : "overview", app_version: String(process.env.VERCEL_GIT_COMMIT_SHA || "development").slice(0, 40), help_version: Number(body.context?.help_version) || 1 };
    const { data, error } = await getSupabaseClient().from("support_requests").insert({ user_id: user.id, site_id: siteId, category, message, context, request_id: requestId }).select("id,status,created_at,request_id").single();
    if (error) throw error;
    return sendJson(response, 201, { request: data });
  } catch (error) { return handleKnownError(response, error, "[support] Request failed"); }
}
