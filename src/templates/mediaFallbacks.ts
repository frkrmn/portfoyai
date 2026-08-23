import type { Listing } from "@/portfoyai/types";

export const listingPlaceholderImages = [
  "/images/listings/bagdat-residence.jpg",
  "/images/listings/caddebostan-sea-view.jpg",
  "/images/listings/fenerbahce-garden.jpg",
  "/images/listings/moda-character.jpg",
  "/images/listings/suadiye-penthouse.jpg",
  "/images/listings/bagdat-residence-alt.jpg",
] as const;

export const agentPlaceholderImages = [
  "/images/agents/neighborhood-advisor.png",
] as const;

export const heroPlaceholderImages = [
  "/images/agents/neighborhood-street-hero.png",
] as const;

const stableHash = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const uploadedListingImages = (listing?: Listing) => (listing?.media || [])
  .map((item) => item?.url || item?.thumbUrl || "")
  .filter(Boolean);

/** Uploaded media always wins; placeholders are used only for an empty media array. */
export const getListingImage = (listing?: Listing, galleryIndex = 0) => {
  const uploaded = uploadedListingImages(listing);
  if (uploaded.length) return uploaded[galleryIndex % uploaded.length];
  const seed = listing?.id || "listing-placeholder";
  return listingPlaceholderImages[(stableHash(seed) + galleryIndex) % listingPlaceholderImages.length];
};

const siteImage = (siteId: string, uploaded: string | undefined, pool: readonly string[]) => {
  if (uploaded?.trim()) return uploaded;
  return pool[stableHash(siteId || "site-placeholder") % pool.length];
};

export const getAgentImage = (siteId: string, uploaded?: string) => siteImage(siteId, uploaded, agentPlaceholderImages);
export const getHeroImage = (siteId: string, uploaded?: string) => siteImage(siteId, uploaded, heroPlaceholderImages);
