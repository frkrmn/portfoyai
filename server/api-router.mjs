import experiment from "./handlers/experiment.mjs";
import fonts from "./handlers/fonts.mjs";
import generateTheme from "./handlers/generate-theme.mjs";
import leads from "./handlers/leads.mjs";
import locations from "./handlers/locations.mjs";
import listing from "./handlers/listing.mjs";
import generateListingCopy from "./handlers/listing-copy.mjs";
import socialKit from "./handlers/listing-social-kit.mjs";
import publicSite from "./handlers/public-site.mjs";
import publicSiteContentBackfill from "./handlers/public-site-content-backfill.mjs";
import renderPage from "./handlers/render-page.mjs";
import site from "./handlers/site.mjs";
import siteListings from "./handlers/site-listings.mjs";
import refineSite from "./handlers/site-refine.mjs";
import backfillSiteContent from "./handlers/site-content-backfill.mjs";
import sites from "./handlers/sites.mjs";
import teamMembers from "./handlers/team-members.mjs";
import adminPlatformContent, { publicPlatformContent } from "./handlers/platform-content.mjs";
import { methodNotAllowed, sendJson } from "./api-utils.mjs";

const uuidSource = "([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})";

export const apiRouteInventory = [
  { pattern: /^\/api\/render-page$/, methods: ["GET", "HEAD"], handler: renderPage },
  { pattern: /^\/api\/experiment$/, methods: ["POST"], handler: experiment },
  { pattern: /^\/api\/fonts$/, methods: ["GET"], handler: fonts },
  { pattern: /^\/api\/generate-theme$/, methods: ["POST"], handler: generateTheme },
  { pattern: /^\/api\/platform-content$/, methods: ["GET"], handler: publicPlatformContent },
  { pattern: /^\/api\/admin\/platform-content$/, methods: ["GET", "PATCH"], handler: adminPlatformContent },
  { pattern: /^\/api\/leads$/, methods: ["GET", "POST"], handler: leads },
  { pattern: /^\/api\/locations\/(provinces|districts|neighborhoods)$/, methods: ["GET"], params: ["locationResource"], handler: locations },
  { pattern: new RegExp(`^/api/listings/${uuidSource}/social-kit$`, "i"), methods: ["GET"], params: ["id"], handler: socialKit },
  { pattern: /^\/api\/listings\/generate-copy$/, methods: ["POST"], handler: generateListingCopy },
  { pattern: new RegExp(`^/api/listings/${uuidSource}$`, "i"), methods: ["PATCH", "DELETE"], params: ["id"], handler: listing },
  { pattern: /^\/api\/public-sites\/([a-z0-9]+(?:-[a-z0-9]+)*)$/, methods: ["GET"], params: ["slug"], handler: publicSite },
  { pattern: /^\/api\/public-sites\/([a-z0-9]+(?:-[a-z0-9]+)*)\/content-backfill$/, methods: ["POST"], params: ["slug"], handler: publicSiteContentBackfill },
  { pattern: new RegExp(`^/api/sites/${uuidSource}/listings$`, "i"), methods: ["GET", "POST"], params: ["id"], handler: siteListings },
  { pattern: new RegExp(`^/api/sites/${uuidSource}/team-members$`, "i"), methods: ["GET", "POST"], params: ["siteId"], handler: teamMembers },
  { pattern: new RegExp(`^/api/team-members/${uuidSource}$`, "i"), methods: ["PATCH", "DELETE"], params: ["memberId"], handler: teamMembers },
  { pattern: new RegExp(`^/api/sites/${uuidSource}/refine$`, "i"), methods: ["POST"], params: ["id"], handler: refineSite },
  { pattern: new RegExp(`^/api/sites/${uuidSource}/content-backfill$`, "i"), methods: ["POST"], params: ["id"], handler: backfillSiteContent },
  { pattern: new RegExp(`^/api/sites/${uuidSource}$`, "i"), methods: ["GET", "PATCH"], params: ["id"], handler: site },
  { pattern: /^\/api\/sites$/, methods: ["GET"], handler: sites },
];

const requestPathname = (request) => request.routedApiPath || new URL(
  request.url || "/",
  `${request.headers["x-forwarded-proto"] || "http"}://${request.headers.host || "localhost"}`,
).pathname;

export async function dispatchApiRequest(request, response) {
  const pathname = requestPathname(request);
  for (const route of apiRouteInventory) {
    const match = pathname.match(route.pattern);
    if (!match) continue;
    if (!route.methods.includes(request.method || "")) return methodNotAllowed(response, route.methods);
    request.query = { ...(request.query || {}) };
    route.params?.forEach((name, index) => {
      request.query[name] = decodeURIComponent(match[index + 1]);
    });
    return route.handler(request, response);
  }
  return sendJson(response, 404, { error: "Not found" });
}

export default dispatchApiRequest;
