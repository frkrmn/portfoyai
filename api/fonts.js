import { getAuthenticatedUser, handleKnownError, methodNotAllowed, sendJson } from "../server/api-utils.mjs";

const cacheTtlMs = 24 * 60 * 60 * 1000;
let fontCache = null;

export const normalizeGoogleFonts = (payload) => (Array.isArray(payload?.items) ? payload.items : [])
  .filter((item) => typeof item?.family === "string" && Array.isArray(item.variants))
  .map((item) => ({
    family: item.family,
    variants: item.variants.filter((variant) => /^(?:[1-9]00|regular|italic|[1-9]00italic)$/.test(variant)),
  }))
  .filter((item) => item.variants.length > 0);

export async function fetchGoogleFonts(apiKey = process.env.GOOGLE_FONTS_API_KEY, fetchImpl = fetch) {
  if (!apiKey) throw new Error("GOOGLE_FONTS_API_KEY environment variable is not set.");
  const url = new URL("https://www.googleapis.com/webfonts/v1/webfonts");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("sort", "popularity");
  const response = await fetchImpl(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Google Fonts API returned ${response.status}.`);
  const fonts = normalizeGoogleFonts(await response.json());
  if (!fonts.length) throw new Error("Google Fonts API returned an empty catalog.");
  return fonts;
}

export async function getGoogleFontsCatalog() {
  const now = Date.now();
  if (fontCache && fontCache.expiresAt > now) return { fonts: fontCache.fonts, cache: "hit" };
  const fonts = await fetchGoogleFonts();
  fontCache = { fonts, expiresAt: now + cacheTtlMs };
  return { fonts, cache: "miss" };
}

export default async function handler(request, response) {
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
  try {
    await getAuthenticatedUser(request);
    const result = await getGoogleFontsCatalog();
    response.setHeader("Cache-Control", "private, max-age=3600, stale-while-revalidate=86400");
    return sendJson(response, 200, result);
  } catch (error) {
    return handleKnownError(response, error, "[fonts] Google Fonts catalog failed");
  }
}
