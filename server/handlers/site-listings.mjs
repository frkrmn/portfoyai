import { countActiveListingsForUser, getAuthenticatedUser, getOwnedSite, getSupabaseClient, getUserPlan, handleKnownError, listingPayload, listingSelect, methodNotAllowed, readJsonBody, routeParam, sendJson, serializeListing, uuidPattern } from "../api-utils.mjs";
import { listingPermissionForMethod, requireSitePermission } from "../workspace-permissions.mjs";

export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

export default async function handler(request, response) {
  if (!["GET", "POST"].includes(request.method || "")) return methodNotAllowed(response, ["GET", "POST"]);
  const siteId = routeParam(request, "id");
  if (!uuidPattern.test(siteId)) return sendJson(response, 400, { error: "A valid site id is required." });
  try {
    const user = await getAuthenticatedUser(request);
    await requireSitePermission(user.id, siteId, listingPermissionForMethod(request.method));
    const site = await getOwnedSite(user.id, siteId);
    if (!site) return sendJson(response, 404, { error: "Owned site not found." });
    if (request.method === "GET") {
      const { data, error } = await getSupabaseClient().from("listings").select(listingSelect).eq("site_id", siteId).order("created_at", { ascending: false });
      if (error) throw new Error(`Failed to load listings: ${error.message}`);
      return sendJson(response, 200, { listings: (data || []).map(serializeListing) });
    }
    const body = await readJsonBody(request, 8 * 1024 * 1024);
    const payload = listingPayload(body, siteId);
    if (payload.urgent_sale) { const now = new Date(); payload.urgent_verified_by = user.id; payload.urgent_verified_at = now.toISOString(); payload.urgent_expires_at = new Date(now.getTime() + 30 * 86_400_000).toISOString(); }
    const plan = await getUserPlan(user.id, site.workspace_id);
    if (plan === "free" && payload.status === "active" && await countActiveListingsForUser(user.id) >= 5) {
      return sendJson(response, 402, {
        error: "Ücretsiz planda en fazla 5 aktif ilan yayınlayabilirsiniz.",
        code: "FREE_LISTING_LIMIT",
        context: "listing_limit",
        limit: 5,
        plan,
      });
    }
    const { data, error } = await getSupabaseClient().from("listings").insert(payload).select(listingSelect).single();
    if (error) throw new Error(`Failed to create listing: ${error.message}`);
    return sendJson(response, 201, { listing: serializeListing(data) });
  } catch (error) {
    return handleKnownError(response, error, "[listings] Site listings request failed");
  }
}
