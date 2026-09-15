import { getSupabaseClient } from "./api-utils.mjs";

const prefix = "/storage/v1/object/public/site-media/";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const scopes = new Set(["site", "listing", "team"]);
const collectUrls = (value, result = new Set()) => {
  if (typeof value === "string") { if (value.includes(prefix)) result.add(value); return result; }
  if (Array.isArray(value)) { value.forEach((item) => collectUrls(item, result)); return result; }
  if (value && typeof value === "object") Object.values(value).forEach((item) => collectUrls(item, result));
  return result;
};

const trustedStorageOrigin = (supabaseUrl = process.env.SUPABASE_URL) => {
  try { return new URL(supabaseUrl).origin; }
  catch { return null; }
};

export const storagePathFromUrl = (value, { siteId, supabaseUrl } = {}) => {
  try {
    const url = new URL(value);
    const origin = trustedStorageOrigin(supabaseUrl);
    if (!origin || url.origin !== origin || !url.pathname.startsWith(prefix) || !uuid.test(siteId || "")) return null;
    const path = decodeURIComponent(url.pathname.slice(prefix.length));
    const parts = path.split("/");
    if (parts.length !== 4 || !uuid.test(parts[0]) || parts[1] !== siteId || !scopes.has(parts[2]) || !parts[3]) return null;
    return path;
  }
  catch { return null; }
};

export const mediaPathsToRemove = (previous, next, options) => {
  const keep = collectUrls(next);
  return [...collectUrls(previous)].filter((url) => !keep.has(url)).map((url) => storagePathFromUrl(url, options)).filter(Boolean);
};

export async function removeReplacedMedia(previous, next, options) {
  const paths = mediaPathsToRemove(previous, next, options);
  if (!paths.length) return;
  const { error } = await getSupabaseClient().storage.from("site-media").remove(paths);
  if (error) console.error("[media] Failed to remove replaced objects", error);
}
