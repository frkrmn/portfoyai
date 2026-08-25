import { GoogleGenAI } from "@google/genai";
import { dashboardSite, getAuthenticatedUser, getSupabaseClient, handleKnownError, methodNotAllowed, readJsonBody, sendJson, uuidPattern } from "../api-utils.mjs";
import { buttonColorSources, fineTuneEnums, mergeThemeConfig } from "../site-theme.mjs";

export const siteRefineModel = "gemini-3.5-flash-lite";
const allowedFonts = [
  "Cormorant Garamond, Georgia, serif",
  "Libre Baskerville, Georgia, serif",
  "Manrope, Inter, Arial, sans-serif",
  "Inter, Arial, sans-serif",
];

export const siteRefineSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    layout_fine_tune: {
      type: "object",
      additionalProperties: false,
      properties: Object.fromEntries(Object.entries(fineTuneEnums).map(([key, values]) => [key, { type: "string", enum: values }])),
    },
    primary_color: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
    accent_color: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
    buttonColorSource: { type: "string", enum: buttonColorSources },
    buttonColorCustom: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
    heading_font: { type: "string", enum: allowedFonts },
    body_font: { type: "string", enum: allowedFonts },
    unsupported_note: { type: "string", nullable: true },
  },
  required: ["unsupported_note"],
};

const systemInstruction = [
  "Sen Fastate AI için sınırları kesin bir Türkçe tema ince-ayar eşleyicisisin.",
  "Kullanıcı isteğini yalnızca verilen şemadaki alanlara eşleştir. Kod, CSS, yeni alan, içerik, görsel, logo ölçüsü veya yapısal bölüm değişikliği üretme.",
  "Sadece açıkça istenen alanları döndür; ilişkili görünse bile başka alanları tahmin ederek değiştirme.",
  "Daha yuvarlak butonlar buttonStyle=pill; köşesiz butonlar buttonStyle=sharp; menüyü ortalama navAlignment=center; gölgeyi kaldırma/sade kart cardStyle=flat; belirgin gölge cardStyle=shadow; çerçeveli kart cardStyle=bordered olarak eşlenir.",
  "Renk isteğinde uygun primary_color veya accent_color alanına erişilebilir, altı haneli hex renk döndür. Font isteğinde yalnızca enumdaki fontlardan birini seç.",
  "Buton rengi ana renkle aynı istendiğinde buttonColorSource=primary; vurgu rengiyle aynı istendiğinde buttonColorSource=accent döndür. Kullanıcı buton için belirli bir renk söylerse buttonColorSource=custom ile birlikte buttonColorCustom hex değerini döndür.",
  "İsteğin herhangi bir bölümü desteklenmiyorsa desteklenen bölümü yine uygula ve unsupported_note içinde desteklenmeyen bölümü kısa, açık Türkçe ile belirt.",
  "Hiçbir bölüm desteklenmiyorsa değişiklik alanlarını tamamen atla ve unsupported_note yaz. Sessizce görmezden gelme.",
].join("\n");

export async function mapRefinementRequest(requestText, apiKey = process.env.GEMINI_API_KEY) {
  if (!apiKey) throw new Error("GEMINI_API_KEY environment variable is not set.");
  const gemini = new GoogleGenAI({ apiKey });
  const result = await gemini.models.generateContent({
    model: siteRefineModel,
    contents: `İNCE AYAR İSTEĞİ:\n${requestText}`,
    config: { systemInstruction, responseMimeType: "application/json", responseSchema: siteRefineSchema },
  });
  if (!result.text) throw new Error("Gemini returned an empty refinement response.");
  const mapped = JSON.parse(result.text);
  const unsupportedNote = typeof mapped.unsupported_note === "string" && mapped.unsupported_note.trim()
    ? mapped.unsupported_note.trim().slice(0, 500)
    : null;
  const patch = {};
  if (mapped.layout_fine_tune && typeof mapped.layout_fine_tune === "object") patch.layout_fine_tune = mapped.layout_fine_tune;
  for (const field of ["primary_color", "accent_color", "buttonColorSource", "buttonColorCustom", "heading_font", "body_font"]) {
    if (mapped[field] !== undefined) patch[field] = mapped[field];
  }
  return { patch, unsupported_note: unsupportedNote, model: result.modelVersion || siteRefineModel };
}

const ownedSiteSelect = "id, slug, business_name, tone, primary_color, accent_color, headline, theme_config, previous_theme_config, status, created_at";

const undoRefinement = async (response, siteId, userId) => {
  const supabase = getSupabaseClient();
  const { data: current, error } = await supabase.from("sites").select(ownedSiteSelect).eq("id", siteId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`Failed to load site for undo: ${error.message}`);
  if (!current) return sendJson(response, 404, { error: "Owned site not found." });
  if (!current.previous_theme_config) return sendJson(response, 409, { error: "Geri alınabilecek bir ince ayar bulunmuyor." });
  const restored = current.previous_theme_config;
  const updates = { theme_config: restored, previous_theme_config: null };
  if (typeof restored.colors?.primary === "string") updates.primary_color = restored.colors.primary;
  if (typeof restored.colors?.accent === "string") updates.accent_color = restored.colors.accent;
  const saved = await supabase.from("sites").update(updates).eq("id", siteId).eq("user_id", userId).select(ownedSiteSelect).single();
  if (saved.error) throw new Error(`Failed to undo refinement: ${saved.error.message}`);
  return sendJson(response, 200, { site: dashboardSite(saved.data), unsupported_note: null, applied_fields: ["undo"] });
};

export default async function handler(request, response) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  try {
    const user = await getAuthenticatedUser(request);
    const siteId = String(request.query?.id || "");
    if (!uuidPattern.test(siteId)) return sendJson(response, 400, { error: "A valid site id is required." });
    const body = await readJsonBody(request);
    if (body.action === "undo") return undoRefinement(response, siteId, user.id);

    const requestText = typeof body.request === "string" ? body.request.trim() : "";
    if (requestText.length < 3 || requestText.length > 500) return sendJson(response, 400, { error: "İnce ayar isteği 3-500 karakter olmalıdır." });
    const supabase = getSupabaseClient();
    const { data: current, error } = await supabase.from("sites").select(ownedSiteSelect).eq("id", siteId).eq("user_id", user.id).maybeSingle();
    if (error) throw new Error(`Failed to verify site ownership: ${error.message}`);
    if (!current) return sendJson(response, 404, { error: "Owned site not found." });

    const mapped = await mapRefinementRequest(requestText);
    const { themeConfig, topLevel, appliedFields } = mergeThemeConfig(current.theme_config, mapped.patch);
    if (!appliedFields.length) {
      return sendJson(response, 200, {
        site: dashboardSite(current),
        unsupported_note: mapped.unsupported_note || "Bu istek mevcut ince ayar seçenekleriyle desteklenmiyor.",
        applied_fields: [],
        meta: { provider: "gemini", model: mapped.model },
      });
    }

    const saved = await supabase.from("sites").update({
      ...topLevel,
      theme_config: themeConfig,
      previous_theme_config: current.theme_config || {},
    }).eq("id", siteId).eq("user_id", user.id).select(ownedSiteSelect).single();
    if (saved.error) throw new Error(`Failed to save refinement: ${saved.error.message}`);
    return sendJson(response, 200, {
      site: dashboardSite(saved.data),
      unsupported_note: mapped.unsupported_note,
      applied_fields: appliedFields,
      meta: { provider: "gemini", model: mapped.model },
    });
  } catch (error) {
    return handleKnownError(response, error, "[site-refine] Refinement failed");
  }
}
