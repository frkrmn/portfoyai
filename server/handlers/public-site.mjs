import { getSupabaseClient, listingSelect, methodNotAllowed, routeParam, sendJson, serializeListing } from "../api-utils.mjs";

export async function loadPublicSite(slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("VALIDATION:A valid slug is required.");
  const { data: site, error } = await getSupabaseClient().from("sites").select("id, slug, theme_config, business_name, tone, primary_color, accent_color, headline, status, show_closed_listings, created_at").eq("slug", slug).maybeSingle();
  if (error) throw new Error(`Failed to load public site: ${error.message}`);
  if (!site) return null;
  let listingsQuery = getSupabaseClient().from("listings").select(listingSelect).eq("site_id", site.id).in("status", ["active", "sold"]);
  if (!site.show_closed_listings) listingsQuery = listingsQuery.eq("listing_status", "active");
  const { data: listings, error: listingsError } = await listingsQuery.order("created_at", { ascending: false });
  if (listingsError) throw new Error(`Failed to load public listings: ${listingsError.message}`);
  return {
    id: site.id,
    slug: site.slug,
    config: { template_id: site.theme_config?.template_id, business_name: site.business_name, tone: site.tone, primary_color: site.primary_color, accent_color: site.accent_color, headline: site.headline, theme_config: site.theme_config },
    listings: (listings || []).map(serializeListing),
    status: site.status,
    show_closed_listings: site.show_closed_listings === true,
    created_at: site.created_at,
  };
}

export default async function handler(request, response) {
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
  try {
    const slug = routeParam(request, "slug");
    const payload = await loadPublicSite(slug);
    if (!payload) return sendJson(response, 404, { error: "Site not found." });
    return sendJson(response, 200, payload);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("VALIDATION:")) return sendJson(response, 400, { error: error.message.slice("VALIDATION:".length) });
    console.error("[public-sites] Site fetch failed", error);
    return sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
}
