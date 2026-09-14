import { loadPublicSite } from "./public-site.mjs";
import { handleKnownError, methodNotAllowed, routeParam, sendJson } from "../api-utils.mjs";
import { normalizeCustomDomain } from "../../src/lib/custom-domain.mjs";

export default async function handler(request, response) {
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
  try {
    const domain = normalizeCustomDomain(routeParam(request, "domain"));
    const payload = await loadPublicSite("", { domain });
    if (!payload) return sendJson(response, 404, { error: "Site not found." });
    response.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    return sendJson(response, 200, payload);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("VALIDATION:")) return sendJson(response, 400, { error: error.message.slice(11) });
    return handleKnownError(response, error, "[public-domains] Site fetch failed");
  }
}
