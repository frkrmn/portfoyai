import { getSupabaseClient } from "./api-utils.mjs";

const paths = (listing) => Array.isArray(listing?.land_details?.documents)
  ? listing.land_details.documents.map((item) => item?.path).filter((path) => typeof path === "string")
  : [];

export const landDocumentPathsToRemove = (before, after = null) => {
  const retained = new Set(paths(after));
  return paths(before).filter((path) => !retained.has(path));
};

export async function removeLandDocuments(before, after = null) {
  const removable = landDocumentPathsToRemove(before, after);
  if (!removable.length) return;
  const { error } = await getSupabaseClient().storage.from("land-documents").remove(removable);
  if (error) throw new Error(`Failed to remove land documents: ${error.message}`);
}
