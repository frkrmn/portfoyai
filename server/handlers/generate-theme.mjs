import { readFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";
import { insertGeneratedSite } from "../site-persistence.mjs";
import { getAuthenticatedUser, getSupabaseClient, handleKnownError, methodNotAllowed, readJsonBody, sendJson } from "../api-utils.mjs";

export const siteConfigSchema = JSON.parse(readFileSync(new URL("../site-config.schema.json", import.meta.url), "utf8"));
export const siteConfigModel = "gemini-3.5-flash-lite";
export const siteConfigSystemPrompt = [
  "You are the brand design engine for Fastate AI, a premium Turkish real-estate website builder.",
  "Convert the user's description into one confident website identity.",
  "Return only the JSON object required by the supplied schema.",
  "Do not return layout_fine_tune during initial generation. That optional object is reserved exclusively for later authenticated refinement requests, so every template must initially keep its established visual defaults.",
  "The headline must be polished Turkish and no longer than 12 words.",
  "Set region_focus to a concise comma-separated list of the Turkish city, district or neighborhood names the business serves, inferred from the user's description.",
  "Use sophisticated, accessible colors with strong text contrast. Avoid generic bright SaaS gradients.",
  "Choose exactly one internal template_id using these distinct style rules:",
  "- warm-editorial: warm, editorial and lifestyle-led; italic serif headlines, cream/beige tones, generous photographic layouts. Prefer this for boutique residential portfolios and personal agent brands that emphasize warmth, story and curation.",
  "- bold-luxury: bold, dark and architectural luxury; near-black backgrounds, oversized display-serif headlines, cinematic property photography and restrained gold accents. Prefer this for upper-segment or prestigious residential portfolios and agents seeking a strong upscale brand impression.",
  "- clean-modern: clean, functional and information-dense; white surfaces, simple sans-serif typography, practical search controls and easy-to-scan listing grids. Prefer this for agents who want a no-frills, neutral, easy-to-browse site, and use it as the safe neutral option when the prompt does not strongly signal another style.",
  "- neighborhood-friendly: warm, personal and neighborhood-focused; soft rounded shapes, conversational language and community-led browsing. Prefer this for independent agents who specialize in one or a few specific districts and want to feel like an approachable local expert rather than a large agency or generic listing portal.",
  "- investment-focused: data-driven, analytical and professional; metrics-first layouts, rental yield, ROI, price trends and compact comparison tools take priority over lifestyle imagery. Prefer this for agents or consultants who primarily serve property investors rather than homebuyers.",
  "- urgent-deals: urgent, deal-focused and fast-scanning; high-contrast opportunity badges, price reductions and quick-sale signals take priority over lifestyle storytelling or investment-yield analysis. Prefer this for agents specializing in urgent sales, price-reduced listings, foreclosures or other time-sensitive opportunities aimed at bargain-focused buyers.",
  "- guided-match: warm, personal and guided-discovery-led; a short preference intake is the primary discovery mechanism instead of a standard filter bar, listing portal or neighborhood-card browser. Prefer this for thoughtful, patient agents who want to understand each client and guide them toward the right home like a personal matchmaker.",
  "- tm_01: understated brand-led minimal; sparse presentation, ample whitespace and neutral colors. Use only when the user explicitly asks for a highly minimal, low-density identity rather than a practical listing-first experience.",
  "- tm_02: established traditional/classic; formal, dependable and heritage-oriented rather than editorial or boutique.",
  "- tm_03: polished contemporary prestige with a lighter presentation; use it only when the user wants premium positioning but not a dark, bold or architectural identity.",
  "- tm_04: crisp corporate; structured, efficient and businesslike. Prefer this for commercial real estate, corporate teams and operational clarity.",
  "Select from the user's stated positioning; do not default to warm-editorial, bold-luxury, urgent-deals or guided-match. Distinguish guided-match (preference intake and personal guidance) from neighborhood-friendly (district-led browsing and local community expertise) and warm-editorial (curated lifestyle storytelling). Distinguish urgent-deals (speed, reduced prices, quick decisions) from investment-focused (yield, ROI, analytical returns). When the user explicitly says they have no special style preference or asks for a standard/general-purpose site, select clean-modern.",
  "When and only when neighborhood-friendly is selected, populate content.neighborhoods with 2 to 4 relevant Turkish neighborhood or district names and one short, friendly Turkish description for each. Every place explicitly named by the user must appear first and verbatim before adding nearby neighborhoods: never expand, rename or qualify it (for example, Kadıköy must remain exactly Kadıköy, not Kadıköy Merkez). If none are named, choose reasonable neighborhoods for the user's city.",
  "When and only when guided-match is selected, populate content.feelings with 3 to 5 short Turkish home-feeling preferences (for example sakin, enerjik, aile dostu) and content.timings with 3 to 5 short Turkish moving-time choices. These are private matching-intake options, not template names or neighborhood browsing cards.",
  "Do not inspect files, call tools, or modify anything.",
].join("\n");

const adminEmails = () => new Set(
  String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLocaleLowerCase("en-US"))
    .filter(Boolean),
);

const existingSiteResponse = (response, site) => sendJson(response, 409, {
  error: "Zaten bir siteniz var, buradan düzenleyebilirsiniz.",
  code: "SITE_LIMIT_REACHED",
  existing_site: { id: site.id, slug: site.slug },
  redirect_path: `/dashboard?site=${site.id}`,
});

export default async function handler(request, response) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  try {
    const user = await getAuthenticatedUser(request);
    const body = await readJsonBody(request);
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (prompt.length < 10) return sendJson(response, 400, { error: "Please describe the real-estate business in at least 10 characters." });
    const isAdmin = adminEmails().has(String(user.email || "").toLocaleLowerCase("en-US"));
    if (!isAdmin) {
      const existing = await getSupabaseClient()
        .from("sites")
        .select("id, slug")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing.error) throw new Error(`Failed to check existing site ownership: ${existing.error.message}`);
      if (existing.data) return existingSiteResponse(response, existing.data);
    }
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY environment variable is not set.");

    const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.info(`[generate-theme] Starting Gemini generation with ${siteConfigModel}`);
    const startedAt = Date.now();
    const result = await gemini.models.generateContent({
      model: siteConfigModel,
      contents: `USER BUSINESS DESCRIPTION:\n${prompt}`,
      config: { systemInstruction: siteConfigSystemPrompt, responseMimeType: "application/json", responseSchema: siteConfigSchema },
    });
    if (!result.text) throw new Error("Gemini returned an empty response.");
    const config = JSON.parse(result.text);
    const model = result.modelVersion || siteConfigModel;
    console.info(`[generate-theme] Gemini structured response received in ${Date.now() - startedAt}ms; model=${model}`);
    let site;
    try {
      site = await insertGeneratedSite(getSupabaseClient(), config, user.id, { siteLimitExempt: isAdmin });
    } catch (error) {
      if (!isAdmin && error instanceof Error && error.message === "SITE_LIMIT_REACHED") {
        const existing = await getSupabaseClient().from("sites").select("id, slug").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (existing.error) throw new Error(`Failed to resolve existing site after a concurrent generation: ${existing.error.message}`);
        if (existing.data) return existingSiteResponse(response, existing.data);
      }
      throw error;
    }
    return sendJson(response, 200, {
      config,
      site_id: site.id,
      slug: site.slug,
      public_path: `/site/${site.slug}`,
      starter_listings_count: site.starterListingsCount,
      starter_metrics_storage: site.metricsStorage,
      meta: { provider: "gemini", model },
    });
  } catch (error) {
    return handleKnownError(response, error, "[generate-theme] Generation failed");
  }
}
