import { dashboardSite, getAuthenticatedUser, getSupabaseClient, handleKnownError, hexColorPattern, methodNotAllowed, readJsonBody, routeParam, sanitizeSeo, sendJson, uuidPattern } from "../api-utils.mjs";
import { mergeThemeConfig, switchTemplateConfig } from "../site-theme.mjs";
import { buildThemeSelectionContext } from "../../src/lib/theme-selection.mjs";
import { removeReplacedMedia } from "../media-storage.mjs";
import { siteSelect } from "../site-source-of-truth.mjs";

const getSite = async (request, response, siteId) => {
  const user = await getAuthenticatedUser(request);
  const { data: site, error } = await getSupabaseClient().from("sites").select(siteSelect).eq("id", siteId).eq("user_id", user.id).maybeSingle();
  if (error) throw new Error(`Failed to load site: ${error.message}`);
  if (!site) return sendJson(response, 404, { error: "Site not found." });
  const projected = dashboardSite(site);
  return sendJson(response, 200, { ...projected, config: { template_id: projected.theme_config?.template_id, business_name: projected.business_name, tone: projected.tone, primary_color: projected.primary_color, accent_color: projected.accent_color, headline: projected.headline }, is_owner: true });
};

const updateSite = async (request, response, siteId) => {
  const user = await getAuthenticatedUser(request);
  // Site media follows the existing listing/team data-URL upload pattern.
  // Four 1.5 MB gallery images expand to roughly 8 MB after base64 encoding.
  const body = await readJsonBody(request, 12 * 1024 * 1024);
  const { data: current, error: currentError } = await getSupabaseClient().from("sites").select("id, theme_config, previous_theme_config, draft_revision").eq("id", siteId).eq("user_id", user.id).maybeSingle();
  if (currentError) throw new Error(`Failed to verify site ownership: ${currentError.message}`);
  if (!current) return sendJson(response, 404, { error: "Owned site not found." });
  const updates = {};
  const themePatch = {};
  if (body.language !== undefined) themePatch.language = body.language;
  if (body.status !== undefined) {
    if (body.status !== "draft") return sendJson(response, 400, { error: "Use the publish endpoint to publish." });
    updates.status = "draft";
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
  if (body.map_url !== undefined) {
    const value = String(body.map_url || "").trim();
    if (value.length > 1000) return sendJson(response, 400, { error: "Map URL must be at most 1000 characters." });
    if (value) {
      try {
        const url = new URL(value);
        if (!["http:", "https:"].includes(url.protocol)) throw new Error();
      } catch {
        return sendJson(response, 400, { error: "Map URL must be a valid http or https URL." });
      }
    }
    themePatch.map_url = value;
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
  if (body.content !== undefined) themePatch.content = body.content;
  if (body.media !== undefined) themePatch.media = body.media;
  if (body.seo !== undefined) themePatch.seo = sanitizeSeo(body.seo);
  if (Object.keys(updates).length === 0 && Object.keys(body).length === 0) return sendJson(response, 400, { error: "No site changes were supplied." });
  if (body.restore_previous_template === true && !current.previous_theme_config) return sendJson(response, 409, { error: "No previous design is available." });
  const baseThemeConfig = body.restore_previous_template === true ? current.previous_theme_config : current.theme_config;
  const { themeConfig: mergedThemeConfig, topLevel } = mergeThemeConfig(baseThemeConfig, themePatch);
  const themeConfig = body.template_id !== undefined ? switchTemplateConfig(mergedThemeConfig, String(body.template_id)) : mergedThemeConfig;
  if (body.template_id !== undefined) themeConfig.selection_context = buildThemeSelectionContext("", String(body.template_id), { audience: current.theme_config?.selection_context?.audience, region: current.theme_config?.selection_context?.region });
  if (body.template_id !== undefined && body.template_id !== current.theme_config?.template_id) updates.previous_theme_config = current.theme_config;
  if (body.restore_previous_template === true) updates.previous_theme_config = null;
  Object.assign(updates, topLevel, { theme_config: themeConfig, draft_revision: Number(current.draft_revision || 1) + 1 });
  let query = getSupabaseClient().from("sites").update(updates).eq("id", siteId).eq("user_id", user.id);
  if (body.expected_revision !== undefined) query = query.eq("draft_revision", Number(body.expected_revision));
  const { data: site, error } = await query.select(siteSelect).maybeSingle();
  if (error) throw new Error(`Failed to update site: ${error.message}`);
  if (!site) return sendJson(response, 409, { error: "Draft changed in another session.", code: "REVISION_CONFLICT" });
  await removeReplacedMedia(current.theme_config?.media, site.theme_config?.media);
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
