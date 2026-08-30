import { getSupabaseClient, handleKnownError, methodNotAllowed, readJsonBody, sendJson } from "../api-utils.mjs";
import { requireAdmin } from "../admin-auth.mjs";

const localeFrom = (request) => {
  const locale = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`).searchParams.get("locale") || "tr";
  if (!["tr", "en"].includes(locale)) throw new Error("VALIDATION:locale must be tr or en.");
  return locale;
};

const sanitize = (value, path = "content", depth = 0) => {
  if (depth > 6) throw new Error(`VALIDATION:${path} is nested too deeply.`);
  if (typeof value === "string") {
    if (value.length > 2_200_000) throw new Error(`VALIDATION:${path} is too long.`);
    if (path.endsWith("heroImageUrl") && value && !value.startsWith("data:image/") && !value.startsWith("https://") && !value.startsWith("/")) throw new Error("VALIDATION:heroImageUrl is invalid.");
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 50) throw new Error(`VALIDATION:${path} has too many items.`);
    return value.map((item, index) => sanitize(item, `${path}.${index}`, depth + 1));
  }
  if (!value || typeof value !== "object") throw new Error(`VALIDATION:${path} is invalid.`);
  const entries = Object.entries(value);
  if (entries.length > 150) throw new Error(`VALIDATION:${path} has too many fields.`);
  return Object.fromEntries(entries.map(([key, item]) => {
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(key)) throw new Error(`VALIDATION:${path} contains an invalid field.`);
    return [key, sanitize(item, `${path}.${key}`, depth + 1)];
  }));
};

const load = async (locale) => {
  const result = await getSupabaseClient().storage.from("platform-content").download(`${locale}.json`);
  if (result.error) {
    if (result.error.statusCode === "404" || result.error.status === 404 || /not found/i.test(result.error.message || "")) return { locale, content: null, updated_at: null };
    throw new Error(`Failed to load platform content: ${result.error.message}`);
  }
  const stored = JSON.parse(await result.data.text());
  return { locale, content: stored.content || null, updated_at: stored.updated_at || null };
};

const ensureBucket = async () => {
  const storage = getSupabaseClient().storage;
  const buckets = await storage.listBuckets();
  if (buckets.error) throw new Error(`Failed to inspect platform content storage: ${buckets.error.message}`);
  if (buckets.data.some((bucket) => bucket.name === "platform-content")) return;
  const created = await storage.createBucket("platform-content", { public: false, fileSizeLimit: 12 * 1024 * 1024, allowedMimeTypes: ["application/json"] });
  if (created.error) throw new Error(`Failed to create platform content storage: ${created.error.message}`);
};

export const publicPlatformContent = async (request, response) => {
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
  try { return sendJson(response, 200, await load(localeFrom(request))); }
  catch (error) { return handleKnownError(response, error, "[platform-content] Public fetch failed"); }
};

export default async function adminPlatformContent(request, response) {
  if (!["GET", "PATCH"].includes(request.method || "")) return methodNotAllowed(response, ["GET", "PATCH"]);
  try {
    const user = await requireAdmin(request);
    const locale = localeFrom(request);
    if (request.method === "GET") return sendJson(response, 200, { ...(await load(locale)), is_admin: true });
    const body = await readJsonBody(request, 12 * 1024 * 1024);
    const content = sanitize(body.content);
    await ensureBucket();
    const updated_at = new Date().toISOString();
    const document = JSON.stringify({ locale, content, updated_by: user.id, updated_at });
    const result = await getSupabaseClient().storage.from("platform-content").upload(`${locale}.json`, document, { contentType: "application/json", upsert: true });
    if (result.error) throw new Error(`Failed to save platform content: ${result.error.message}`);
    return sendJson(response, 200, { locale, content, updated_at, is_admin: true });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_REQUIRED") return sendJson(response, 403, { error: "Admin access required." });
    return handleKnownError(response, error, "[platform-content] Admin request failed");
  }
}
