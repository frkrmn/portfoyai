import { getSupabaseClient, methodNotAllowed, routeParam, sendJson, serializeListing, uuidPattern } from "../api-utils.mjs";

export const publicListingSelect = "id,title,description,price,currency,m2,room_count,listing_type,district,lat,lng,media,status,listing_status,property_category,property_subtype,created_at,features,country:countries(name),province:provinces(name),structured_district:districts(name),neighborhood:neighborhoods(name)";
const publicThemeKeys = ["template_id", "language", "colors", "fonts", "content", "media", "layout", "layout_fine_tune"];
const withoutInlineImages = (value) => {
  if (typeof value === "string") return value.startsWith("data:image/") ? "" : value;
  if (Array.isArray(value)) return value.map(withoutInlineImages).filter((item) => item !== "");
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, withoutInlineImages(item)]));
  return value;
};

export const publicThemeConfig = (themeConfig) => Object.fromEntries(publicThemeKeys
  .filter((key) => themeConfig?.[key] !== undefined)
  .map((key) => [key, withoutInlineImages(themeConfig[key])]));

export const serializePublicListing = (row) => {
  const listing = serializeListing(row);
  for (const key of ["site_id", "country_id", "province_id", "district_id", "neighborhood_id", "status"]) delete listing[key];
  listing.media = listing.media.filter((item) => !item?.url?.startsWith("data:image/")).map(withoutInlineImages);
  return listing;
};

export async function loadPublicSite(slug, options = {}) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("VALIDATION:A valid slug is required.");
  const { data: site, error } = await getSupabaseClient().from("sites").select("id, slug, theme_config, business_name, tone, primary_color, accent_color, headline, show_closed_listings, show_team_section, team_section_label").eq("slug", slug).maybeSingle();
  if (error) throw new Error(`Failed to load public site: ${error.message}`);
  if (!site) return null;
  let listingsQuery = getSupabaseClient().from("listings").select(publicListingSelect).eq("site_id", site.id).in("status", ["active", "sold"]);
  if (!site.show_closed_listings) listingsQuery = listingsQuery.eq("listing_status", "active");
  if (options.listingId) listingsQuery = listingsQuery.eq("id", options.listingId);
  const teamQuery = site.show_team_section
    ? getSupabaseClient().from("team_members").select("id, name, role, bio, photo_url, sort_order").eq("site_id", site.id).order("sort_order")
    : Promise.resolve({ data: [], error: null });
  const [{ data: listings, error: listingsError }, { data: teamRows, error: teamError }] = await Promise.all([
    listingsQuery.order("created_at", { ascending: false }),
    teamQuery,
  ]);
  if (listingsError) throw new Error(`Failed to load public listings: ${listingsError.message}`);
  if (teamError) throw new Error(`Failed to load public team members: ${teamError.message}`);
  const teamMembers = (teamRows || []).map(withoutInlineImages);
  return {
    id: site.id,
    slug: site.slug,
    language: site.theme_config?.language === "en" ? "en" : "tr",
    config: { template_id: site.theme_config?.template_id, business_name: site.business_name, tone: site.tone, primary_color: site.primary_color, accent_color: site.accent_color, headline: site.headline, theme_config: publicThemeConfig(site.theme_config) },
    listings: (listings || []).map(serializePublicListing),
    show_closed_listings: site.show_closed_listings === true,
    show_team_section: site.show_team_section === true,
    team_section_label: site.team_section_label || null,
    team_members: teamMembers,
  };
}

export default async function handler(request, response) {
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
  try {
    const slug = routeParam(request, "slug");
    const listingId = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`).searchParams.get("listingId");
    if (listingId && !uuidPattern.test(listingId)) return sendJson(response, 400, { error: "A valid listing id is required." });
    const payload = await loadPublicSite(slug, { listingId });
    if (!payload) return sendJson(response, 404, { error: "Site not found." });
    response.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    response.setHeader("Server-Timing", `payload;desc=${Buffer.byteLength(JSON.stringify(payload))}`);
    return sendJson(response, 200, payload);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("VALIDATION:")) return sendJson(response, 400, { error: error.message.slice("VALIDATION:".length) });
    console.error("[public-sites] Site fetch failed", error);
    return sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
}
