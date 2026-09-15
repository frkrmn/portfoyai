import { GoogleGenAI } from "@google/genai";
import { formatListingPrice, normalizeListingCurrency } from "../../src/lib/listing-price.js";
import { getAuthenticatedUser, getSupabaseClient, handleKnownError, methodNotAllowed, readJsonBody, sendJson, uuidPattern } from "../api-utils.mjs";
import { trackAiCall } from "../observability.mjs";
import { idempotencyKey, runBudgetedAiCall } from "../ai-usage-budget.mjs";
import { ensurePersonalWorkspace, requireSitePermission } from "../workspace-permissions.mjs";
import { verifiedReduction, verifiedUrgency } from "../../src/lib/deal-verification.mjs";

export const listingCopyModel = "gemini-3.5-flash-lite";

export const listingCopySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    platform_style: { type: "string" },
    seo_style: { type: "string" },
  },
  required: ["platform_style", "seo_style"],
};

const cleanText = (value, maxLength = 500) => typeof value === "string" ? value.trim().slice(0, maxLength) : "";
const optionalNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const listingFactsFromBody = (body) => {
  const roomCount = cleanText(body.room_count, 30);
  const district = cleanText(body.district, 120);
  const listingType = cleanText(body.listing_type, 20);
  const m2 = Number(body.m2);
  const price = Number(body.price);
  if (!roomCount) throw new Error("VALIDATION:Oda sayısı gereklidir.");
  if (!district) throw new Error("VALIDATION:İlçe gereklidir.");
  if (!Number.isFinite(m2) || m2 <= 0) throw new Error("VALIDATION:Geçerli bir alan (m²) gereklidir.");
  if (!Number.isFinite(price) || price <= 0) throw new Error("VALIDATION:Geçerli bir fiyat gereklidir.");
  if (!['sale', 'rent'].includes(listingType)) throw new Error("VALIDATION:İlan türü satılık veya kiralık olmalıdır.");
  const currency = normalizeListingCurrency(body.currency);
  const reduction = verifiedReduction({ ...body, price, currency });

  return {
    title: cleanText(body.title, 200) || null,
    room_count: roomCount,
    m2,
    listing_type: listingType,
    property_category: ["konut", "arsa", "isyeri"].includes(body.property_category) ? body.property_category : "konut",
    property_subtype: body.property_category === "isyeri" ? null : (["daire", "mustakil_ev", "villa", "rezidans", "konut_imarli", "ticari_imarli", "tarla_tarimsal", "villa_imarli", "kentsel_donusum"].includes(body.property_subtype) ? body.property_subtype : body.property_category === "arsa" ? "konut_imarli" : "daire"),
    district,
    price,
    currency,
    price_display: formatListingPrice({ currency, price }),
    features: Array.isArray(body.features) ? body.features.map((item) => cleanText(item, 100)).filter(Boolean).slice(0, 20) : [],
    address: cleanText(body.address, 300) || null,
    category: cleanText(body.category, 50) || null,
    bedroom_count: optionalNumber(body.bedroom_count),
    bathroom_count: optionalNumber(body.bathroom_count),
    rental_yield_percent: optionalNumber(body.rental_yield_percent),
    roi_notes: cleanText(body.roi_notes, 300) || null,
    urgent_sale: verifiedUrgency(body),
    price_reduced_from: reduction?.old_price ?? null,
    discount_percent: reduction?.discount_percent ?? null,
  };
};

export async function generateListingCopy(facts, apiKey = process.env.GEMINI_API_KEY, budget = null) {
  if (!apiKey) throw new Error("GEMINI_API_KEY environment variable is not set.");
  const gemini = new GoogleGenAI({ apiKey });
  const call = () => trackAiCall({ operation: "listing.generate_copy", model: listingCopyModel, call: () => gemini.models.generateContent({
    model: listingCopyModel,
    contents: `İLAN VERİLERİ:\n${JSON.stringify(facts, null, 2)}`,
    config: {
      systemInstruction: [
        "You are a Turkish real-estate listing copywriter.",
        "Use only the supplied facts. Never invent building age, floor, transport distance, amenities, legal details or availability. In particular, never write krediye uygun, tapu, hemen taşınmaya hazır, merkezi konum or kaçırılmayacak fırsat unless that exact claim is supplied in features. Before returning, remove every factual claim that cannot be traced to an input field. If mentioning price, use price_display exactly rather than exposing the raw number or currency code.",
        "Return two substantially different Turkish descriptions for the same property.",
        "platform_style: 60-110 words. Put district, listing type, room count and m² first. Use punchy short lines and common Turkish portal search phrases. Include supplied feature keywords naturally, such as site içi, asansörlü or deniz manzaralı only when they are present in the input. Do not mention sahibinden.com or imitate a specific seller.",
        "seo_style: 150-230 words. Use complete, natural sentences and a descriptive narrative suitable for the agent's own public website. Naturally repeat the district, property type and key specs where useful for indexing, without keyword stuffing.",
        "Do not include headings, markdown, bullet characters, contact details, calls to another platform, or claims not supported by the input.",
      ].join("\n"),
      responseMimeType: "application/json",
      responseSchema: listingCopySchema,
    },
  }) });
  const response = budget ? await runBudgetedAiCall({ ...budget, provider: "gemini", model: listingCopyModel, operation: "listing.generate_copy", reservedTokens: 4000, call }) : await call();
  if (!response.text) throw new Error("Gemini returned an empty response.");
  const result = JSON.parse(response.text);
  if (!cleanText(result.platform_style) || !cleanText(result.seo_style)) throw new Error("Gemini did not return both copy variants.");
  return { platform_style: result.platform_style.trim(), seo_style: result.seo_style.trim() };
}

export default async function handler(request, response) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  try {
    const user = await getAuthenticatedUser(request);
    const body = await readJsonBody(request);
    const siteId = typeof body.site_id === "string" ? body.site_id : "";
    if (!uuidPattern.test(siteId)) return sendJson(response, 400, { error: "A valid site_id is required." });
    const supabase = getSupabaseClient();
    const access = await requireSitePermission(user.id, siteId, "listing.write", supabase);
    if (body.id) {
      if (!uuidPattern.test(String(body.id))) return sendJson(response, 400, { error: "Invalid listing id." });
      const listing = await supabase.from("listings").select("id").eq("id", body.id).eq("site_id", siteId).maybeSingle();
      if (listing.error) throw listing.error;
      if (!listing.data) return sendJson(response, 404, { error: "Listing not found." });
    }
    const workspaceId = access.site.workspace_id || await ensurePersonalWorkspace(user.id, supabase);
    const facts = listingFactsFromBody(body);
    const copy = await generateListingCopy(facts, process.env.GEMINI_API_KEY, { supabase, workspaceId, userId: user.id, key: idempotencyKey(request) });
    return sendJson(response, 200, { ...copy, meta: { provider: "gemini", model: listingCopyModel } });
  } catch (error) {
    return handleKnownError(response, error, "[listing-copy] Generation failed");
  }
}
