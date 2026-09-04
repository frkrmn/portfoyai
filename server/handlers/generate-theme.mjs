import { readFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";
import { adminEmails } from "../admin-auth.mjs";
import { insertGeneratedSite } from "../site-persistence.mjs";
import { getAuthenticatedUser, getSupabaseClient, handleKnownError, methodNotAllowed, readJsonBody, sendJson } from "../api-utils.mjs";

export const siteConfigSchema = JSON.parse(readFileSync(new URL("../site-config.schema.json", import.meta.url), "utf8"));
export const siteConfigModel = "gemini-3.5-flash-lite";
export const siteConfigSystemPrompt = [
  "You are the brand design engine for Fastate AI, a premium Turkish real-estate website builder.",
  "Convert the user's description into one confident website identity.",
  "Return only the JSON object required by the supplied schema.",
  "Do not return layout_fine_tune during initial generation. That optional object is reserved exclusively for later authenticated refinement requests, so every template must initially keep its established visual defaults.",
  "For every localized text object, return both tr and en in this same single response. Turkish must be polished and English must be a natural market-appropriate adaptation, never a literal word-for-word translation.",
  "The Turkish and English headlines must each be no longer than 12 words.",
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
  "- land-plots: land/plot-focused, professional and consultancy-led; navy and muted-green restraint, generous whitespace, zoning/type-led portfolio cards and a visible expert team. Prefer this for agents or consultancies specializing in arsa, tarla, imarlı land or plot sales rather than residential housing.",
  "- tm_01: understated brand-led minimal; sparse presentation, ample whitespace and neutral colors. Use only when the user explicitly asks for a highly minimal, low-density identity rather than a practical listing-first experience.",
  "- tm_02: established traditional/classic; formal, dependable and heritage-oriented rather than editorial or boutique.",
  "- tm_03: polished contemporary prestige with a lighter presentation; use it only when the user wants premium positioning but not a dark, bold or architectural identity.",
  "- tm_04: crisp corporate; structured, efficient and businesslike. Prefer this for commercial real estate, corporate teams and operational clarity.",
  "Select from the user's stated positioning; do not default to warm-editorial, bold-luxury, urgent-deals or guided-match. Distinguish guided-match (preference intake and personal guidance) from neighborhood-friendly (district-led browsing and local community expertise) and warm-editorial (curated lifestyle storytelling). Distinguish urgent-deals (speed, reduced prices, quick decisions) from investment-focused (yield, ROI, analytical returns). When the user explicitly says they have no special style preference or asks for a standard/general-purpose site, select clean-modern.",
  "When and only when neighborhood-friendly is selected, populate content.neighborhoods with 2 to 4 relevant neighborhood or district names and localized tr/en descriptions. Every place explicitly named by the user must appear first and verbatim before adding nearby neighborhoods: never expand, rename or qualify it (for example, Kadıköy must remain exactly Kadıköy, not Kadıköy Merkez). If none are named, choose reasonable neighborhoods for the user's city.",
  "When and only when guided-match is selected, populate content.feelings with 3 to 5 localized tr/en home-feeling preferences and content.timings with 3 to 5 localized tr/en moving-time choices. These are private matching-intake options, not template names or neighborhood browsing cards.",
  "When and only when land-plots is selected, populate content.services with exactly 4 concise localized tr/en land-consultancy services, content.teamMembers with 2 to 3 plausible Turkish team member names plus localized tr/en roles and bios (and an empty photo_url when no real URL is known), and content.processSteps with exactly 3 concise localized tr/en consultancy steps based on the user's context.",
  "Do not inspect files, call tools, or modify anything.",
].join("\n");

const existingSiteResponse = (response, site) => sendJson(response, 409, {
  error: "Zaten bir siteniz var, buradan düzenleyebilirsiniz.",
  code: "SITE_LIMIT_REACHED",
  existing_site: { id: site.id, slug: site.slug },
  redirect_path: `/dashboard?site=${site.id}`,
});

export const ensureLandPlotsContent = (config) => {
  if (config.template_id !== "land-plots") return config;
  const businessName = config.business_name || "Arsa Danışmanlığı";
  const content = config.content && typeof config.content === "object" ? config.content : {};
  return {
    ...config,
    content: {
      ...content,
      services: Array.isArray(content.services) && content.services.length === 4 ? content.services : [
        { title: { tr: "Arsa Alım-Satım Danışmanlığı", en: "Land Acquisition & Sales" }, description: { tr: "Doğru araziyi doğru değer ve güvenli işlem koşullarıyla buluşturuyoruz.", en: "We connect the right land with fair value and a secure transaction process." } },
        { title: { tr: "İmar ve Tapu Takibi", en: "Zoning & Title Due Diligence" }, description: { tr: "İmar durumu, mülkiyet ve resmi süreçleri ayrıntılı biçimde inceliyoruz.", en: "We review zoning, ownership and official records in detail." } },
        { title: { tr: "Değerleme ve Pazarlama", en: "Valuation & Marketing" }, description: { tr: "Araziyi konumu, niteliği ve gelişim potansiyeliyle doğru konumlandırıyoruz.", en: "We position each property around its location, character and development potential." } },
        { title: { tr: "Yatırım Danışmanlığı", en: "Investment Advisory" }, description: { tr: "Bölgesel verilerle uzun vadeli yatırım kararlarını destekliyoruz.", en: "We support long-term investment decisions with relevant local data." } },
      ],
      teamMembers: Array.isArray(content.teamMembers) && content.teamMembers.length >= 2 ? content.teamMembers : [
        { name: `${businessName} Kurucusu`, role: { tr: "Gayrimenkul Danışmanı", en: "Real Estate Advisor" }, bio: { tr: "Arazi yatırımları, değerleme ve satış süreçlerinde müşterilere uçtan uca rehberlik eder.", en: "Guides clients through land investment, valuation and sales from start to finish." }, photo_url: "" },
        { name: "İmar ve Tapu Uzmanı", role: { tr: "Teknik Danışman", en: "Technical Advisor" }, bio: { tr: "İmar, tapu ve resmi kayıtları inceleyerek karar sürecini güvenli hale getirir.", en: "Reviews zoning, title and official records to support confident decisions." }, photo_url: "" },
        { name: "Yatırım Danışmanı", role: { tr: "Portföy Uzmanı", en: "Portfolio Specialist" }, bio: { tr: "Bölgesel potansiyeli ve piyasa verilerini analiz ederek uygun seçenekleri sunar.", en: "Evaluates local potential and market data to identify suitable opportunities." }, photo_url: "" },
      ],
      processSteps: Array.isArray(content.processSteps) && content.processSteps.length === 3 ? content.processSteps : [
        { title: { tr: "Dinliyoruz", en: "We Listen" }, description: { tr: "Yatırım hedefinizi ve beklentilerinizi netleştiriyoruz.", en: "We clarify your investment goals and expectations." } },
        { title: { tr: "Analiz Ediyoruz", en: "We Analyse" }, description: { tr: "İmar, tapu, konum ve piyasa verilerini birlikte inceliyoruz.", en: "We assess zoning, title, location and market data together." } },
        { title: { tr: "Sonuçlandırıyoruz", en: "We Deliver" }, description: { tr: "Müzakere ve devir sürecini güvenle tamamlıyoruz.", en: "We guide negotiations and transfer through to a secure completion." } },
      ],
    },
  };
};

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
    const config = ensureLandPlotsContent(JSON.parse(result.text));
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
