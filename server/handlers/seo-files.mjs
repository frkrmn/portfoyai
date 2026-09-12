import { getSupabaseClient, handleKnownError, methodNotAllowed } from "../api-utils.mjs";

const xmlEscape = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]);
const requestOrigin = (request) => {
  const protocol = String(request.headers["x-forwarded-proto"] || "https").split(",")[0];
  const host = String(request.headers["x-forwarded-host"] || request.headers.host || "").split(",")[0];
  return `${protocol === "http" ? "http" : "https"}://${host}`;
};

export default async function handler(request, response) {
  if (request.method !== "GET" && request.method !== "HEAD") return methodNotAllowed(response, ["GET", "HEAD"]);
  try {
    const origin = requestOrigin(request);
    if (request.routedApiPath === "/api/robots.txt") {
      const body = `User-agent: *\nAllow: /site/\nDisallow: /dashboard\nDisallow: /preview/\nSitemap: ${origin}/sitemap.xml\n`;
      response.statusCode = 200; response.setHeader("Content-Type", "text/plain; charset=utf-8"); response.setHeader("Cache-Control", "public, s-maxage=300"); return response.end(request.method === "HEAD" ? "" : body);
    }
    const sitesResult = await getSupabaseClient().from("sites").select("id, slug, updated_at, theme_config").eq("status", "published");
    if (sitesResult.error) throw new Error(`Failed to build sitemap: ${sitesResult.error.message}`);
    const indexableSites = (sitesResult.data || []).filter((site) => site.theme_config?.seo?.robots_index !== false);
    const siteIds = indexableSites.map((site) => site.id);
    const listingsResult = siteIds.length ? await getSupabaseClient().from("listings").select("id, site_id, updated_at, seo").in("site_id", siteIds).eq("status", "active").eq("listing_status", "active") : { data: [], error: null };
    if (listingsResult.error) throw new Error(`Failed to build listing sitemap: ${listingsResult.error.message}`);
    const urls = [];
    for (const site of indexableSites) {
      const base = `${origin}/site/${site.slug}`;
      urls.push({ loc: base, modified: site.updated_at }, { loc: `${base}/listings`, modified: site.updated_at });
      for (const listing of listingsResult.data.filter((item) => item.site_id === site.id && item.seo?.robots_index !== false)) urls.push({ loc: `${base}/listings/${listing.id}`, modified: listing.updated_at });
    }
    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(({ loc, modified }) => `  <url><loc>${xmlEscape(loc)}</loc>${modified ? `<lastmod>${xmlEscape(new Date(modified).toISOString())}</lastmod>` : ""}</url>`).join("\n")}\n</urlset>\n`;
    response.statusCode = 200; response.setHeader("Content-Type", "application/xml; charset=utf-8"); response.setHeader("Cache-Control", "public, s-maxage=300"); return response.end(request.method === "HEAD" ? "" : body);
  } catch (error) {
    return handleKnownError(response, error, "[seo-files] Generation failed");
  }
}
