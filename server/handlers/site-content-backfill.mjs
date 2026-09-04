import { getAuthenticatedUser, handleKnownError, methodNotAllowed, sendJson, uuidPattern } from "../api-utils.mjs";
import { backfillPublicSiteContent } from "./public-site-content-backfill.mjs";

export default async function handler(request, response) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  try {
    const user = await getAuthenticatedUser(request);
    const siteId = String(request.query?.id || "");
    if (!uuidPattern.test(siteId)) return sendJson(response, 400, { error: "A valid site id is required." });
    const result = await backfillPublicSiteContent("", { siteId, userId: user.id });
    return sendJson(response, result.status, result.body);
  } catch (error) {
    return handleKnownError(response, error, "[sites] Content translation backfill failed");
  }
}
