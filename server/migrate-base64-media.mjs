import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const bucket = "site-media";

const decode = (value) => {
  const match = /^data:(image\/(?:jpeg|png|webp|avif));base64,(.+)$/s.exec(value);
  return match ? { contentType: match[1], bytes: Buffer.from(match[2], "base64") } : null;
};

const upload = async (value, ownerId, siteId, scope) => {
  const decoded = decode(value);
  if (!decoded) return value;
  const hash = createHash("sha256").update(decoded.bytes).digest("hex");
  const extension = decoded.contentType.split("/")[1].replace("jpeg", "jpg");
  const path = `${ownerId}/${siteId}/${scope}/legacy-${hash}.${extension}`;
  const result = await supabase.storage.from(bucket).upload(path, decoded.bytes, { contentType: decoded.contentType, cacheControl: "31536000", upsert: false });
  if (result.error && !/already exists|duplicate/i.test(result.error.message)) throw result.error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
};

const migrateThemeMedia = async (config, ownerId, siteId) => {
  if (!config?.media || typeof config.media !== "object") return { config, changed: false };
  const media = { ...config.media };
  let changed = false;
  for (const [slot, current] of Object.entries(media)) {
    if (typeof current === "string" && current.startsWith("data:")) { media[slot] = await upload(current, ownerId, siteId, `site/${slot}`); changed = true; }
    if (Array.isArray(current)) media[slot] = await Promise.all(current.map(async (item) => {
      if (typeof item !== "string" || !item.startsWith("data:")) return item;
      changed = true; return upload(item, ownerId, siteId, `site/${slot}`);
    }));
  }
  return { config: changed ? { ...config, media } : config, changed };
};

const { data: sites, error: sitesError } = await supabase.from("sites").select("id,user_id,theme_config,previous_theme_config");
if (sitesError) throw sitesError;
for (const site of sites || []) {
  const current = await migrateThemeMedia(site.theme_config, site.user_id, site.id);
  const previous = await migrateThemeMedia(site.previous_theme_config, site.user_id, site.id);
  if (current.changed || previous.changed) {
    const { error } = await supabase.from("sites").update({ theme_config: current.config, previous_theme_config: previous.config }).eq("id", site.id);
    if (error) throw error;
  }
  const { data: listings, error: listingsError } = await supabase.from("listings").select("id,media").eq("site_id", site.id);
  if (listingsError) throw listingsError;
  for (const listing of listings || []) {
    let changed = false;
    const media = await Promise.all((listing.media || []).map(async (item, order) => {
      const next = { ...item, order };
      if (typeof item.url === "string" && item.url.startsWith("data:")) { next.url = await upload(item.url, site.user_id, site.id, "listing"); changed = true; }
      if (typeof item.thumbUrl === "string" && item.thumbUrl.startsWith("data:")) { next.thumbUrl = next.url; changed = true; }
      return next;
    }));
    if (changed) { const { error } = await supabase.from("listings").update({ media }).eq("id", listing.id); if (error) throw error; }
  }
  const { data: members, error: membersError } = await supabase.from("team_members").select("id,photo_url").eq("site_id", site.id);
  if (membersError) throw membersError;
  for (const member of members || []) if (member.photo_url?.startsWith("data:")) {
    const photo_url = await upload(member.photo_url, site.user_id, site.id, "team");
    const { error } = await supabase.from("team_members").update({ photo_url }).eq("id", member.id); if (error) throw error;
  }
}
console.info(`Base64 media migration completed for ${(sites || []).length} sites.`);
