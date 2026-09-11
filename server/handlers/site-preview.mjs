import { getAuthenticatedUser, methodNotAllowed, routeParam, sendJson, uuidPattern } from "../api-utils.mjs";
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
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return sendJson(response, 401, { error: "Authentication required." });
    console.error("[site-preview] Preview failed", error);
    return sendJson(response, 500, { error: "Site preview failed." });
  }
}
