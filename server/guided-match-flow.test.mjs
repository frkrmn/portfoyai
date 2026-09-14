import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { guidedMatchSummary, rankGuidedListings, sanitizeGuidedAnswers, scoreGuidedListing } from "../src/lib/guided-match.mjs";

const answers = sanitizeGuidedAnswers({ location: "Kadıköy", feeling: "ferah", min_price: 4_000_000, max_price: 8_000_000, timing: "3 ay" });
const listings = [{ id: "b", title: "Moda", district: "Kadıköy", description: "Ferah yaşam", features: [], price: 6_000_000 }, { id: "a", title: "Uzak", district: "Bodrum", description: "Sakin", features: [], price: 20_000_000 }];
const first = rankGuidedListings(listings, answers, "tr");
assert.deepEqual(first, rankGuidedListings(listings, answers, "tr"), "scoring must be deterministic");
assert.equal(first[0].listing_id, "b"); assert.equal(first[0].score, 100); assert.ok(first[0].reasons.some((reason) => /Bütçe/.test(reason)));
assert.deepEqual(rankGuidedListings([], answers), [], "empty portfolio must be safe");
assert.deepEqual(rankGuidedListings(listings, sanitizeGuidedAnswers({ location: "Antalya" })), [], "no-match must be explicit");
assert.match(guidedMatchSummary(answers, first, "tr"), /eşleşme/); assert.match(guidedMatchSummary(answers, first, "en"), /match/);
assert.match(scoreGuidedListing(listings[0], answers, "en").reasons.join(" "), /budget/i);
assert.throws(() => sanitizeGuidedAnswers({}), /preference/); assert.throws(() => sanitizeGuidedAnswers({ min_price: 10, max_price: 5 }), /budget/);

const [handler, migration, template, crm] = await Promise.all([readFile(new URL("./handlers/guided-matches.mjs", import.meta.url), "utf8"), readFile(new URL("../supabase/migrations/20260914000700_guided_match_lead_flow.sql", import.meta.url), "utf8"), readFile(new URL("../src/templates/guided-match/GuidedMatchTemplate.tsx", import.meta.url), "utf8"), readFile(new URL("../src/portfoyai/dashboard/LeadMiniCrm.tsx", import.meta.url), "utf8")]);
assert.match(handler, /isDuplicateLead/); assert.match(handler, /normalizeLeadPhone/); assert.match(handler, /randomBytes\(32\)/); assert.match(handler, /tokenHash/); assert.match(handler, /revoked_at/); assert.match(handler, /expires_at/);
assert.doesNotMatch(handler.match(/const publicResult[^;]+/)?.[0] || "", /name|phone|email/, "public results must exclude PII");
assert.match(migration, /schema_version integer/); assert.match(migration, /consent boolean/); assert.match(migration, /interval '7 days'/);
assert.match(template, /consent/); assert.match(template, /recommendation\.reasons/); assert.match(template, /Copy share link|Paylaşım linkini kopyala/);
assert.match(crm, /guided_match/); assert.match(crm, /revoke_match/);
console.log("Guided match lead flow checks passed.");
