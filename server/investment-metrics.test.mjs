import assert from "node:assert/strict";
import { auditInvestmentMetrics, calculateAverageYield, calculatePricePerM2, isInvestmentMetricStale, sanitizeInvestmentMetrics } from "../src/lib/investment-metrics.mjs";
import { listingPayload, serializeListing } from "./api-utils.mjs";

const metadata = { rental_yield: { source: "Tapu ve kira sözleşmesi", as_of: "2026-09-01", status: "actual", hidden: false }, price_per_m2: { source: "İlan fiyatı ve brüt alan", as_of: "2026-09-01", status: "actual", hidden: false } };
const listing = { price: 9_000_000, m2: 120, rental_yield_percent: 5.5, investment_metrics: metadata };
assert.equal(calculatePricePerM2(listing), 75_000);
assert.equal(calculatePricePerM2({ price: 1, m2: 0 }), null);
assert.equal(calculateAverageYield([listing, { ...listing, rental_yield_percent: 6.5 }]), 6);
assert.equal(calculateAverageYield([{ ...listing, investment_metrics: { rental_yield: { ...metadata.rental_yield, hidden: true } } }]), null);
assert.equal(isInvestmentMetricStale(metadata.rental_yield, new Date("2027-03-02T00:00:00Z")), true);
assert.deepEqual(auditInvestmentMetrics(listing, new Date("2026-09-14T00:00:00Z")), []);
assert.deepEqual(auditInvestmentMetrics({ ...listing, investment_metrics: {} }, new Date("2026-09-14T00:00:00Z")).map((item) => item.reason), ["missing", "missing"]);
assert.equal(sanitizeInvestmentMetrics({ rental_yield: { source: " X ", as_of: "bad", status: "other", hidden: true } }).rental_yield.source, "X");

const payload = listingPayload({ title: "Test", description: "Test", district: "Kadıköy", room_count: "2+1", price: 9_000_000, currency: "USD", m2: 120, listing_type: "sale", investment_metrics: metadata, rental_yield_percent: 5.5 }, "site-id");
assert.equal(payload.currency, "USD");
assert.deepEqual(payload.investment_metrics, metadata);
assert.equal(serializeListing({ ...payload, id: "listing-id", created_at: "2026-09-14", lat: 0, lng: 0 }).investment_metrics.rental_yield.status, "actual");
assert.throws(() => listingPayload({ ...payload, rental_yield_percent: -2 }, "site-id"), /Rental yield/);
assert.equal(new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(5.5), "5,5");
assert.equal(new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(5.5), "5.5");
console.log("Investment metric provenance checks passed.");
