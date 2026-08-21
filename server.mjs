import { createServer as createHttpServer } from "node:http";
import { readFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { createServer as createViteServer, loadEnv } from "vite";
import { insertGeneratedSite } from "./server/site-persistence.mjs";

const fileEnv = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
for (const [key, value] of Object.entries(fileEnv)) {
  if (process.env[key] === undefined) process.env[key] = value;
}

const portArgIndex = process.argv.indexOf("--port");
const port = Number(portArgIndex >= 0 ? process.argv[portArgIndex + 1] : process.env.PORT || 4173);
const hostArgIndex = process.argv.indexOf("--host");
const host = hostArgIndex >= 0 ? process.argv[hostArgIndex + 1] : "0.0.0.0";

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
};

const readJsonBody = async (request) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 32_768) throw new Error("Request body is too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
};

let supabaseClient;
const getSupabaseClient = () => {
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

const getSessionId = (request) => {
  const value = request.headers["x-session-id"];
  const sessionId = Array.isArray(value) ? value[0] : value;
  return typeof sessionId === "string" && sessionId.length >= 16 && sessionId.length <= 128
    ? sessionId
    : null;
};

const getAccessToken = (request) => {
  const authorization = request.headers.authorization;
  if (typeof authorization !== "string" || !authorization.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim() || null;
};

const getAuthenticatedUser = async (request, required = true) => {
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

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const siteConfigSchema = JSON.parse(
  readFileSync(new URL("./server/site-config.schema.json", import.meta.url), "utf8"),
);
const siteConfigModel = "gemini-3.5-flash-lite";
const siteConfigSystemPrompt = [
  "You are the brand design engine for PortföyAI, a premium Turkish real-estate website builder.",
  "Convert the user's description into one confident website identity.",
  "Return only the JSON object required by the supplied schema.",
  "The headline must be polished Turkish and no longer than 12 words.",
  "Use sophisticated, accessible colors with strong text contrast. Avoid generic bright SaaS gradients.",
  "Do not inspect files, call tools, or modify anything.",
].join("\n");

const handleGenerateTheme = async (request, response) => {
  try {
    const body = await readJsonBody(request);
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (prompt.length < 10) {
      return sendJson(response, 400, { error: "Please describe the real-estate business in at least 10 characters." });
    }
    const sessionId = getSessionId(request);
    if (!sessionId) {
      return sendJson(response, 400, { error: "Missing or invalid X-Session-ID header." });
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is not set.");
    }

    const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.info(`[generate-theme] Starting Gemini generation with ${siteConfigModel}`);
    const startedAt = Date.now();
    const result = await gemini.models.generateContent({
      model: siteConfigModel,
      contents: `USER BUSINESS DESCRIPTION:\n${prompt}`,
      config: {
        systemInstruction: siteConfigSystemPrompt,
        responseMimeType: "application/json",
        responseSchema: siteConfigSchema,
      },
    });
    if (!result.text) {
      throw new Error("Gemini returned an empty response.");
    }

    const config = JSON.parse(result.text);
    const model = result.modelVersion || siteConfigModel;
    console.info(`[generate-theme] Gemini structured response received in ${Date.now() - startedAt}ms; model=${model}`);

    const user = await getAuthenticatedUser(request, false);
    const site = await insertGeneratedSite(getSupabaseClient(), config, sessionId, user?.id ?? null);

    return sendJson(response, 200, {
      config,
      site_id: site.id,
      slug: site.slug,
      public_path: `/site/${site.slug}`,
      meta: {
        provider: "gemini",
        model,
      },
    });
  } catch (error) {
    console.error("[generate-theme] Gemini generation failed", error);
    return sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
};

const handleGetPublicSite = async (response, slug) => {
  try {
    const { data: site, error } = await getSupabaseClient()
      .from("sites")
      .select("id, slug, business_name, tone, primary_color, accent_color, headline, status, created_at")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error(`Failed to load public site: ${error.message}`);
    if (!site) return sendJson(response, 404, { error: "Site not found." });

    return sendJson(response, 200, {
      id: site.id,
      slug: site.slug,
      config: {
        business_name: site.business_name,
        tone: site.tone,
        primary_color: site.primary_color,
        accent_color: site.accent_color,
        headline: site.headline,
      },
      status: site.status,
      created_at: site.created_at,
    });
  } catch (error) {
    console.error("[public-sites] Site fetch failed", error);
    return sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
};

const handleGetSite = async (request, response, siteId) => {
  try {
    const sessionId = getSessionId(request);
    const user = await getAuthenticatedUser(request, false);
    if (!sessionId && !user) return sendJson(response, 401, { error: "Authentication or a browser session is required." });

    let query = getSupabaseClient()
      .from("sites")
      .select("id, slug, user_id, business_name, tone, primary_color, accent_color, headline, status, created_at")
      .eq("id", siteId);
    query = user
      ? query.eq("user_id", user.id)
      : query.eq("session_id", sessionId).is("user_id", null);
    const { data: site, error } = await query.maybeSingle();
    if (error) throw new Error(`Failed to load site: ${error.message}`);
    if (!site) return sendJson(response, 404, { error: "Site not found." });

    return sendJson(response, 200, {
      id: site.id,
      slug: site.slug,
      config: {
        business_name: site.business_name,
        tone: site.tone,
        primary_color: site.primary_color,
        accent_color: site.accent_color,
        headline: site.headline,
      },
      status: site.status,
      is_owner: Boolean(user && site.user_id === user.id),
      created_at: site.created_at,
    });
  } catch (error) {
    console.error("[sites] Site fetch failed", error);
    return sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
};

const handleClaimSites = async (request, response) => {
  try {
    const user = await getAuthenticatedUser(request);
    const sessionId = getSessionId(request);
    if (!sessionId) return sendJson(response, 400, { error: "Missing or invalid X-Session-ID header." });

    // The null ownership predicate makes claiming atomic: a guest row can only be
    // claimed once, even if auth events fire more than once or requests race.
    const { data: claimed, error: claimError } = await getSupabaseClient()
      .from("sites")
      .update({ user_id: user.id })
      .eq("session_id", sessionId)
      .is("user_id", null)
      .select("id");
    if (claimError) throw new Error(`Failed to claim guest sites: ${claimError.message}`);

    // Include already-claimed rows so the operation is idempotent for this user.
    const { data: owned, error: ownedError } = await getSupabaseClient()
      .from("sites")
      .select("id")
      .eq("session_id", sessionId)
      .eq("user_id", user.id);
    if (ownedError) throw new Error(`Failed to verify claimed sites: ${ownedError.message}`);

    return sendJson(response, 200, {
      claimedSiteIds: [...new Set([...(claimed || []), ...(owned || [])].map((site) => site.id))],
    });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return sendJson(response, 401, { error: "Authentication required." });
    console.error("[auth] Guest site claim failed", error);
    return sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
};

const handleGetOwnedSites = async (request, response) => {
  try {
    const user = await getAuthenticatedUser(request);
    const { data, error } = await getSupabaseClient()
      .from("sites")
      .select("id, slug, business_name, headline, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Failed to load owned sites: ${error.message}`);
    return sendJson(response, 200, { sites: data || [] });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return sendJson(response, 401, { error: "Authentication required." });
    console.error("[sites] Owned site fetch failed", error);
    return sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
};

const handlePublishSite = async (request, response, siteId) => {
  try {
    const user = await getAuthenticatedUser(request);
    const body = await readJsonBody(request);
    if (body.status !== "published") return sendJson(response, 400, { error: "Only publishing is supported." });

    const { data: site, error } = await getSupabaseClient()
      .from("sites")
      .update({ status: "published" })
      .eq("id", siteId)
      .eq("user_id", user.id)
      .select("id, slug, business_name, headline, status, created_at")
      .maybeSingle();
    if (error) throw new Error(`Failed to publish site: ${error.message}`);
    if (!site) return sendJson(response, 404, { error: "Owned site not found." });
    return sendJson(response, 200, { site });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return sendJson(response, 401, { error: "Authentication required." });
    console.error("[sites] Site publish failed", error);
    return sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
};

const handleCreateLead = async (request, response) => {
  try {
    const body = await readJsonBody(request);
    const siteId = typeof body.site_id === "string" ? body.site_id.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!uuidPattern.test(siteId)) return sendJson(response, 400, { error: "A valid site_id is required." });
    if (!name) return sendJson(response, 400, { error: "Name is required." });
    if (!phone) return sendJson(response, 400, { error: "Phone is required." });
    if (name.length > 120) return sendJson(response, 400, { error: "Name must be 120 characters or fewer." });
    if (phone.length < 5 || phone.length > 40) return sendJson(response, 400, { error: "Phone must be between 5 and 40 characters." });
    if (message.length > 2000) return sendJson(response, 400, { error: "Message must be 2000 characters or fewer." });

    const { data: site, error: siteError } = await getSupabaseClient()
      .from("sites")
      .select("id")
      .eq("id", siteId)
      .maybeSingle();
    if (siteError) throw new Error(`Failed to validate lead site: ${siteError.message}`);
    if (!site) return sendJson(response, 404, { error: "Site not found." });

    let { data: lead, error } = await getSupabaseClient()
      .from("leads")
      .insert({ site_id: site.id, name, phone, message: message || null })
      .select("id, created_at")
      .single();
    // Older PortföyAI databases had an additional required `source` column.
    // Retry only that known compatibility case; new schemas retain the exact
    // smaller lead payload requested above.
    if (error?.code === "23502" && error.message.includes("source")) {
      const retry = await getSupabaseClient()
        .from("leads")
        .insert({ site_id: site.id, name, phone, message: message || null, source: "public-site" })
        .select("id, created_at")
        .single();
      lead = retry.data;
      error = retry.error;
    }
    if (error) throw new Error(`Failed to save lead: ${error.message}`);

    return sendJson(response, 201, { id: lead.id, created_at: lead.created_at });
  } catch (error) {
    console.error("[leads] Lead creation failed", error);
    return sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
};

const handleGetOwnedLeads = async (request, response) => {
  try {
    const user = await getAuthenticatedUser(request);
    const { data: sites, error: sitesError } = await getSupabaseClient()
      .from("sites")
      .select("id")
      .eq("user_id", user.id);
    if (sitesError) throw new Error(`Failed to load lead sites: ${sitesError.message}`);
    const siteIds = (sites || []).map((site) => site.id);
    if (siteIds.length === 0) return sendJson(response, 200, { leads: [] });

    const { data: leads, error } = await getSupabaseClient()
      .from("leads")
      .select("id, site_id, name, phone, message, created_at")
      .in("site_id", siteIds)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Failed to load owned leads: ${error.message}`);
    return sendJson(response, 200, { leads: leads || [] });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return sendJson(response, 401, { error: "Authentication required." });
    console.error("[leads] Owned lead fetch failed", error);
    return sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
};

const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "spa",
});

const server = createHttpServer(async (request, response) => {
  const pathname = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`).pathname;
  if (pathname === "/api/generate-theme") {
    if (request.method !== "POST") {
      response.setHeader("Allow", "POST");
      return sendJson(response, 405, { error: "Method not allowed" });
    }
    return handleGenerateTheme(request, response);
  }
  if (pathname === "/api/auth/claim-sites") {
    if (request.method !== "POST") {
      response.setHeader("Allow", "POST");
      return sendJson(response, 405, { error: "Method not allowed" });
    }
    return handleClaimSites(request, response);
  }
  if (pathname === "/api/sites") {
    if (request.method !== "GET") {
      response.setHeader("Allow", "GET");
      return sendJson(response, 405, { error: "Method not allowed" });
    }
    return handleGetOwnedSites(request, response);
  }
  if (pathname === "/api/leads") {
    if (request.method === "POST") return handleCreateLead(request, response);
    if (request.method === "GET") return handleGetOwnedLeads(request, response);
    response.setHeader("Allow", "GET, POST");
    return sendJson(response, 405, { error: "Method not allowed" });
  }
  const publicSiteRoute = pathname.match(/^\/api\/public-sites\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  if (publicSiteRoute) {
    if (request.method !== "GET") {
      response.setHeader("Allow", "GET");
      return sendJson(response, 405, { error: "Method not allowed" });
    }
    return handleGetPublicSite(response, publicSiteRoute[1]);
  }
  const siteRoute = pathname.match(/^\/api\/sites\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i);
  if (siteRoute) {
    if (request.method === "PATCH") return handlePublishSite(request, response, siteRoute[1]);
    if (request.method !== "GET") {
      response.setHeader("Allow", "GET, PATCH");
      return sendJson(response, 405, { error: "Method not allowed" });
    }
    return handleGetSite(request, response, siteRoute[1]);
  }
  vite.middlewares(request, response, () => {
    sendJson(response, 404, { error: "Not found" });
  });
});

server.listen(port, host, () => {
  console.info(`PortföyAI dev server running at http://localhost:${port}`);
});
