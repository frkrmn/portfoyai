import { createClient } from "@supabase/supabase-js";

export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const hexColorPattern = /^#[0-9a-f]{6}$/i;

export const sendJson = (response, statusCode, payload) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
};

export const methodNotAllowed = (response, methods) => {
  response.setHeader("Allow", methods.join(", "));
  return sendJson(response, 405, { error: "Method not allowed" });
};

export const readJsonBody = async (request, maxBytes = 32_768) => {
  if (request.body !== undefined && request.body !== null) {
    const raw = Buffer.isBuffer(request.body)
      ? request.body
      : Buffer.from(typeof request.body === "string" ? request.body : JSON.stringify(request.body));
    if (raw.length > maxBytes) throw new Error("Request body is too large");
    return typeof request.body === "object" && !Buffer.isBuffer(request.body)
      ? request.body
      : JSON.parse(raw.toString("utf8") || "{}");
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new Error("Request body is too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
};

let supabaseClient;
export const getSupabaseClient = () => {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("SUPABASE_URL environment variable is not set.");
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is not set.");
  if (!supabaseClient) {
    supabaseClient = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return supabaseClient;
};

export const getSessionId = (request) => {
  const value = request.headers["x-session-id"];
  const sessionId = Array.isArray(value) ? value[0] : value;
  return typeof sessionId === "string" && sessionId.length >= 16 && sessionId.length <= 128 ? sessionId : null;
};

export const getAccessToken = (request) => {
  const authorization = request.headers.authorization;
  if (typeof authorization !== "string" || !authorization.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim() || null;
};

export const getAuthenticatedUser = async (request, required = true) => {
  const accessToken = getAccessToken(request);
  if (!accessToken) {
    if (required) throw new Error("AUTH_REQUIRED");
    return null;
  }
  const { data, error } = await getSupabaseClient().auth.getUser(accessToken);
  if (error || !data.user) {
    if (required) throw new Error("AUTH_REQUIRED");
    return null;
  }
  return data.user;
};

export const routeParam = (request, name) => {
  const queryValue = request.query?.[name];
  if (Array.isArray(queryValue)) return queryValue[0];
  if (typeof queryValue === "string") return queryValue;
  const pathname = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`).pathname;
  const segments = pathname.split("/").filter(Boolean);
  if (name === "slug") return decodeURIComponent(segments.at(-1) || "");
  if (name === "id") return segments.at(-1) === "listings" ? segments.at(-2) || "" : segments.at(-1) || "";
  return "";
};

export const serializeListing = (listing) => {
  const features = Array.isArray(listing.features) ? listing.features : [];
  const yieldFeature = features.find((feature) => typeof feature === "string" && feature.startsWith("Tahmini kira getirisi: %"));
  const roiFeature = features.find((feature) => typeof feature === "string" && feature.startsWith("Yatırım görünümü: "));
  const featureYield = yieldFeature ? Number(yieldFeature.replace("Tahmini kira getirisi: %", "")) : null;
  return {
    id: listing.id,
    site_id: listing.site_id,
    title: listing.title,
    description: listing.description,
    price: Number(listing.price),
    currency: listing.currency,
    m2: Number(listing.m2),
    room_count: listing.room_count,
    listing_type: listing.listing_type,
    district: listing.district,
    lat: Number(listing.lat),
    lng: Number(listing.lng),
    media: Array.isArray(listing.media) ? listing.media : [],
    status: listing.status,
    created_at: listing.created_at,
    features,
    address: listing.address || `${listing.district}, Türkiye`,
    category: listing.category || (/dubleks/i.test(listing.title) ? "duplex" : /müstakil|villa/i.test(listing.title) ? "house" : "apartment"),
    bedroom_count: listing.bedroom_count ?? (Number.parseInt(listing.room_count, 10) || 1),
    bathroom_count: listing.bathroom_count ?? ((Number.parseInt(listing.room_count, 10) || 1) >= 4 ? 2 : 1),
    rental_yield_percent: listing.rental_yield_percent == null ? (Number.isFinite(featureYield) ? featureYield : null) : Number(listing.rental_yield_percent),
    roi_notes: listing.roi_notes || roiFeature?.replace("Yatırım görünümü: ", "") || null,
  };
};

export const getOwnedSite = async (userId, siteId) => {
  const { data, error } = await getSupabaseClient()
    .from("sites")
    .select("id, slug, user_id, business_name, tone, primary_color, accent_color, headline, theme_config, status, created_at")
    .eq("id", siteId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Failed to verify site ownership: ${error.message}`);
  return data;
};

export const dashboardSite = (site) => ({
  id: site.id,
  slug: site.slug,
  business_name: site.business_name,
  tone: site.tone,
  primary_color: site.primary_color,
  accent_color: site.accent_color,
  headline: site.headline,
  theme_config: site.theme_config || {},
  status: site.status,
  created_at: site.created_at,
});

export const listingPayload = (body, siteId) => {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const district = typeof body.district === "string" ? body.district.trim() : "";
  const roomCount = typeof body.room_count === "string" ? body.room_count.trim() : "";
  const price = Number(body.price);
  const m2 = Number(body.m2);
  if (!title || title.length > 200) throw new Error("VALIDATION:Title is required and must be at most 200 characters.");
  if (!description || description.length > 5000) throw new Error("VALIDATION:Description is required and must be at most 5000 characters.");
  if (!district || district.length > 120) throw new Error("VALIDATION:District is required and must be at most 120 characters.");
  if (!roomCount || roomCount.length > 30) throw new Error("VALIDATION:Room count is required.");
  if (!Number.isFinite(price) || price < 0) throw new Error("VALIDATION:Price must be a positive number.");
  if (!Number.isFinite(m2) || m2 <= 0) throw new Error("VALIDATION:Area must be greater than zero.");
  if (!["sale", "rent"].includes(body.listing_type)) throw new Error("VALIDATION:Listing type must be sale or rent.");
  if (body.status !== undefined && !["active", "passive", "sold"].includes(body.status)) throw new Error("VALIDATION:Invalid listing status.");
  const media = Array.isArray(body.media) ? body.media.slice(0, 10).map((item, index) => ({
    id: String(item?.id || `media-${index}`).slice(0, 100),
    url: String(item?.url || ""),
    thumbUrl: String(item?.thumbUrl || item?.url || ""),
    alt: String(item?.alt || title).slice(0, 200),
  })).filter((item) => item.url) : [];
  return {
    site_id: siteId,
    title,
    description,
    price,
    currency: ["TRY", "USD", "EUR"].includes(body.currency) ? body.currency : "TRY",
    m2,
    room_count: roomCount,
    listing_type: body.listing_type,
    district,
    lat: Number.isFinite(Number(body.lat)) ? Number(body.lat) : 41,
    lng: Number.isFinite(Number(body.lng)) ? Number(body.lng) : 29,
    media,
    status: body.status || "active",
    features: Array.isArray(body.features) ? body.features.map(String).map((value) => value.trim()).filter(Boolean).slice(0, 30) : [],
  };
};

export const handleKnownError = (response, error, scope) => {
  if (error instanceof Error && error.message === "AUTH_REQUIRED") return sendJson(response, 401, { error: "Authentication required." });
  if (error instanceof Error && error.message.startsWith("VALIDATION:")) return sendJson(response, 400, { error: error.message.slice(11) });
  console.error(scope, error);
  return sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
};
