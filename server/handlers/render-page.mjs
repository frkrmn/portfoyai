import { readFile } from "node:fs/promises";
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

export const injectPageMetadata = (html, metadata, locale) => {
  let output = html
    .replace(/<html\b[^>]*\blang=["'][^"']*["']/i, `<html lang="${locale}">`)
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(metadata.title)}</title>`);
  output = replaceMeta(output, "name", "description", metadata.description);
  output = replaceMeta(output, "name", "author", metadata.author || "Fastate AI");
  output = replaceMeta(output, "property", "og:title", metadata.title);
  output = replaceMeta(output, "property", "og:description", metadata.description);
  output = replaceMeta(output, "property", "og:type", "website");
  output = replaceMeta(output, "name", "twitter:card", "summary_large_image");
  output = replaceMeta(output, "name", "twitter:title", metadata.title);
  output = replaceMeta(output, "name", "twitter:description", metadata.description);
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

export async function resolvePageMetadata(request) {
  const locale = resolveRequestLocale(request);
  const pathname = resolvePagePath(request);
  const match = pathname.match(sitePathPattern);
  const slug = match?.[1] || resolveSubdomainSlug(request, pathname);
  if (!slug) return { locale, metadata: platformPageMetadata(locale), statusCode: 200 };

  const payload = await loadPublicSite(slug);
  if (!payload) return { locale, metadata: platformPageMetadata(locale), statusCode: 404 };
  const listingId = match?.[2];
  const view = listingId ? "detail" : match && pathname.includes("/listings") ? "listings" : "home";
  const listing = listingId ? payload.listings.find((item) => item.id === listingId) : undefined;
  if (view === "detail" && !listing) return { locale, metadata: publicSitePageMetadata({ payload, view: "listings", locale }), statusCode: 404 };
  return { locale, metadata: publicSitePageMetadata({ payload, view, listing, locale }), statusCode: 200 };
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
    console.error("[render-page] HTML metadata rendering failed", error);
    response.statusCode = 500;
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.end("Page metadata could not be rendered.");
  }
}
