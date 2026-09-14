import { readFile } from "node:fs/promises";
import { structuredLog } from "../observability.mjs";
import { join } from "node:path";
import { loadPublicSite } from "./public-site.mjs";
import { platformPageMetadata, publicSitePageMetadata } from "../../src/lib/site-metadata.js";
import { methodNotAllowed } from "../api-utils.mjs";

const htmlPath = join(process.cwd(), "dist", "index.html");
const sitePathPattern = /^\/site\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/listings(?:\/([0-9a-f-]{36}))?)?\/?$/i;

const queryString = (value) => Array.isArray(value) ? value[0] : typeof value === "string" ? value : "";
const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
})[character]);

export const resolveRequestLocale = (request) => {
  const cookie = typeof request.headers.cookie === "string" ? request.headers.cookie : "";
  const stored = cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith("portfoyai_language="))?.split("=")[1];
  if (stored === "en" || stored === "tr") return stored;
  const accepted = Array.isArray(request.headers["accept-language"]) ? request.headers["accept-language"][0] : request.headers["accept-language"];
  return typeof accepted === "string" && accepted.trim().toLowerCase().startsWith("en") ? "en" : "tr";
};

const replaceMeta = (html, attribute, key, content) => {
  const escaped = escapeHtml(content);
  const pattern = new RegExp(`<meta\\s+([^>]*${attribute}=["']${key}["'][^>]*)>`, "i");
  if (pattern.test(html)) return html.replace(pattern, `<meta ${attribute}="${key}" content="${escaped}" />`);
  return html.replace("</head>", `    <meta ${attribute}="${key}" content="${escaped}" />\n  </head>`);
};
const replaceLink = (html, rel, href, attributes = "") => {
  if (!href) return html;
  const tag = `<link rel="${rel}" href="${escapeHtml(href)}"${attributes} />`;
  const pattern = new RegExp(`<link\\s+[^>]*rel=["']${rel}["'][^>]*>`, "i");
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace("</head>", `    ${tag}\n  </head>`);
};

export const injectPageMetadata = (html, metadata, locale) => {
  let output = html
    .replace(/<html\b[^>]*\blang=["'][^"']*["']/i, `<html lang="${locale}">`)
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(metadata.title)}</title>`);
  output = replaceMeta(output, "name", "description", metadata.description);
  output = replaceMeta(output, "name", "author", metadata.author || "Fastate AI");
  output = replaceMeta(output, "property", "og:title", metadata.title);
  output = replaceMeta(output, "property", "og:description", metadata.description);
  output = replaceMeta(output, "property", "og:type", "website");
  output = replaceMeta(output, "property", "og:locale", locale === "en" ? "en_US" : "tr_TR");
  output = replaceMeta(output, "name", "robots", metadata.robots || "index,follow");
  output = replaceMeta(output, "name", "twitter:card", "summary_large_image");
  output = replaceMeta(output, "name", "twitter:title", metadata.title);
  output = replaceMeta(output, "name", "twitter:description", metadata.description);
  if (metadata.ogImage) {
    output = replaceMeta(output, "property", "og:image", metadata.ogImage);
    output = replaceMeta(output, "name", "twitter:image", metadata.ogImage);
  }
  output = replaceLink(output, "canonical", metadata.canonicalUrl);
  output = replaceLink(output, "icon", metadata.favicon);
  if (metadata.structuredData) output = output.replace("</head>", `    <script type="application/ld+json">${JSON.stringify(metadata.structuredData).replace(/</g, "\\u003c")}</script>\n  </head>`);
  return output;
};

const resolvePagePath = (request) => {
  const rewritten = queryString(request.query?.pagePath);
  if (rewritten) return `/${rewritten.replace(/^\/+/, "")}`;
  const original = request.headers["x-vercel-original-url"];
  const source = Array.isArray(original) ? original[0] : original || request.url || "/";
  return new URL(source, `http://${request.headers.host || "localhost"}`).pathname;
};

