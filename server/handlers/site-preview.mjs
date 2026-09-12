import { getAuthenticatedUser, handleKnownError, methodNotAllowed, routeParam, sendJson, uuidPattern } from "../api-utils.mjs";
import { loadPublicSite } from "./public-site.mjs";

export default async function handler(request, response) {
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
  try {
    const user = await getAuthenticatedUser(request);
    const siteId = routeParam(request, "id");
    if (!uuidPattern.test(siteId)) return sendJson(response, 400, { error: "A valid site id is required." });
    const payload = await loadPublicSite("", { siteId, ownerId: user.id });
    if (!payload) return sendJson(response, 404, { error: "Owned site not found." });
    response.setHeader("Cache-Control", "private, no-store");
    return sendJson(response, 200, payload);
  } catch (error) {
    return handleKnownError(response, error, "[site-preview] Preview failed");
  }
}
