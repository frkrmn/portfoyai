import { dashboardSite, getAuthenticatedUser, getSupabaseClient, getUserPlan, handleKnownError, methodNotAllowed, sendJson } from "../api-utils.mjs";
import { siteSelect } from "../site-source-of-truth.mjs";
import { accessibleSiteIds } from "../workspace-permissions.mjs";

export default async function handler(request, response) {
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
  try {
    const user = await getAuthenticatedUser(request);
    const siteIds = await accessibleSiteIds(user.id);
    if (!siteIds.length) return sendJson(response, 200, { sites: [], plan: await getUserPlan(user.id) });
    const { data, error } = await getSupabaseClient().from("sites").select(siteSelect).in("id", siteIds).order("created_at", { ascending: false });
    if (error) throw new Error(`Failed to load owned sites: ${error.message}`);
    const plan = await getUserPlan(user.id);
    return sendJson(response, 200, { sites: (data || []).map(dashboardSite), plan });
  } catch (error) {
    return handleKnownError(response, error, "[sites] Owned site fetch failed");
  }
}
