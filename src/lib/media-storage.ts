import { supabase } from "@/lib/supabase";

export const MEDIA_BUCKET = "site-media";

export type StoredMedia = { id: string; url: string; thumbUrl: string; alt: string; size: number; order: number };

const safeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "image";

const renderWebp = async (file: File, maxWidth: number, quality: number) => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Görsel dönüştürülemedi.")), "image/webp", quality));
};

const uploadBlob = async (path: string, blob: Blob) => {
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, blob, { contentType: "image/webp", upsert: false, cacheControl: "31536000" });
  if (error) throw error;
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
};

export async function uploadImage(file: File, siteId: string, scope: "site" | "listing" | "team", order = 0): Promise<StoredMedia> {
  if (!file.type.startsWith("image/")) throw new Error("Yalnızca görsel dosyaları yüklenebilir.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Görsel en fazla 10 MB olabilir.");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Görsel yüklemek için giriş yapmalısınız.");
  const id = crypto.randomUUID();
  const base = `${user.id}/${siteId}/${scope}/${id}-${safeName(file.name)}`;
  const [main, thumb] = await Promise.all([renderWebp(file, 1920, 0.84), renderWebp(file, 640, 0.78)]);
  const [url, thumbUrl] = await Promise.all([uploadBlob(`${base}.webp`, main), uploadBlob(`${base}-thumb.webp`, thumb)]);
  return { id, url, thumbUrl, alt: file.name.replace(/\.[^.]+$/, ""), size: main.size, order };
}
