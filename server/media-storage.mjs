import { getSupabaseClient } from "./api-utils.mjs";

const prefix = "/storage/v1/object/public/site-media/";
const collectUrls = (value, result = new Set()) => {
  if (typeof value === "string") { if (value.includes(prefix)) result.add(value); return result; }
  if (Array.isArray(value)) { value.forEach((item) => collectUrls(item, result)); return result; }
  if (value && typeof value === "object") Object.values(value).forEach((item) => collectUrls(item, result));
  return result;
};

const pathFromUrl = (value) => {
  try { const url = new URL(value); const index = url.pathname.indexOf(prefix); return index < 0 ? null : decodeURIComponent(url.pathname.slice(index + prefix.length)); }
  catch { return null; }
};

export const mediaPathsToRemove = (previous, next) => {
  const keep = collectUrls(next);
  return [...collectUrls(previous)].filter((url) => !keep.has(url)).map(pathFromUrl).filter(Boolean);
};

export async function removeReplacedMedia(previous, next) {
  const paths = mediaPathsToRemove(previous, next);
  if (!paths.length) return;
  const { error } = await getSupabaseClient().storage.from("site-media").remove(paths);
  if (error) console.error("[media] Failed to remove replaced objects", error);
}
