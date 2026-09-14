import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  appendPriceChange,
  auditDealClaims,
  isVerifiedDeal,
  sanitizePriceHistory,
  verifiedReduction,
  verifiedUrgency,
} from "../src/lib/deal-verification.mjs";

const now = new Date("2026-09-14T12:00:00.000Z");
const valid = {
  price: 900_000,
  currency: "TRY",
  urgent_sale: true,
  urgent_verified_at: "2026-09-13T12:00:00.000Z",
  urgent_expires_at: "2026-10-13T12:00:00.000Z",
  price_history: [{ old_price: 1_000_000, new_price: 900_000, currency: "TRY", changed_at: "2026-09-14T10:00:00.000Z" }],
};

assert.equal(verifiedUrgency(valid, now), true);
assert.equal(verifiedUrgency({ ...valid, urgent_expires_at: now.toISOString() }, now), false, "expiry boundary must be exclusive");
assert.equal(verifiedUrgency({ ...valid, urgent_verified_at: null }, now), false);
assert.equal(isVerifiedDeal(valid, now), true);
assert.deepEqual(verifiedReduction(valid), { ...valid.price_history[0], discount_percent: 10 });
assert.equal(verifiedReduction({ ...valid, price: 899_999 }), null, "stale history must not prove a discount");
assert.equal(verifiedReduction({ ...valid, currency: "USD" }), null, "currencies must never be mixed");
assert.equal(verifiedReduction({ ...valid, price_history: [{ ...valid.price_history[0], old_price: 900_000 }] }), null);
assert.deepEqual(auditDealClaims({ ...valid, urgent_expires_at: now.toISOString(), price: 800_000 }, now).sort(), ["price_history_stale", "urgency_unverified"]);

const appended = appendPriceChange([], { oldPrice: 1_000, newPrice: 999, currency: "USD", changedAt: now.toISOString(), changedBy: "user-1" });
assert.equal(appended.length, 1);
assert.equal(appended[0].changed_by, "user-1");
assert.equal(verifiedReduction({ price: 999, currency: "USD", price_history: appended })?.discount_percent, 0.1);
assert.deepEqual(sanitizePriceHistory(appended), [{ old_price: 1_000, new_price: 999, currency: "USD", changed_at: now.toISOString() }], "public history must omit the actor id");

const migration = await readFile(new URL("../supabase/migrations/20260914000800_verified_urgent_deal_claims.sql", import.meta.url), "utf8");
assert.match(migration, /urgent_verified_by uuid references auth\.users/);
assert.match(migration, /urgent_expires_at > urgent_verified_at/);
const handler = await readFile(new URL("./handlers/listing.mjs", import.meta.url), "utf8");
assert.match(handler, /changedBy: user\.id/);
assert.match(handler, /30 \* 86_400_000/);
const template = await readFile(new URL("../src/templates/urgent-deals/UrgentDealsTemplate.tsx", import.meta.url), "utf8");
assert.match(template, /verifiedUrgency\(listing\)/);
assert.match(template, /verifiedReduction\(listing\)/);
const publicHandler = await readFile(new URL("./handlers/public-site.mjs", import.meta.url), "utf8");
assert.match(publicHandler, /price_history/);

console.log("Verified urgent deal checks passed.");
