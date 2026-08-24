import { getAuthenticatedUser, getSessionId, getSupabaseClient, handleKnownError, methodNotAllowed, resolveSubscription, sendJson } from "../api-utils.mjs";

export default async function handler(request, response) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  try {
    const user = await getAuthenticatedUser(request);
    const sessionId = getSessionId(request);
    if (!sessionId) return sendJson(response, 400, { error: "Missing or invalid X-Session-ID header." });
    const { data: claimed, error: claimError } = await getSupabaseClient().from("sites").update({ user_id: user.id }).eq("session_id", sessionId).is("user_id", null).select("id");
    if (claimError) throw new Error(`Failed to claim guest sites: ${claimError.message}`);
    const { data: owned, error: ownedError } = await getSupabaseClient().from("sites").select("id").eq("session_id", sessionId).eq("user_id", user.id);
    if (ownedError) throw new Error(`Failed to verify claimed sites: ${ownedError.message}`);
    await resolveSubscription(request, response);
    return sendJson(response, 200, { claimedSiteIds: [...new Set([...(claimed || []), ...(owned || [])].map((site) => site.id))] });
  } catch (error) {
    return handleKnownError(response, error, "[auth] Guest site claim failed");
  }
}
