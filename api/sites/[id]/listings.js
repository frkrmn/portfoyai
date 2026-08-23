import { getAuthenticatedUser, getOwnedSite, getSupabaseClient, handleKnownError, listingPayload, methodNotAllowed, readJsonBody, routeParam, sendJson, serializeListing, uuidPattern } from "../../../server/api-utils.mjs";

export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

export default async function handler(request, response) {
  if (!["GET", "POST"].includes(request.method || "")) return methodNotAllowed(response, ["GET", "POST"]);
  const siteId = routeParam(request, "id");
  if (!uuidPattern.test(siteId)) return sendJson(response, 400, { error: "A valid site id is required." });
  try {
    const user = await getAuthenticatedUser(request);
    const site = await getOwnedSite(user.id, siteId);
    if (!site) return sendJson(response, 404, { error: "Owned site not found." });
    if (request.method === "GET") {
      const { data, error } = await getSupabaseClient().from("listings").select("*").eq("site_id", siteId).order("created_at", { ascending: false });
      if (error) throw new Error(`Failed to load listings: ${error.message}`);
      return sendJson(response, 200, { listings: (data || []).map(serializeListing) });
    }
    const body = await readJsonBody(request, 8 * 1024 * 1024);
    const payload = listingPayload(body, siteId);
    const { data, error } = await getSupabaseClient().from("listings").insert(payload).select("*").single();
    if (error) throw new Error(`Failed to create listing: ${error.message}`);
    return sendJson(response, 201, { listing: serializeListing(data) });
  } catch (error) {
    return handleKnownError(response, error, "[listings] Site listings request failed");
  }
}
