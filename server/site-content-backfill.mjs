import { GoogleGenAI } from "@google/genai";
import { getSupabaseClient } from "./api-utils.mjs";
import { buildContentTranslationRequest, contentBackfillInstruction, mergeTranslatedContent, needsContentEnglishBackfill } from "./site-content-i18n.mjs";
import { siteConfigModel } from "./handlers/generate-theme.mjs";

const version = 3;
const activeWindowMs = 5 * 60 * 1000;
const quotaWindowMs = 24 * 60 * 60 * 1000;
export const contentBackfillDailyQuota = 3;

const timestamp = (value) => {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
};

export async function backfillSiteContent({ siteId, userId, supabase = getSupabaseClient(), generate, now = () => new Date() }) {
  const result = await supabase.from("sites").select("id, theme_config").eq("id", siteId).eq("user_id", userId).maybeSingle();
  if (result.error) throw new Error(`Failed to load site for content translation: ${result.error.message}`);
  const site = result.data;
  if (!site) return { status: 404, body: { error: "Owned site not found." } };
  const metadata = site.theme_config?.site_content_i18n || {};
  if (!needsContentEnglishBackfill(site.theme_config?.content)) return { status: 200, body: { backfilled: false, cached: true, theme_config: site.theme_config } };

  const currentTime = now();
  const currentMs = currentTime.getTime();
  if (metadata.status === "translating" && currentMs - timestamp(metadata.started_at) < activeWindowMs) {
    const retryAfter = Math.max(1, Math.ceil((activeWindowMs - (currentMs - timestamp(metadata.started_at))) / 1000));
    return { status: 202, body: { backfilled: false, cached: false, pending: true, retry_after_seconds: retryAfter, translation: metadata } };
  }

  const windowStartedMs = timestamp(metadata.window_started_at);
  const sameWindow = windowStartedMs > 0 && currentMs - windowStartedMs < quotaWindowMs;
  const attempts = sameWindow ? Number(metadata.attempts || 0) : 0;
  if (attempts >= contentBackfillDailyQuota) {
    const retryAfter = Math.max(1, Math.ceil((quotaWindowMs - (currentMs - windowStartedMs)) / 1000));
    console.warn(`[site-content-backfill] quota_exceeded site=${site.id} attempts=${attempts} retry_after=${retryAfter}`);
    return { status: 429, body: { error: "Daily translation quota exceeded.", retry_after_seconds: retryAfter, translation: metadata } };
  }
  if (!process.env.GEMINI_API_KEY && !generate) throw new Error("GEMINI_API_KEY environment variable is not set.");

  const startedAt = currentTime.toISOString();
  const translation = { version, status: "translating", attempts: attempts + 1, window_started_at: sameWindow ? metadata.window_started_at : startedAt, started_at: startedAt, last_error: null };
  const translatingTheme = { ...site.theme_config, site_content_i18n: translation };
  const claim = await supabase.from("sites").update({ theme_config: translatingTheme }).eq("id", site.id).eq("theme_config", site.theme_config).select("id").maybeSingle();
  if (claim.error) throw new Error(`Failed to claim content translation: ${claim.error.message}`);
  if (!claim.data) return { status: 202, body: { backfilled: false, cached: false, pending: true, retry_after_seconds: 2 } };
  console.info(`[site-content-backfill] started site=${site.id} attempt=${translation.attempts}/${contentBackfillDailyQuota}`);

  const { source, responseSchema } = buildContentTranslationRequest(site.theme_config.content);
  try {
    const generated = generate ? await generate({ source, responseSchema }) : await new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }).models.generateContent({
      model: siteConfigModel,
      contents: `TURKISH CONTENT:\n${JSON.stringify(source)}`,
      config: { systemInstruction: contentBackfillInstruction, responseMimeType: "application/json", responseSchema },
    });
    const parsed = typeof generated === "string" ? JSON.parse(generated) : JSON.parse(generated.text || "{}");
    const content = mergeTranslatedContent(site.theme_config.content, parsed.content);
    const completedAt = now().toISOString();
    const themeConfig = { ...site.theme_config, content, site_content_i18n: { ...translation, status: "complete", completed_at: completedAt } };
    const saved = await supabase.from("sites").update({ theme_config: themeConfig }).eq("id", site.id).select("theme_config").single();
    if (saved.error) throw new Error(`Failed to cache translated content: ${saved.error.message}`);
    console.info(`[site-content-backfill] completed site=${site.id} attempt=${translation.attempts}`);
    return { status: 200, body: { backfilled: true, cached: false, theme_config: saved.data.theme_config } };
  } catch (error) {
    const message = (error instanceof Error ? error.message : String(error)).slice(0, 240);
    const failedTheme = { ...site.theme_config, site_content_i18n: { ...translation, status: "failed", failed_at: now().toISOString(), last_error: message } };
    await supabase.from("sites").update({ theme_config: failedTheme }).eq("id", site.id);
    console.error(`[site-content-backfill] failed site=${site.id} attempt=${translation.attempts} error=${message}`);
    throw error;
  }
}
