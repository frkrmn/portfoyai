import { getAuthenticatedUser, getSupabaseClient, handleKnownError, methodNotAllowed, readJsonBody, routeParam, sendJson, uuidPattern, dashboardSite } from "../api-utils.mjs";
import { auditPublishQuality } from "../../src/lib/publish-quality.mjs";

export default async function handler(request, response) {
  if (!["GET", "POST"].includes(request.method || "")) return methodNotAllowed(response, ["GET", "POST"]);
  try {
    const user = await getAuthenticatedUser(request);
    const siteId = routeParam(request, "id");
    if (!uuidPattern.test(siteId)) return sendJson(response, 400, { error: "A valid site id is required." });
    const supabase = getSupabaseClient();
    const { data: owned, error: ownershipError } = await supabase.from("sites").select("*").eq("id", siteId).eq("user_id", user.id).maybeSingle();
    if (ownershipError) throw ownershipError;
    if (!owned) return sendJson(response, 404, { error: "Owned site not found." });
    if (request.method === "GET") {
      const { data, error } = await supabase.from("site_versions").select("id,version,created_at,published_by").eq("site_id", siteId).order("version", { ascending: false });
      if (error) throw error;
      return sendJson(response, 200, { versions: data || [] });
    }
    const body = await readJsonBody(request);
    const action = routeParam(request, "action");
    if (action !== "rollback") {
      const { data: listings, error: listingsError } = await supabase.from("listings").select("id,status,listing_status,media").eq("site_id", siteId);
      if (listingsError) throw listingsError;
      const quality = auditPublishQuality({ site: dashboardSite(owned), listings: listings || [] });
      if (!quality.canPublish) return sendJson(response, 422, { error: "Yayın öncesi kritik eksikleri tamamlayın.", code: "PUBLISH_QUALITY_BLOCKED", quality });
    }
    const rpc = action === "rollback" ? "rollback_site_version" : "publish_site_version";
    const args = action === "rollback"
      ? { p_site_id: siteId, p_user_id: user.id, p_version: Number(body.version) }
      : { p_site_id: siteId, p_user_id: user.id, p_expected_revision: Number(body.expected_revision) };
    const { data, error } = await supabase.rpc(rpc, args);
    if (error?.message?.includes("REVISION_CONFLICT")) return sendJson(response, 409, { error: "Draft changed in another session.", code: "REVISION_CONFLICT" });
    if (error?.message?.includes("VERSION_NOT_FOUND")) return sendJson(response, 404, { error: "Version not found." });
    if (error) throw error;
    return sendJson(response, 200, { site: dashboardSite(data), action, version: data.published_version });
  } catch (error) {
    return handleKnownError(response, error, "[site-versions] Request failed");
  }
}
