import { getAuthenticatedUser, getSupabaseClient, handleKnownError, listingPayload, listingSelect, methodNotAllowed, readJsonBody, routeParam, sendJson, serializeListing, uuidPattern } from "../api-utils.mjs";
import { removeReplacedMedia } from "../media-storage.mjs";
import { appendPriceChange } from "../../src/lib/deal-verification.mjs";
import { removeLandDocuments } from "../land-documents.mjs";
import { listingPermissionForMethod, requireSitePermission } from "../workspace-permissions.mjs";

export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

export default async function handler(request, response) {
  if (!["PATCH", "DELETE"].includes(request.method || "")) return methodNotAllowed(response, ["PATCH", "DELETE"]);
  const listingId = routeParam(request, "id");
  if (!uuidPattern.test(listingId)) return sendJson(response, 400, { error: "A valid listing id is required." });
  try {
    const user = await getAuthenticatedUser(request);
    const { data: existing, error: listingError } = await getSupabaseClient().from("listings").select("*").eq("id", listingId).maybeSingle();
    if (listingError) throw new Error(`Failed to load listing: ${listingError.message}`);
    if (!existing) return sendJson(response, 404, { error: "Owned listing not found." });
    await requireSitePermission(user.id, existing.site_id, listingPermissionForMethod(request.method));
    if (request.method === "DELETE") {
      const { error } = await getSupabaseClient().from("listings").delete().eq("id", listingId).eq("site_id", existing.site_id);
      if (error) throw new Error(`Failed to delete listing: ${error.message}`);
      await removeReplacedMedia(existing.media, [], { siteId: existing.site_id });
      await removeLandDocuments(existing);
      return sendJson(response, 200, { deleted: true, id: listingId });
    }
    const body = await readJsonBody(request, 8 * 1024 * 1024);
    const payload = listingPayload({ ...existing, ...body }, existing.site_id);
    delete payload.site_id;
    const now = new Date();
    if (existing.currency !== payload.currency) payload.price_history = [];
    else if (Number(existing.price) !== Number(payload.price)) payload.price_history = appendPriceChange(existing.price_history, { oldPrice: existing.price, newPrice: payload.price, currency: payload.currency, changedAt: now.toISOString(), changedBy: user.id });
    if (payload.urgent_sale) {
      const needsVerification = existing.urgent_sale !== true || body.verify_urgency === true || !existing.urgent_expires_at || Date.parse(existing.urgent_expires_at) <= now.getTime();
      if (needsVerification) { payload.urgent_verified_by = user.id; payload.urgent_verified_at = now.toISOString(); payload.urgent_expires_at = new Date(now.getTime() + 30 * 86_400_000).toISOString(); }
    } else { payload.urgent_verified_by = null; payload.urgent_verified_at = null; payload.urgent_expires_at = null; }
    const { data, error } = await getSupabaseClient().from("listings").update(payload).eq("id", listingId).eq("site_id", existing.site_id).select(listingSelect).single();
    if (error) throw new Error(`Failed to update listing: ${error.message}`);
    await removeReplacedMedia(existing.media, data.media, { siteId: existing.site_id });
    await removeLandDocuments(existing, data);
    return sendJson(response, 200, { listing: serializeListing(data) });
  } catch (error) {
    return handleKnownError(response, error, "[listings] Listing mutation failed");
  }
}
