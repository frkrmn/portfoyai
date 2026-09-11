import { getAuthenticatedUser, handleKnownError, methodNotAllowed, sendJson, uuidPattern } from "../api-utils.mjs";
import { backfillSiteContent } from "../site-content-backfill.mjs";

export default async function handler(request, response) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  try {
    const user = await getAuthenticatedUser(request);
    const siteId = String(request.query?.id || "");
    if (!uuidPattern.test(siteId)) return sendJson(response, 400, { error: "A valid site id is required." });
    const result = await backfillSiteContent({ siteId, userId: user.id });
    if (result.body.retry_after_seconds) response.setHeader("Retry-After", String(result.body.retry_after_seconds));
    return sendJson(response, result.status, result.body);
  } catch (error) {
    return handleKnownError(response, error, "[sites] Content translation backfill failed");
  }
}
