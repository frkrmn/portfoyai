const positive = (value) => Number.isFinite(Number(value)) && Number(value) > 0;
const isoDate = (value) => typeof value === "string" && Number.isFinite(Date.parse(value));

export function sanitizePriceHistory(value, { includeActor = false } = {}) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((event) => {
    if (!positive(event?.old_price) || !positive(event?.new_price) || !isoDate(event?.changed_at) || !["TRY", "USD", "EUR", "GBP"].includes(event?.currency)) return [];
    return [{ old_price: Number(event.old_price), new_price: Number(event.new_price), currency: event.currency, changed_at: event.changed_at, ...(includeActor && typeof event.changed_by === "string" ? { changed_by: event.changed_by } : {}) }];
  }).slice(-50);
}

export function verifiedReduction(listing) {
  const latest = sanitizePriceHistory(listing?.price_history).at(-1);
  if (!latest || latest.currency !== listing?.currency || latest.new_price !== Number(listing?.price) || latest.old_price <= latest.new_price) return null;
  const discount_percent = Math.round((1 - latest.new_price / latest.old_price) * 1000) / 10;
  return discount_percent > 0 && discount_percent < 100 ? { ...latest, discount_percent } : null;
}

export function verifiedUrgency(listing, now = new Date()) {
  return listing?.urgent_sale === true && isoDate(listing?.urgent_verified_at) && isoDate(listing?.urgent_expires_at) && Date.parse(listing.urgent_verified_at) <= now.getTime() && Date.parse(listing.urgent_expires_at) > now.getTime();
}

export function isVerifiedDeal(listing, now = new Date()) {
  return verifiedUrgency(listing, now) || verifiedReduction(listing) != null;
}

export function auditDealClaims(listing, now = new Date()) {
  const issues = [];
  if (listing?.urgent_sale === true && !verifiedUrgency(listing, now)) issues.push("urgency_unverified");
  if (listing?.price_reduced_from != null && !verifiedReduction(listing)) issues.push("reduction_unverified");
  const history = sanitizePriceHistory(listing?.price_history);
  if (history.length && !verifiedReduction(listing) && history.at(-1)?.new_price !== Number(listing?.price)) issues.push("price_history_stale");
  return issues;
}

export function appendPriceChange(history, { oldPrice, newPrice, currency, changedAt, changedBy }) {
  if (!positive(oldPrice) || !positive(newPrice) || oldPrice === newPrice || !isoDate(changedAt) || !changedBy) return sanitizePriceHistory(history, { includeActor: true });
  return [...sanitizePriceHistory(history, { includeActor: true }), { old_price: Number(oldPrice), new_price: Number(newPrice), currency, changed_at: changedAt, changed_by: changedBy }].slice(-50);
}
