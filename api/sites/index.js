import { getAuthenticatedUser, getSupabaseClient, getUserPlan, handleKnownError, methodNotAllowed, sendJson } from "../../server/api-utils.mjs";

export default async function handler(request, response) {
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
  try {
    const user = await getAuthenticatedUser(request);
    const { data, error } = await getSupabaseClient()
      .from("sites")
      .select("id, slug, business_name, tone, primary_color, accent_color, headline, theme_config, previous_theme_config, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Failed to load owned sites: ${error.message}`);
    const plan = await getUserPlan(user.id);
    return sendJson(response, 200, { sites: (data || []).map((site) => ({ ...site, can_undo: Boolean(site.previous_theme_config), previous_theme_config: undefined })), plan });
  } catch (error) {
    return handleKnownError(response, error, "[sites] Owned site fetch failed");
  }
}
