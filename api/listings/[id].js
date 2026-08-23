import { getAuthenticatedUser, getOwnedSite, getSupabaseClient, handleKnownError, listingPayload, methodNotAllowed, readJsonBody, routeParam, sendJson, serializeListing, uuidPattern } from "../../server/api-utils.mjs";

export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

export default async function handler(request, response) {
  if (!["PATCH", "DELETE"].includes(request.method || "")) return methodNotAllowed(response, ["PATCH", "DELETE"]);
  const listingId = routeParam(request, "id");
  if (!uuidPattern.test(listingId)) return sendJson(response, 400, { error: "A valid listing id is required." });
  try {
    const user = await getAuthenticatedUser(request);
    const { data: existing, error: listingError } = await getSupabaseClient().from("listings").select("*").eq("id", listingId).maybeSingle();
    if (listingError) throw new Error(`Failed to load listing: ${listingError.message}`);
    if (!existing || !(await getOwnedSite(user.id, existing.site_id))) return sendJson(response, 404, { error: "Owned listing not found." });
    if (request.method === "DELETE") {
      const { error } = await getSupabaseClient().from("listings").delete().eq("id", listingId).eq("site_id", existing.site_id);
      if (error) throw new Error(`Failed to delete listing: ${error.message}`);
      return sendJson(response, 200, { deleted: true, id: listingId });
    }
    const body = await readJsonBody(request, 8 * 1024 * 1024);
    const payload = listingPayload({ ...existing, ...body }, existing.site_id);
    delete payload.site_id;
    const { data, error } = await getSupabaseClient().from("listings").update(payload).eq("id", listingId).eq("site_id", existing.site_id).select("*").single();
    if (error) throw new Error(`Failed to update listing: ${error.message}`);
    return sendJson(response, 200, { listing: serializeListing(data) });
  } catch (error) {
    return handleKnownError(response, error, "[listings] Listing mutation failed");
  }
}
