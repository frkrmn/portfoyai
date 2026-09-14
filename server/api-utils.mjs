import { createClient } from "@supabase/supabase-js";
import { randomInt } from "node:crypto";
import {
  canonicalSiteProjection,
  siteSelect,
} from "./site-source-of-truth.mjs";
import { requestContext, structuredLog } from "./observability.mjs";
import { sanitizeInvestmentMetrics } from "../src/lib/investment-metrics.mjs";
import { sanitizePriceHistory, verifiedReduction } from "../src/lib/deal-verification.mjs";
import { sanitizeLandDetails } from "../src/lib/land-details.mjs";

export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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
      : Buffer.from(
          typeof request.body === "string"
            ? request.body
            : JSON.stringify(request.body),
        );
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
  if (!serviceRoleKey)
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY environment variable is not set.",
    );
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
  return typeof sessionId === "string" &&
    sessionId.length >= 16 &&
    sessionId.length <= 128
    ? sessionId
    : null;
};

export const getAccessToken = (request) => {
  const authorization = request.headers.authorization;
  if (typeof authorization !== "string" || !authorization.startsWith("Bearer "))
    return null;
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

const pricingVariantCookie = "portfoyai_pricing_variant";

const getCookie = (request, name) => {
  const raw = request.headers.cookie;
  if (typeof raw !== "string") return null;
  const match = raw
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
};

const setPricingVariantCookie = (request, response, variant) => {
  const forwardedProtocol = request.headers["x-forwarded-proto"];
  const secure = forwardedProtocol === "https" ? "; Secure" : "";
  response.setHeader(
    "Set-Cookie",
    `${pricingVariantCookie}=${variant}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`,
  );
};

const subscriptionSelect =
  "id, subject_id, user_id, session_id, plan, pricing_variant, created_at, updated_at";

export const resolveSubscription = async (
  request,
  response,
  { assignVariant = false } = {},
) => {
  const supabase = getSupabaseClient();
  const user = await getAuthenticatedUser(request, false);
  const sessionId = getSessionId(request);
  if (!user && !sessionId)
    throw new Error("VALIDATION:A valid session id is required.");

  let subscription = null;
  if (user) {
    const byUser = await supabase
      .from("subscriptions")
      .select(subscriptionSelect)
      .eq("user_id", user.id)
      .maybeSingle();
    if (byUser.error)
      throw new Error(`Failed to load subscription: ${byUser.error.message}`);
    subscription = byUser.data;

    if (!subscription && sessionId) {
      const anonymous = await supabase
        .from("subscriptions")
        .select(subscriptionSelect)
        .eq("subject_id", sessionId)
        .is("user_id", null)
        .maybeSingle();
      if (anonymous.error)
        throw new Error(
          `Failed to load session subscription: ${anonymous.error.message}`,
        );
      if (anonymous.data) {
        const migrated = await supabase
          .from("subscriptions")
          .update({
            subject_id: user.id,
            user_id: user.id,
            session_id: sessionId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", anonymous.data.id)
          .select(subscriptionSelect)
          .single();
        if (migrated.error)
          throw new Error(
            `Failed to link subscription to user: ${migrated.error.message}`,
          );
        subscription = migrated.data;
      }
    }

    if (!subscription) {
      const created = await supabase
        .from("subscriptions")
        .insert({
          subject_id: user.id,
          user_id: user.id,
          session_id: sessionId,
          plan: "free",
        })
        .select(subscriptionSelect)
        .single();
      if (created.error)
        throw new Error(
          `Failed to create free subscription: ${created.error.message}`,
        );
      subscription = created.data;
    }
  } else {
    const existing = await supabase
      .from("subscriptions")
      .select(subscriptionSelect)
      .eq("subject_id", sessionId)
      .maybeSingle();
    if (existing.error)
      throw new Error(
        `Failed to load session subscription: ${existing.error.message}`,
      );
    subscription = existing.data;
    if (!subscription) {
      const created = await supabase
        .from("subscriptions")
        .insert({ subject_id: sessionId, session_id: sessionId, plan: "free" })
        .select(subscriptionSelect)
        .single();
      if (created.error)
        throw new Error(
          `Failed to create session subscription: ${created.error.message}`,
        );
      subscription = created.data;
    }
  }

  if (assignVariant && !subscription.pricing_variant) {
    const cookieVariant = getCookie(request, pricingVariantCookie);
    const variant =
      cookieVariant === "A" || cookieVariant === "B"
        ? cookieVariant
        : randomInt(2) === 0
          ? "A"
          : "B";
    const assigned = await supabase
      .from("subscriptions")
      .update({
        pricing_variant: variant,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id)
      .is("pricing_variant", null)
      .select(subscriptionSelect)
      .maybeSingle();
    if (assigned.error)
      throw new Error(
        `Failed to assign pricing variant: ${assigned.error.message}`,
      );
    if (assigned.data) subscription = assigned.data;
    else {
      const latest = await supabase
        .from("subscriptions")
        .select(subscriptionSelect)
        .eq("id", subscription.id)
        .single();
      if (latest.error)
        throw new Error(
          `Failed to reload pricing variant: ${latest.error.message}`,
        );
      subscription = latest.data;
    }
  }

  if (subscription.pricing_variant)
    setPricingVariantCookie(request, response, subscription.pricing_variant);
  return subscription;
};

export const getUserPlan = async (userId, workspaceId = null) => {
  const { workspaceFeatureEnabled } = await import(
    "./workspace-permissions.mjs"
  );
  let query = getSupabaseClient().from("subscriptions").select("plan");
  if (workspaceFeatureEnabled()) {
    let workspaceIds = workspaceId ? [workspaceId] : [];
    if (!workspaceIds.length) {
      const memberships = await getSupabaseClient()
        .from("workspace_memberships")
        .select("workspace_id")
        .eq("user_id", userId);
      if (memberships.error) throw memberships.error;
      workspaceIds = (memberships.data || []).map((item) => item.workspace_id);
    }
    if (!workspaceIds.length) return "free";
    query = query.in("workspace_id", workspaceIds);
  } else query = query.eq("user_id", userId);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to load plan: ${error.message}`);
  return (data || []).some((subscription) => subscription.plan === "pro")
    ? "pro"
    : "free";
};

export const countActiveListingsForUser = async (userId) => {
  const { data: sites, error: sitesError } = await getSupabaseClient()
    .from("sites")
    .select("id")
    .eq("user_id", userId);
  if (sitesError)
    throw new Error(
      `Failed to load owned sites for listing limit: ${sitesError.message}`,
    );
  const siteIds = (sites || []).map((site) => site.id);
  if (!siteIds.length) return 0;
  const { count, error } = await getSupabaseClient()
    .from("listings")
    .select("id", { count: "exact", head: true })
    .in("site_id", siteIds)
    .eq("status", "active")
    .eq("listing_status", "active");
  if (error)
    throw new Error(`Failed to count active listings: ${error.message}`);
  return count || 0;
};

export const routeParam = (request, name) => {
  const queryValue = request.query?.[name];
  if (Array.isArray(queryValue)) return queryValue[0];
  if (typeof queryValue === "string") return queryValue;
  const pathname = new URL(
    request.url || "/",
    `http://${request.headers.host || "localhost"}`,
  ).pathname;
  const segments = pathname.split("/").filter(Boolean);
  if (name === "slug") return decodeURIComponent(segments.at(-1) || "");
  if (name === "id")
    return segments.at(-1) === "listings"
      ? segments.at(-2) || ""
      : segments.at(-1) || "";
  return "";
};

export const listingSelect =
  "*, country:countries(name), province:provinces(name), structured_district:districts(name), neighborhood:neighborhoods(name)";

const relationName = (relation) => {
  const value = Array.isArray(relation) ? relation[0] : relation;
  return typeof value?.name === "string" ? value.name : null;
};

export const serializeListing = (listing, { publicView = false } = {}) => {
  const features = Array.isArray(listing.features) ? listing.features : [];
  const yieldFeature = features.find(
    (feature) =>
      typeof feature === "string" &&
      feature.startsWith("Tahmini kira getirisi: %"),
  );
  const roiFeature = features.find(
    (feature) =>
      typeof feature === "string" && feature.startsWith("Yatırım görünümü: "),
  );
  const featureYield = yieldFeature
    ? Number(yieldFeature.replace("Tahmini kira getirisi: %", ""))
    : null;
  return {
    id: listing.id,
    site_id: listing.site_id,
    title: listing.title,
    description: listing.description,
    price: Number(listing.price),
    currency: ["TRY", "USD", "GBP", "EUR"].includes(listing.currency)
      ? listing.currency
      : "TRY",
    m2: Number(listing.m2),
    room_count: listing.room_count,
    listing_type: listing.listing_type,
    district: listing.district,
    country_id: listing.country_id || null,
    province_id: listing.province_id || null,
    district_id: listing.district_id || null,
    neighborhood_id: listing.neighborhood_id || null,
    country_name: relationName(listing.country),
    province_name: relationName(listing.province),
    district_name: relationName(listing.structured_district),
    neighborhood_name: relationName(listing.neighborhood),
    lat: Number(listing.lat),
    lng: Number(listing.lng),
    media: Array.isArray(listing.media) ? listing.media : [],
    status: listing.status,
    listing_status: ["active", "sold", "rented"].includes(
      listing.listing_status,
    )
      ? listing.listing_status
      : "active",
    property_category: ["konut", "arsa", "isyeri"].includes(
      listing.property_category,
    )
      ? listing.property_category
      : "konut",
    property_subtype:
      listing.property_category === "isyeri"
        ? null
        : [
              "daire",
              "mustakil_ev",
              "villa",
              "rezidans",
              "konut_imarli",
              "ticari_imarli",
              "tarla_tarimsal",
              "villa_imarli",
              "kentsel_donusum",
            ].includes(listing.property_subtype)
          ? listing.property_subtype
          : listing.property_category === "arsa"
            ? "konut_imarli"
            : "daire",
    created_at: listing.created_at,
    features,
    seo: listing.seo && typeof listing.seo === "object" ? listing.seo : {},
    address: listing.address || `${listing.district}, Türkiye`,
    category:
      listing.category ||
      (/dubleks/i.test(listing.title)
        ? "duplex"
        : /müstakil|villa/i.test(listing.title)
          ? "house"
          : "apartment"),
    bedroom_count:
      listing.bedroom_count ?? (Number.parseInt(listing.room_count, 10) || 1),
    bathroom_count:
      listing.bathroom_count ??
      ((Number.parseInt(listing.room_count, 10) || 1) >= 4 ? 2 : 1),
    rental_yield_percent:
      listing.rental_yield_percent == null
        ? Number.isFinite(featureYield)
          ? featureYield
          : null
        : Number(listing.rental_yield_percent),
    roi_notes:
      listing.roi_notes ||
      roiFeature?.replace("Yatırım görünümü: ", "") ||
      null,
    investment_metrics: sanitizeInvestmentMetrics(listing.investment_metrics),
    price_reduced_from: verifiedReduction(listing)?.old_price ?? (listing.price_reduced_from == null ? null : Number(listing.price_reduced_from)),
    urgent_sale: listing.urgent_sale === true,
    urgent_verified_at: listing.urgent_verified_at || null,
    urgent_expires_at: listing.urgent_expires_at || null,
    price_history: sanitizePriceHistory(listing.price_history),
    land_details: sanitizeLandDetails(listing.land_details, { publicView, siteId: listing.site_id, listingId: listing.id }),
  };
};

export const getOwnedSite = async (userId, siteId) => {
  const { requireSitePermission } = await import("./workspace-permissions.mjs");
  try {
    await requireSitePermission(userId, siteId, "site.read");
  } catch (error) {
    if (error?.message === "NOT_FOUND" || error?.message === "FORBIDDEN")
      return null;
    throw error;
  }
  const { data, error } = await getSupabaseClient()
    .from("sites")
    .select(siteSelect)
    .eq("id", siteId)
    .maybeSingle();
  if (error)
    throw new Error(`Failed to verify site ownership: ${error.message}`);
  return data ? canonicalSiteProjection(data) : null;
};

export const dashboardSite = (rawSite) => {
  const site = canonicalSiteProjection(rawSite);
  return {
    id: site.id,
    slug: site.slug,
    workspace_id: site.workspace_id || null,
    business_name: site.business_name,
    tone: site.tone,
    primary_color: site.primary_color,
    accent_color: site.accent_color,
    headline: site.headline,
    theme_config: site.theme_config,
    country_id: site.country_id || null,
    province_id: site.province_id || null,
    district_id: site.district_id || null,
    neighborhood_id: site.neighborhood_id || null,
    can_undo: Boolean(site.previous_theme_config),
    status: site.status,
    draft_revision: Number(site.draft_revision || 1),
    published_version: Number(site.published_version || 0),
    published_at: site.published_at || null,
    show_closed_listings: site.show_closed_listings === true,
    show_team_section: site.show_team_section === true,
    team_section_label: site.team_section_label || null,
    created_at: site.created_at,
  };
};

export const listingPayload = (body, siteId) => {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const district =
    typeof body.district === "string" ? body.district.trim() : "";
  const roomCount =
    typeof body.room_count === "string" ? body.room_count.trim() : "";
  const price = Number(body.price);
  const m2 = Number(body.m2);
  const priceReducedFrom =
    body.price_reduced_from == null || body.price_reduced_from === ""
      ? null
      : Number(body.price_reduced_from);
  const rentalYield =
    body.rental_yield_percent == null || body.rental_yield_percent === ""
      ? null
      : Number(body.rental_yield_percent);
  const locationIds = {};
  for (const key of [
    "country_id",
    "province_id",
    "district_id",
    "neighborhood_id",
  ]) {
    const value =
      body[key] == null || body[key] === "" ? null : String(body[key]);
    if (value && !uuidPattern.test(value))
      throw new Error(`VALIDATION:${key} must be a valid id.`);
    locationIds[key] = value;
  }
  if (!title || title.length > 200)
    throw new Error(
      "VALIDATION:Title is required and must be at most 200 characters.",
    );
  if (!description || description.length > 5000)
    throw new Error(
      "VALIDATION:Description is required and must be at most 5000 characters.",
    );
  if (!district || district.length > 120)
    throw new Error(
      "VALIDATION:District is required and must be at most 120 characters.",
    );
  if (!roomCount || roomCount.length > 30)
    throw new Error("VALIDATION:Room count is required.");
  if (!Number.isFinite(price) || price < 0)
    throw new Error("VALIDATION:Price must be a positive number.");
  if (!Number.isFinite(m2) || m2 <= 0)
    throw new Error("VALIDATION:Area must be greater than zero.");
  if (
    priceReducedFrom != null &&
    (!Number.isFinite(priceReducedFrom) || priceReducedFrom <= price)
  )
    throw new Error(
      "VALIDATION:Reduced-from price must be greater than the current price.",
    );
  if (
    rentalYield != null &&
    (!Number.isFinite(rentalYield) || rentalYield <= 0 || rentalYield > 100)
  )
    throw new Error("VALIDATION:Rental yield must be between 0 and 100.");
  if (!["sale", "rent"].includes(body.listing_type))
    throw new Error("VALIDATION:Listing type must be sale or rent.");
  const propertyCategory = body.property_category || "konut";
  if (!["konut", "arsa", "isyeri"].includes(propertyCategory))
    throw new Error("VALIDATION:Invalid property category.");
  const residentialSubtypes = ["daire", "mustakil_ev", "villa", "rezidans"];
  const landSubtypes = [
    "konut_imarli",
    "ticari_imarli",
    "tarla_tarimsal",
    "villa_imarli",
    "kentsel_donusum",
  ];
  const propertySubtype =
    propertyCategory === "konut"
      ? body.property_subtype || "daire"
      : propertyCategory === "arsa"
        ? body.property_subtype || "konut_imarli"
        : null;
  if (
    propertyCategory === "konut" &&
    !residentialSubtypes.includes(propertySubtype)
  )
    throw new Error("VALIDATION:Invalid residential property subtype.");
  if (propertyCategory === "arsa" && !landSubtypes.includes(propertySubtype))
    throw new Error("VALIDATION:Invalid land property subtype.");
  if (
    body.status !== undefined &&
    !["active", "passive", "sold"].includes(body.status)
  )
    throw new Error("VALIDATION:Invalid listing status.");
  const listingStatus = body.listing_status || "active";
  if (!["active", "sold", "rented"].includes(listingStatus))
    throw new Error("VALIDATION:Invalid listing availability status.");
  if (listingStatus === "sold" && body.listing_type !== "sale")
    throw new Error("VALIDATION:Only sale listings can be marked sold.");
  if (listingStatus === "rented" && body.listing_type !== "rent")
    throw new Error("VALIDATION:Only rent listings can be marked rented.");
  const media = Array.isArray(body.media)
    ? body.media
        .slice(0, 10)
        .map((item, index) => ({
          id: String(item?.id || `media-${index}`).slice(0, 100),
          url: String(item?.url || ""),
          thumbUrl: String(item?.thumbUrl || item?.url || ""),
          alt: String(item?.alt || title).slice(0, 200),
          size: Number.isFinite(Number(item?.size)) ? Number(item.size) : null,
          order: Number.isInteger(Number(item?.order))
            ? Number(item.order)
            : index,
        }))
        .filter((item) => item.url)
    : [];
  if (
    media.some(
      (item) =>
        item.url.startsWith("data:") || item.thumbUrl.startsWith("data:"),
    )
  )
    throw new Error("VALIDATION:Images must be uploaded before saving.");
  return {
    site_id: siteId,
    title,
    description,
    price,
    currency: ["TRY", "USD", "GBP", "EUR"].includes(body.currency)
      ? body.currency
      : "TRY",
    m2,
    room_count: roomCount,
    listing_type: body.listing_type,
    property_category: propertyCategory,
    property_subtype: propertySubtype,
    district,
    ...locationIds,
    lat: Number.isFinite(Number(body.lat)) ? Number(body.lat) : 41,
    lng: Number.isFinite(Number(body.lng)) ? Number(body.lng) : 29,
    media,
    status: body.status || "active",
    listing_status: listingStatus,
    features: Array.isArray(body.features)
      ? body.features
          .map(String)
          .map((value) => value.trim())
          .filter(Boolean)
          .slice(0, 30)
      : [],
    seo: sanitizeSeo(body.seo),
    rental_yield_percent: rentalYield,
    roi_notes:
      typeof body.roi_notes === "string"
        ? body.roi_notes.trim().slice(0, 1000) || null
        : null,
    investment_metrics: sanitizeInvestmentMetrics(body.investment_metrics),
    price_reduced_from: priceReducedFrom,
    urgent_sale: body.urgent_sale === true,
    land_details: propertyCategory === "arsa" ? sanitizeLandDetails(body.land_details, { siteId, listingId: body.id }) : {},
  };
};

export const sanitizeSeo = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const localized = (field, max) =>
    Object.fromEntries(
      ["tr", "en"]
        .map((locale) => [
          locale,
          String(field?.[locale] || "")
            .trim()
            .slice(0, max),
        ])
        .filter(([, text]) => text),
    );
  const seo = {
    title: localized(value.title, 70),
    description: localized(value.description, 170),
  };
  for (const key of ["og_image", "favicon", "canonical_url"]) {
    const raw = String(value[key] || "")
      .trim()
      .slice(0, 1000);
    if (raw) {
      try {
        const url = new URL(raw);
        if (!["http:", "https:"].includes(url.protocol)) throw new Error();
      } catch {
        throw new Error(`VALIDATION:${key} must be a valid http or https URL.`);
      }
      seo[key] = raw;
    }
  }
  seo.robots_index = value.robots_index !== false;
  return seo;
};

export const handleKnownError = (response, error, scope) => {
  const requestId = requestContext().requestId;
  if (error instanceof Error && error.message === "AUTH_REQUIRED")
    return sendJson(response, 401, {
      error: "Authentication required.",
      code: "AUTH_REQUIRED",
      request_id: requestId,
    });
  if (error instanceof Error && error.message === "FORBIDDEN")
    return sendJson(response, 403, {
      error: "You do not have permission to perform this action.",
      code: "FORBIDDEN",
      request_id: requestId,
    });
  if (error instanceof Error && error.message === "NOT_FOUND")
    return sendJson(response, 404, {
      error: "Resource not found.",
      code: "NOT_FOUND",
      request_id: requestId,
    });
  if (error instanceof Error && error.message.startsWith("VALIDATION:"))
    return sendJson(response, 400, {
      error: error.message.slice(11),
      code: "VALIDATION_ERROR",
      request_id: requestId,
    });
  if (error instanceof Error && error.message.includes("FREE_LISTING_LIMIT"))
    return sendJson(response, 402, {
      error: "Ücretsiz planda en fazla 5 aktif ilan yayınlayabilirsiniz.",
      code: "FREE_LISTING_LIMIT",
      context: "listing_limit",
      limit: 5,
      plan: "free",
    });
  structuredLog("error", "api.error", {
    scope,
    error,
    error_code: "INTERNAL_ERROR",
  });
  return sendJson(response, 500, {
    error: "Unexpected server error.",
    code: "INTERNAL_ERROR",
    request_id: requestId,
  });
};
