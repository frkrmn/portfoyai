import { getSupabaseClient, methodNotAllowed, routeParam, sendJson, serializeListing } from "../api-utils.mjs";

export default async function handler(request, response) {
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
  try {
    const slug = routeParam(request, "slug");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return sendJson(response, 400, { error: "A valid slug is required." });
    const { data: site, error } = await getSupabaseClient().from("sites").select("id, slug, theme_config, business_name, tone, primary_color, accent_color, headline, status, created_at").eq("slug", slug).maybeSingle();
    if (error) throw new Error(`Failed to load public site: ${error.message}`);
    if (!site) return sendJson(response, 404, { error: "Site not found." });
    const { data: listings, error: listingsError } = await getSupabaseClient().from("listings").select("*").eq("site_id", site.id).eq("status", "active").order("created_at", { ascending: false });
    if (listingsError) throw new Error(`Failed to load public listings: ${listingsError.message}`);
    return sendJson(response, 200, {
      id: site.id,
      slug: site.slug,
      config: { template_id: site.theme_config?.template_id, business_name: site.business_name, tone: site.tone, primary_color: site.primary_color, accent_color: site.accent_color, headline: site.headline, theme_config: site.theme_config },
      listings: (listings || []).map(serializeListing),
      status: site.status,
      created_at: site.created_at,
    });
  } catch (error) {
    console.error("[public-sites] Site fetch failed", error);
    return sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
}
