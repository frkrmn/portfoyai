const text = (value) => typeof value === "string" && Boolean(value.trim());

const hasEnglishGap = (value) => {
  if (Array.isArray(value)) return value.some(hasEnglishGap);
  if (!value || typeof value !== "object") return false;
  if (text(value.tr)) return !text(value.en);
  return Object.values(value).some(hasEnglishGap);
};

export function auditPublishQuality({ site, listings = [], imageKeys = [], unsaved = false }) {
  const content = site?.theme_config?.content || {};
  const media = site?.theme_config?.media || {};
  const seo = site?.theme_config?.seo || {};
  const critical = [];
  const warnings = [];
  const add = (severity, id, target, count) => (severity === "critical" ? critical : warnings).push({ id, severity, target, ...(count ? { count } : {}) });

  if (!text(site?.business_name) || !text(site?.headline)) add("critical", "identity", "site");
  if (!text(content.phone) && !text(content.email)) add("critical", "contact", "site");
  if (!listings.some((listing) => listing.status === "active" && (listing.listing_status || "active") === "active")) add("critical", "activeListing", "listings");
  if (unsaved) add("critical", "unsaved", "content");

  const missingImages = imageKeys.filter((key) => {
    const value = media[key.replace(/^media\./, "")];
    return Array.isArray(value) ? value.length === 0 : !text(value);
  }).length;
  if (missingImages) add("warning", "siteImages", "images", missingImages);
  const listingsWithoutPhotos = listings.filter((listing) => !listing.media?.length).length;
  if (listingsWithoutPhotos) add("warning", "listingPhotos", "listings", listingsWithoutPhotos);
  const imagesWithoutAlt = listings.reduce((count, listing) => count + (listing.media || []).filter((item) => !text(item.alt)).length, 0);
  if (imagesWithoutAlt) add("warning", "imageAlt", "listings", imagesWithoutAlt);
  if (hasEnglishGap(content)) add("warning", "english", "content");
  if (!text(seo.title?.tr) || !text(seo.description?.tr)) add("warning", "seo", "site");
  if (!text(content.mapUrl)) add("warning", "map", "site");

  return { critical, warnings, canPublish: critical.length === 0 };
}
