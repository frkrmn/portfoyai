import { GoogleGenAI } from "@google/genai";
import { getSupabaseClient, handleKnownError, methodNotAllowed, routeParam, sendJson } from "../api-utils.mjs";
import { buildContentTranslationRequest, contentBackfillInstruction, mergeTranslatedContent, needsContentEnglishBackfill } from "../site-content-i18n.mjs";
import { siteConfigModel } from "./generate-theme.mjs";

const version = 2;
const activeWindowMs = 5 * 60 * 1000;

export async function backfillPublicSiteContent(slug, { supabase = getSupabaseClient(), generate, siteId, userId } = {}) {
  let lookup = supabase.from("sites").select("id, slug, status, theme_config");
  lookup = siteId && userId ? lookup.eq("id", siteId).eq("user_id", userId) : lookup.eq("slug", slug);
  const result = await lookup.maybeSingle();
  if (result.error) throw new Error(`Failed to load site for content translation: ${result.error.message}`);
  const site = result.data;
  if (!site || (!siteId && site.status !== "published")) return { status: 404, body: { error: siteId ? "Owned site not found." : "Published site not found." } };
  const metadata = site.theme_config?.site_content_i18n;
  if (!needsContentEnglishBackfill(site.theme_config?.content)) return { status: 200, body: { backfilled: false, cached: true, theme_config: site.theme_config } };
  if (metadata?.status === "translating" && Date.now() - Date.parse(metadata.started_at || 0) < activeWindowMs) return { status: 202, body: { backfilled: false, cached: false, pending: true } };
  if (!process.env.GEMINI_API_KEY && !generate) throw new Error("GEMINI_API_KEY environment variable is not set.");

  const translatingTheme = { ...site.theme_config, site_content_i18n: { version, status: "translating", started_at: new Date().toISOString() } };
  const claim = await supabase.from("sites").update({ theme_config: translatingTheme }).eq("id", site.id).eq("theme_config", site.theme_config).select("id").maybeSingle();
  if (claim.error) throw new Error(`Failed to claim content translation: ${claim.error.message}`);
  if (!claim.data) return { status: 202, body: { backfilled: false, cached: false, pending: true } };
  const { source, responseSchema } = buildContentTranslationRequest(site.theme_config.content);
  try {
    const generated = generate ? await generate({ source, responseSchema }) : await new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }).models.generateContent({
      model: siteConfigModel,
      contents: `TURKISH CONTENT:\n${JSON.stringify(source)}`,
      config: { systemInstruction: contentBackfillInstruction, responseMimeType: "application/json", responseSchema },
    });
    const parsed = typeof generated === "string" ? JSON.parse(generated) : JSON.parse(generated.text || "{}");
    const content = mergeTranslatedContent(site.theme_config.content, parsed.content);
    const themeConfig = { ...site.theme_config, content, site_content_i18n: { version, status: "complete", completed_at: new Date().toISOString() } };
    const saved = await supabase.from("sites").update({ theme_config: themeConfig }).eq("id", site.id).select("theme_config").single();
    if (saved.error) throw new Error(`Failed to cache translated content: ${saved.error.message}`);
    return { status: 200, body: { backfilled: true, cached: false, theme_config: saved.data.theme_config } };
  } catch (error) {
    const retryTheme = { ...site.theme_config, site_content_i18n: { version, status: "failed", failed_at: new Date().toISOString() } };
    await supabase.from("sites").update({ theme_config: retryTheme }).eq("id", site.id);
    throw error;
  }
}

export default async function handler(request, response) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  try {
    const slug = routeParam(request, "slug");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return sendJson(response, 400, { error: "A valid slug is required." });
    const result = await backfillPublicSiteContent(slug);
    return sendJson(response, result.status, result.body);
  } catch (error) {
    return handleKnownError(response, error, "[public-sites] Content translation backfill failed");
  }
}
