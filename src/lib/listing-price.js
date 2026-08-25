export const LISTING_CURRENCIES = ["TRY", "USD", "GBP", "EUR"];

export function normalizeListingCurrency(currency) {
  return LISTING_CURRENCIES.includes(currency) ? currency : "TRY";
}

/**
 * Formats a listing-owned monetary amount without converting currencies.
 * currencyDisplay "code" keeps mixed-currency screens explicit (TRY, USD, GBP, EUR).
 */
export function formatListingPrice(listing, amount = listing?.price, locale = "tr-TR") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: normalizeListingCurrency(listing?.currency),
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}
