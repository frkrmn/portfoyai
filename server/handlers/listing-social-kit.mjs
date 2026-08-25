import { ImageResponse } from "@vercel/og";
import { createElement as h } from "react";
import { formatListingPrice } from "../../src/lib/listing-price.js";
import { getAuthenticatedUser, getOwnedSite, getSupabaseClient, handleKnownError, listingSelect, methodNotAllowed, sendJson, serializeListing, uuidPattern } from "../api-utils.mjs";

const placeholderImages = [
  "/images/listings/bagdat-residence.jpg",
  "/images/listings/caddebostan-sea-view.jpg",
  "/images/listings/fenerbahce-garden.jpg",
  "/images/listings/moda-character.jpg",
  "/images/listings/suadiye-penthouse.jpg",
  "/images/listings/bagdat-residence-alt.jpg",
];

const stableHash = (value) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const requestUrl = (request) => new URL(request.url || "/", `${request.headers["x-forwarded-proto"] || "http"}://${request.headers.host || "localhost"}`);
const listingIdFrom = (request) => {
  const queryId = Array.isArray(request.query?.id) ? request.query.id[0] : request.query?.id;
  if (typeof queryId === "string") return queryId;
  const segments = requestUrl(request).pathname.split("/").filter(Boolean);
  return segments[segments.indexOf("listings") + 1] || "";
};

const imageUrlFor = (listing, request) => {
  const uploaded = Array.isArray(listing.media) ? listing.media.map((item) => item?.url || item?.thumbUrl).find(Boolean) : null;
  if (uploaded?.startsWith("data:") || uploaded?.startsWith("http://") || uploaded?.startsWith("https://")) return uploaded;
  const relative = uploaded || placeholderImages[stableHash(listing.id) % placeholderImages.length];
  return new URL(relative.startsWith("/") ? relative : `/${relative}`, requestUrl(request).origin).toString();
};

export const placeholderImageFor = (listingId) => placeholderImages[stableHash(listingId) % placeholderImages.length];

const hex = (value, fallback) => /^#[0-9a-f]{6}$/i.test(value || "") ? value : fallback;
const readableText = (background) => {
  const [red, green, blue] = [1, 3, 5].map((index) => Number.parseInt(background.slice(index, index + 2), 16));
  return (red * 299 + green * 587 + blue * 114) / 1000 > 145 ? "#17211C" : "#FFFFFF";
};
const locationText = (listing) => {
  const structured = [listing.province_name, listing.district_name || listing.district, listing.neighborhood_name].filter(Boolean);
  return structured.length > 1 ? structured.join(" / ") : listing.district;
};

const badge = (text, accent, accentText, story = false) => h("div", {
  style: {
    display: "flex",
    padding: story ? "16px 24px" : "12px 20px",
    borderRadius: 999,
    backgroundColor: accent,
    color: accentText,
    fontSize: story ? 30 : 25,
    fontWeight: 700,
  },
}, text);

