import { dashboardSite, getAuthenticatedUser, getSupabaseClient, handleKnownError, hexColorPattern, methodNotAllowed, readJsonBody, routeParam, sendJson, uuidPattern } from "../api-utils.mjs";
import { mergeThemeConfig } from "../site-theme.mjs";

const getSite = async (request, response, siteId) => {
  const user = await getAuthenticatedUser(request);
  const { data: site, error } = await getSupabaseClient().from("sites").select("id, slug, user_id, theme_config, business_name, tone, primary_color, accent_color, headline, status, show_closed_listings, show_team_section, team_section_label, country_id, province_id, district_id, neighborhood_id, created_at").eq("id", siteId).eq("user_id", user.id).maybeSingle();
  if (error) throw new Error(`Failed to load site: ${error.message}`);
  if (!site) return sendJson(response, 404, { error: "Site not found." });
  return sendJson(response, 200, {
    id: site.id,
    slug: site.slug,
    config: { template_id: site.theme_config?.template_id, business_name: site.business_name, tone: site.tone, primary_color: site.primary_color, accent_color: site.accent_color, headline: site.headline },
    status: site.status,
    show_closed_listings: site.show_closed_listings === true,
    show_team_section: site.show_team_section === true,
    team_section_label: site.team_section_label || null,
    is_owner: Boolean(user && site.user_id === user.id),
    created_at: site.created_at,
  });
};

const updateSite = async (request, response, siteId) => {
  const user = await getAuthenticatedUser(request);
  const body = await readJsonBody(request);
  const { data: current, error: currentError } = await getSupabaseClient().from("sites").select("id, theme_config").eq("id", siteId).eq("user_id", user.id).maybeSingle();
  if (currentError) throw new Error(`Failed to verify site ownership: ${currentError.message}`);
  if (!current) return sendJson(response, 404, { error: "Owned site not found." });
  const updates = {};
  const themePatch = {};
  if (body.status !== undefined) {
    if (!["draft", "published"].includes(body.status)) return sendJson(response, 400, { error: "Status must be draft or published." });
    updates.status = body.status;
  }
  if (body.show_closed_listings !== undefined) {
    if (typeof body.show_closed_listings !== "boolean") return sendJson(response, 400, { error: "show_closed_listings must be boolean." });
    updates.show_closed_listings = body.show_closed_listings;
  }
  if (body.show_team_section !== undefined) {
    if (typeof body.show_team_section !== "boolean") return sendJson(response, 400, { error: "show_team_section must be boolean." });
    updates.show_team_section = body.show_team_section;
  }
  if (body.team_section_label !== undefined) {
    const value = String(body.team_section_label || "").trim();
    if (value.length > 120) return sendJson(response, 400, { error: "Team section label must be at most 120 characters." });
    updates.team_section_label = value || null;
  }
  if (body.business_name !== undefined) {
    const value = String(body.business_name).trim();
    if (!value || value.length > 160) return sendJson(response, 400, { error: "Business name is required and must be at most 160 characters." });
    themePatch.business_name = value;
  }
  if (body.headline !== undefined) {
    const value = String(body.headline).trim();
    if (!value || value.length > 240) return sendJson(response, 400, { error: "Headline is required and must be at most 240 characters." });
    themePatch.headline = value;
  }
  if (body.tone !== undefined) {
    const value = String(body.tone).trim();
    if (value.length > 500) return sendJson(response, 400, { error: "Description must be at most 500 characters." });
    themePatch.tone = value;
  }
  for (const key of ["phone", "email", "address"]) {
    if (body[key] !== undefined) {
      const value = String(body[key]).trim();
      if (value.length > 240) return sendJson(response, 400, { error: `${key} must be at most 240 characters.` });
      themePatch[key] = value;
    }
  }
  if (body.region_focus !== undefined) themePatch.region_focus = body.region_focus;
  for (const key of ["country_id", "province_id", "district_id", "neighborhood_id"]) {
    if (body[key] === undefined) continue;
    const value = body[key] == null || body[key] === "" ? null : String(body[key]);
    if (value && !uuidPattern.test(value)) return sendJson(response, 400, { error: `${key} must be a valid id.` });
    updates[key] = value;
  }
  if (body.primary_color !== undefined) {
    if (!hexColorPattern.test(body.primary_color)) return sendJson(response, 400, { error: "Primary color must be a six-digit hex color." });
    themePatch.primary_color = body.primary_color;
  }
  if (body.accent_color !== undefined) {
    if (!hexColorPattern.test(body.accent_color)) return sendJson(response, 400, { error: "Accent color must be a six-digit hex color." });
    themePatch.accent_color = body.accent_color;
  }
  if (body.buttonColorSource !== undefined) themePatch.buttonColorSource = body.buttonColorSource;
  if (body.buttonColorCustom !== undefined) themePatch.buttonColorCustom = body.buttonColorCustom;
  if (body.heading_font !== undefined) {
    const value = String(body.heading_font).trim();
    if (!value || value.length > 160) return sendJson(response, 400, { error: "Heading font is invalid." });
    themePatch.heading_font = value;
  }
  if (body.body_font !== undefined) {
    const value = String(body.body_font).trim();
    if (!value || value.length > 160) return sendJson(response, 400, { error: "Body font is invalid." });
    themePatch.body_font = value;
  }
  for (const key of ["heading_weight", "body_weight", "heading_italic", "body_italic"]) {
    if (body[key] !== undefined) themePatch[key] = body[key];
  }
  if (Object.keys(updates).length === 0 && Object.keys(body).length === 0) return sendJson(response, 400, { error: "No site changes were supplied." });
  const { themeConfig, topLevel } = mergeThemeConfig(current.theme_config, themePatch);
  Object.assign(updates, topLevel, { theme_config: themeConfig });
  const { data: site, error } = await getSupabaseClient().from("sites").update(updates).eq("id", siteId).eq("user_id", user.id).select("id, slug, business_name, tone, primary_color, accent_color, headline, theme_config, previous_theme_config, status, show_closed_listings, show_team_section, team_section_label, country_id, province_id, district_id, neighborhood_id, created_at").maybeSingle();
  if (error) throw new Error(`Failed to update site: ${error.message}`);
  if (!site) return sendJson(response, 404, { error: "Owned site not found." });
  return sendJson(response, 200, { site: dashboardSite(site) });
};

export default async function handler(request, response) {
  if (!["GET", "PATCH"].includes(request.method || "")) return methodNotAllowed(response, ["GET", "PATCH"]);
  const siteId = routeParam(request, "id");
  if (!uuidPattern.test(siteId)) return sendJson(response, 400, { error: "A valid site id is required." });
  try {
    return request.method === "GET" ? await getSite(request, response, siteId) : await updateSite(request, response, siteId);
  } catch (error) {
    return handleKnownError(response, error, request.method === "GET" ? "[sites] Site fetch failed" : "[sites] Site update failed");
  }
}
