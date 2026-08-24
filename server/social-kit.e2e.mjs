import { readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";
import { buildSocialKitImage, placeholderImageFor } from "./handlers/listing-social-kit.mjs";

const env = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase service credentials are required.");
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const preferred = await supabase.from("sites").select("id, business_name, primary_color, accent_color, theme_config, created_at").eq("slug", "kisisel-emlak-rehberi").maybeSingle();
if (preferred.error) throw preferred.error;
let site = preferred.data;
if (!site) {
  const latest = await supabase.from("sites").select("id, business_name, primary_color, accent_color, theme_config, created_at").order("created_at", { ascending: false }).limit(1).single();
  if (latest.error) throw latest.error;
  site = latest.data;
}
const listings = await supabase.from("listings").select("*").eq("site_id", site.id).order("created_at", { ascending: false });
if (listings.error) throw listings.error;
const listing = listings.data.find((item) => !Array.isArray(item.media) || item.media.length === 0);
if (!listing) throw new Error("No auto-seeded listing with empty media was found for the test site.");

const placeholder = placeholderImageFor(listing.id);
const bytes = await readFile(`${process.cwd()}/public${placeholder}`);
const background = `data:image/jpeg;base64,${bytes.toString("base64")}`;

const render = async (format) => {
  const startedAt = Date.now();
  const response = buildSocialKitImage({ listing, site, background, format });
  const png = Buffer.from(await response.arrayBuffer());
  const path = `/private/tmp/portfoyai-social-${format}.png`;
  await writeFile(path, png);
  return { format, path, width: png.readUInt32BE(16), height: png.readUInt32BE(20), bytes: png.length, renderMs: Date.now() - startedAt };
};

const output = {
  site: { id: site.id, business_name: site.business_name, primary: site.theme_config?.colors?.primary || site.primary_color, accent: site.theme_config?.colors?.accent || site.accent_color },
  listing: { id: listing.id, title: listing.title, district: listing.district, price: listing.price, m2: listing.m2, room_count: listing.room_count, media: listing.media },
  placeholder,
  images: [await render("post"), await render("story")],
};
console.info(JSON.stringify(output, null, 2));
if (output.images[0].width !== 1080 || output.images[0].height !== 1080 || output.images[1].width !== 1080 || output.images[1].height !== 1920) process.exitCode = 1;