const resolveSubdomainSlug = (request, pathname) => {
  if (pathname !== "/") return null;
  const baseDomain = process.env.SITE_BASE_DOMAIN?.toLowerCase().replace(/^\.+|\.+$/g, "");
  const hostname = String(request.headers["x-forwarded-host"] || request.headers.host || "").split(":")[0].toLowerCase();
  if (!baseDomain || hostname === baseDomain || !hostname.endsWith(`.${baseDomain}`)) return null;
  const slug = hostname.slice(0, -(baseDomain.length + 1));
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null;
};
const resolveCustomDomain = (request) => {
  const hostname = String(request.headers["x-forwarded-host"] || request.headers.host || "").split(":")[0].toLowerCase();
  const baseDomain = process.env.SITE_BASE_DOMAIN?.toLowerCase().replace(/^\.+|\.+$/g, "");
  const platformDomains = String(process.env.PLATFORM_DOMAINS || process.env.VERCEL_URL || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".vercel.app") || hostname === baseDomain || platformDomains.includes(hostname) || (baseDomain && hostname.endsWith(`.${baseDomain}`))) return null;
  return hostname;
};
const requestOrigin = (request) => {
  const protocol = String(request.headers["x-forwarded-proto"] || "https").split(",")[0] === "http" ? "http" : "https";
  const host = String(request.headers["x-forwarded-host"] || request.headers.host || "localhost").split(",")[0];
  return `${protocol}://${host}`;
};

export async function resolvePageMetadata(request) {
  const locale = resolveRequestLocale(request);
  const pathname = resolvePagePath(request);
  const match = pathname.match(sitePathPattern);
  const slug = match?.[1] || resolveSubdomainSlug(request, pathname);
  const customDomain = slug ? null : resolveCustomDomain(request);
  if (!slug && !customDomain) return { locale, metadata: platformPageMetadata(locale), statusCode: 200 };

  const payload = customDomain ? await loadPublicSite("", { domain: customDomain }) : await loadPublicSite(slug);
  if (!payload) return { locale, metadata: { ...platformPageMetadata(locale), robots: "noindex,nofollow" }, statusCode: 404 };
  const customListingMatch = customDomain ? pathname.match(/^\/listings\/([0-9a-f-]{36})\/?$/i) : null;
  const listingId = match?.[2] || customListingMatch?.[1];
  const view = listingId ? "detail" : pathname.includes("/listings") ? "listings" : "home";
  const listing = listingId ? payload.listings.find((item) => item.id === listingId) : undefined;
  if (view === "detail" && !listing) return { locale, metadata: { ...publicSitePageMetadata({ payload, view: "listings", locale }), robots: "noindex,nofollow" }, statusCode: 404 };
  const metadata = publicSitePageMetadata({ payload, view, listing, locale });
  const canonicalPath = customDomain ? (view === "detail" ? `/listings/${listing.id}` : view === "listings" ? "/listings" : "/") : (view === "detail" ? `/site/${slug}/listings/${listing.id}` : view === "listings" ? `/site/${slug}/listings` : `/site/${slug}`);
  metadata.canonicalUrl ||= `${requestOrigin(request)}${canonicalPath}`;
  metadata.structuredData = view === "detail" ? {
    "@context": "https://schema.org", "@type": "Residence", name: listing.title, description: listing.description, url: metadata.canonicalUrl,
    image: listing.media?.map((item) => item.url).filter(Boolean), address: { "@type": "PostalAddress", addressLocality: listing.district, addressCountry: "TR" },
    offers: { "@type": "Offer", price: listing.price, priceCurrency: listing.currency || "TRY", availability: "https://schema.org/InStock" },
  } : { "@context": "https://schema.org", "@type": "RealEstateAgent", name: payload.config.business_name, url: metadata.canonicalUrl, image: metadata.ogImage || undefined, telephone: payload.config.theme_config?.content?.phone || undefined };
  return { locale, metadata, statusCode: 200 };
}

export default async function handler(request, response) {
  if (request.method !== "GET" && request.method !== "HEAD") return methodNotAllowed(response, ["GET", "HEAD"]);
  try {
    const html = typeof request.htmlTemplate === "string" ? request.htmlTemplate : await readFile(htmlPath, "utf8");
    const { locale, metadata, statusCode } = await resolvePageMetadata(request);
    const rendered = injectPageMetadata(html, metadata, locale);
    response.statusCode = statusCode;
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    response.setHeader("Vary", "Accept-Language, Cookie");
    response.end(request.method === "HEAD" ? "" : rendered);
  } catch (error) {
    structuredLog("error", "render_page.failed", { error });
    response.statusCode = 500;
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.end("Page metadata could not be rendered.");
  }
}
