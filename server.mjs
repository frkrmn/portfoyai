import { createServer as createHttpServer } from "node:http";
import { createServer as createViteServer, loadEnv } from "vite";
import generateTheme from "./api/generate-theme.js";
import claimSites from "./api/auth/claim-sites.js";
import sitesIndex from "./api/sites/index.js";
import siteById from "./api/sites/[id].js";
import refineSite from "./api/sites/[id]/refine.js";
import siteListings from "./api/sites/[id]/listings.js";
import listingById from "./api/listings/[id].js";
import generateListingCopy from "./api/listings/generate-copy.js";
import socialKit from "./api/listings/[id]/social-kit.js";
import leads from "./api/leads.js";
import publicSiteBySlug from "./api/public-sites/[slug].js";
import experiment from "./api/experiment.js";
import { sendJson } from "./server/api-utils.mjs";

const fileEnv = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
for (const [key, value] of Object.entries(fileEnv)) {
  if (process.env[key] === undefined) process.env[key] = value;
}

const portArgIndex = process.argv.indexOf("--port");
const port = Number(portArgIndex >= 0 ? process.argv[portArgIndex + 1] : process.env.PORT || 4173);
const hostArgIndex = process.argv.indexOf("--host");
const host = hostArgIndex >= 0 ? process.argv[hostArgIndex + 1] : "0.0.0.0";

const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });

const server = createHttpServer(async (request, response) => {
  const pathname = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`).pathname;
  request.query = {};

  if (pathname === "/api/generate-theme") return generateTheme(request, response);
  if (pathname === "/api/auth/claim-sites") return claimSites(request, response);
  if (pathname === "/api/sites") return sitesIndex(request, response);
  if (pathname === "/api/leads") return leads(request, response);
  if (pathname === "/api/experiment") return experiment(request, response);
  if (pathname === "/api/listings/generate-copy") return generateListingCopy(request, response);

  const publicSiteMatch = pathname.match(/^\/api\/public-sites\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  if (publicSiteMatch) {
    request.query.slug = publicSiteMatch[1];
    return publicSiteBySlug(request, response);
  }

  const siteListingsMatch = pathname.match(/^\/api\/sites\/([0-9a-f-]{36})\/listings$/i);
  if (siteListingsMatch) {
    request.query.id = siteListingsMatch[1];
    return siteListings(request, response);
  }

  const siteRefineMatch = pathname.match(/^\/api\/sites\/([0-9a-f-]{36})\/refine$/i);
  if (siteRefineMatch) {
    request.query.id = siteRefineMatch[1];
    return refineSite(request, response);
  }

  const listingMatch = pathname.match(/^\/api\/listings\/([0-9a-f-]{36})$/i);
  if (listingMatch) {
    request.query.id = listingMatch[1];
    return listingById(request, response);
  }

  const socialKitMatch = pathname.match(/^\/api\/listings\/([0-9a-f-]{36})\/social-kit$/i);
  if (socialKitMatch) {
    request.query.id = socialKitMatch[1];
    return socialKit(request, response);
  }

  const siteMatch = pathname.match(/^\/api\/sites\/([0-9a-f-]{36})$/i);
  if (siteMatch) {
    request.query.id = siteMatch[1];
    return siteById(request, response);
  }

  vite.middlewares(request, response, () => sendJson(response, 404, { error: "Not found" }));
});

server.listen(port, host, () => {
  console.info(`PortföyAI dev server running at http://localhost:${port}`);
});
