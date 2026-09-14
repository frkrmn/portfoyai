export const GUIDED_MATCH_SCHEMA_VERSION = 1;

const clean = (value, max = 120) => typeof value === "string" ? value.trim().slice(0, max) : "";
export function sanitizeGuidedAnswers(value) {
  const answers = { location: clean(value?.location), feeling: clean(value?.feeling), timing: clean(value?.timing), property_type: clean(value?.property_type, 40), min_price: Number(value?.min_price) || null, max_price: Number(value?.max_price) || null };
  if (answers.min_price != null && answers.min_price < 0 || answers.max_price != null && answers.max_price < 0 || answers.min_price != null && answers.max_price != null && answers.min_price > answers.max_price) throw new Error("VALIDATION:Invalid guided match budget.");
  if (!answers.location && !answers.feeling && !answers.timing && !answers.property_type && answers.min_price == null && answers.max_price == null) throw new Error("VALIDATION:At least one preference is required.");
  return answers;
}

const includes = (haystack, needle) => clean(haystack, 1000).toLocaleLowerCase("tr-TR").includes(clean(needle).toLocaleLowerCase("tr-TR"));
export function scoreGuidedListing(listing, answers, locale = "tr") {
  let earned = 0; let possible = 0; const reasons = [];
  if (answers.location) { possible += 40; if (includes(`${listing.district || ""} ${listing.address || ""} ${listing.title || ""}`, answers.location)) { earned += 40; reasons.push(locale === "en" ? `Matches ${answers.location}` : `${answers.location} konumuyla eşleşiyor`); } }
  if (answers.min_price != null || answers.max_price != null) { possible += 35; const price = Number(listing.price); if ((!answers.min_price || price >= answers.min_price) && (!answers.max_price || price <= answers.max_price)) { earned += 35; reasons.push(locale === "en" ? "Within your budget" : "Bütçe aralığınızda"); } }
  if (answers.property_type) { possible += 15; if (listing.property_category === answers.property_type || listing.property_subtype === answers.property_type) { earned += 15; reasons.push(locale === "en" ? "Matches property type" : "Emlak türü tercihinizle eşleşiyor"); } }
  if (answers.feeling) { possible += 10; if (includes(`${listing.description || ""} ${(listing.features || []).join(" ")}`, answers.feeling)) { earned += 10; reasons.push(locale === "en" ? `Reflects “${answers.feeling}”` : `“${answers.feeling}” hissini yansıtıyor`); } }
  return { listing_id: listing.id, score: possible ? Math.round(earned / possible * 100) : 0, reasons };
}

export function rankGuidedListings(listings, answers, locale = "tr") {
  return listings.map((listing) => scoreGuidedListing(listing, answers, locale)).filter((result) => result.score > 0).sort((a, b) => b.score - a.score || String(a.listing_id).localeCompare(String(b.listing_id))).slice(0, 6);
}

export function guidedMatchSummary(answers, results, locale = "tr") {
  const preferences = [answers.location, answers.feeling, answers.timing].filter(Boolean).join(" · ");
  return locale === "en" ? `${results.length} match${results.length === 1 ? "" : "es"}${preferences ? ` for ${preferences}` : ""}.` : `${preferences ? `${preferences} tercihleri için ` : ""}${results.length} eşleşme bulundu.`;
}
