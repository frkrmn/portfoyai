import { supabase } from "@/lib/supabase";
import type { LandDocument } from "@/portfoyai/types";

export const LAND_DOCUMENT_BUCKET = "land-documents";
const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const safeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "document";

export async function uploadLandDocument(file: File, siteId: string, listingId: string, kind: LandDocument["kind"]): Promise<LandDocument> {
  if (!allowedTypes.has(file.type)) throw new Error("PDF, JPEG, PNG veya WebP belge yükleyebilirsiniz.");
  if (file.size <= 0 || file.size > 10 * 1024 * 1024) throw new Error("Belge en fazla 10 MB olabilir.");
  const id = crypto.randomUUID();
  const path = `${siteId}/${listingId}/${id}-${safeName(file.name)}`;
  const { error } = await supabase.storage.from(LAND_DOCUMENT_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return { id, name: file.name.slice(0, 200), path, kind, mime_type: file.type, size: file.size, uploaded_at: new Date().toISOString() };
}

export async function signedLandDocumentUrl(path: string) {
  const { data, error } = await supabase.storage.from(LAND_DOCUMENT_BUCKET).createSignedUrl(path, 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function removeLandDocument(path: string) {
  const { error } = await supabase.storage.from(LAND_DOCUMENT_BUCKET).remove([path]);
  if (error) throw error;
}
