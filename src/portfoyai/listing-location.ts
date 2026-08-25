import type { Listing } from "./types";

type ListingLocation = Pick<Listing, "district" | "province_name" | "district_name" | "neighborhood_name">;

/**
 * Shows the structured location exactly in the order selected in the form.
 * Listings created before structured locations keep their legacy district text.
 */
export function formatListingLocation(listing: ListingLocation): string {
  const parts = [listing.province_name, listing.district_name || listing.district, listing.neighborhood_name].filter(
    (part): part is string => Boolean(part?.trim()),
  );
  return parts.length > 1 ? parts.join(" / ") : listing.district;
}
