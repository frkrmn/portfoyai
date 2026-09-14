export const INVESTMENT_METRIC_KEYS = ["rental_yield", "price_per_m2"];

const finitePositive = (value) =>
  Number.isFinite(Number(value)) && Number(value) > 0;
const validDate = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

export function sanitizeInvestmentMetrics(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    INVESTMENT_METRIC_KEYS.flatMap((key) => {
      const metric = value[key];
      if (!metric || typeof metric !== "object" || Array.isArray(metric))
        return [];
      const source = String(metric.source || "")
        .trim()
        .slice(0, 240);
      const asOf = validDate(metric.as_of) ? metric.as_of : "";
      const status = ["actual", "estimate"].includes(metric.status)
        ? metric.status
        : "estimate";
      return [
        [key, { source, as_of: asOf, status, hidden: metric.hidden === true }],
      ];
    }),
  );
}

export function calculatePricePerM2(listing) {
  return finitePositive(listing?.price) && finitePositive(listing?.m2)
    ? Number(listing.price) / Number(listing.m2)
    : null;
}

export function calculateAverageYield(listings = []) {
  const values = listings
    .filter(
      (listing) =>
        !listing?.investment_metrics?.rental_yield?.hidden &&
        finitePositive(listing?.rental_yield_percent),
    )
    .map((listing) => Number(listing.rental_yield_percent));
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
}

export function isInvestmentMetricStale(
  metric,
  now = new Date(),
  maxAgeDays = 180,
) {
  if (!validDate(metric?.as_of)) return false;
  return (
    now.getTime() - Date.parse(`${metric.as_of}T00:00:00Z`) >
    maxAgeDays * 86_400_000
  );
}

export function auditInvestmentMetrics(listing, now = new Date()) {
  const issues = [];
  const definitions = [
    ["rental_yield", finitePositive(listing?.rental_yield_percent)],
    ["price_per_m2", calculatePricePerM2(listing) != null],
  ];
  for (const [key, hasValue] of definitions) {
    const metric = listing?.investment_metrics?.[key];
    if (!hasValue || metric?.hidden) continue;
    if (
      !metric?.source?.trim() ||
      !validDate(metric?.as_of) ||
      !["actual", "estimate"].includes(metric?.status)
    )
      issues.push({ key, reason: "missing" });
    else if (isInvestmentMetricStale(metric, now))
      issues.push({ key, reason: "stale" });
  }
  return issues;
}