function PostLayout({ listing, site, background, primary, accent, primaryText, accentText }) {
  return h("div", { style: { width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden", backgroundColor: primary, fontFamily: "sans-serif" } },
    h("img", { src: background, width: 1080, height: 1080, style: { position: "absolute", left: 0, right: 0, top: 0, width: "100%", height: "68%", objectFit: "cover" } }),
    h("div", { style: { position: "absolute", left: 48, top: 44, display: "flex", padding: "14px 22px", borderRadius: 12, backgroundColor: primary, color: primaryText, fontSize: 25, fontWeight: 700, letterSpacing: -0.4 } }, site.business_name),
    h("div", { style: { position: "absolute", left: 0, right: 0, bottom: 0, height: "38%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "46px 56px", backgroundColor: primary, color: primaryText } },
      h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 30 } },
        h("div", { style: { display: "flex", flexDirection: "column", minWidth: 0 } },
          h("div", { style: { display: "flex", fontSize: 27, fontWeight: 600, opacity: 0.78 } }, locationText(listing)),
          h("div", { style: { display: "flex", marginTop: 12, fontSize: 67, lineHeight: 1, fontWeight: 800, letterSpacing: -3 } }, formatListingPrice(listing)),
        ),
        h("div", { style: { display: "flex", gap: 12, flexShrink: 0 } }, badge(`${listing.m2} m²`, accent, accentText), badge(listing.room_count, accent, accentText)),
      ),
      h("div", { style: { display: "flex", marginTop: 28, paddingTop: 23, borderTop: `2px solid ${accent}`, fontSize: 29, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden" } }, listing.title),
    ),
  );
}

function StoryLayout({ listing, site, background, primary, accent, primaryText, accentText }) {
  return h("div", { style: { width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden", backgroundColor: primary, color: "#FFFFFF", fontFamily: "sans-serif" } },
    h("img", { src: background, width: 1080, height: 1920, style: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, width: "100%", height: "100%", objectFit: "cover" } }),
    h("div", { style: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, display: "flex", backgroundImage: `linear-gradient(180deg, ${primary}CC 0%, transparent 30%, ${primary}22 48%, ${primary}F5 100%)` } }),
    h("div", { style: { position: "absolute", left: 58, right: 58, top: 64, display: "flex", justifyContent: "space-between", alignItems: "center" } },
      h("div", { style: { display: "flex", maxWidth: 720, fontSize: 31, fontWeight: 700, letterSpacing: -0.5 } }, site.business_name),
      h("div", { style: { display: "flex", width: 18, height: 18, borderRadius: 999, backgroundColor: accent } }),
    ),
    h("div", { style: { position: "absolute", left: 58, right: 58, bottom: 90, display: "flex", flexDirection: "column" } },
      h("div", { style: { display: "flex", color: accent, fontSize: 31, fontWeight: 700 } }, locationText(listing)),
      h("div", { style: { display: "flex", marginTop: 22, maxWidth: 900, fontSize: 61, lineHeight: 1.06, fontWeight: 700, letterSpacing: -2 } }, listing.title),
      h("div", { style: { display: "flex", marginTop: 45, fontSize: 82, lineHeight: 1, fontWeight: 800, letterSpacing: -4 } }, formatListingPrice(listing)),
      h("div", { style: { display: "flex", gap: 14, marginTop: 36 } }, badge(`${listing.m2} m²`, accent, accentText, true), badge(listing.room_count, accent, accentText, true), badge(listing.listing_type === "sale" ? "Satılık" : "Kiralık", primaryText, primary, true)),
    ),
  );
}

export function buildSocialKitImage({ listing, site, background, format }) {
  const primary = hex(site.theme_config?.colors?.primary || site.primary_color, "#173F32");
  const accent = hex(site.theme_config?.colors?.accent || site.accent_color, "#D86F45");
  const props = { listing, site, background, primary, accent, primaryText: readableText(primary), accentText: readableText(accent) };
  const story = format === "story";
  return new ImageResponse(story ? h(StoryLayout, props) : h(PostLayout, props), {
    width: 1080,
    height: story ? 1920 : 1080,
    headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" },
  });
}

export default async function handler(request, response) {
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
  try {
    const listingId = listingIdFrom(request);
    const format = requestUrl(request).searchParams.get("format") || "post";
    if (!uuidPattern.test(listingId)) return sendJson(response, 400, { error: "A valid listing id is required." });
    if (!["post", "story"].includes(format)) return sendJson(response, 400, { error: "Format must be post or story." });
    const user = await getAuthenticatedUser(request);
    const { data: rawListing, error } = await getSupabaseClient().from("listings").select(listingSelect).eq("id", listingId).maybeSingle();
    if (error) throw new Error(`Failed to load listing: ${error.message}`);
    if (!rawListing) return sendJson(response, 404, { error: "Listing not found." });
    const listing = serializeListing(rawListing);
    const site = await getOwnedSite(user.id, listing.site_id);
    if (!site) return sendJson(response, 404, { error: "Owned listing not found." });
    const image = buildSocialKitImage({ listing, site, background: imageUrlFor(listing, request), format });
    const png = Buffer.from(await image.arrayBuffer());
    response.statusCode = 200;
    response.setHeader("Content-Type", "image/png");
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("Content-Disposition", `inline; filename="${listingId}-${format}.png"`);
    return response.end(png);
  } catch (error) {
    return handleKnownError(response, error, "[social-kit] Image generation failed");
  }
}
