import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { landMapUrl, sanitizeLandDetails } from "../src/lib/land-details.mjs";
import { landDocumentPathsToRemove } from "./land-documents.mjs";
import { serializeListing } from "./api-utils.mjs";

const ids = { siteId: "11111111-1111-4111-8111-111111111111", listingId: "22222222-2222-4222-8222-222222222222" };
const path = `${ids.siteId}/${ids.listingId}/deed.pdf`;
const input = {
  block: " 123 ", parcel: "45", zoning_status: "Konut imarlı", deed_type: "independent",
  frontage_m: "24.5", infrastructure: ["road", "water", "invalid", "road"], slope_percent: 8,
  intended_use: "Villa", coordinates: { lat: 41.01, lng: 29.02 }, verification_status: "document_checked",
  verified_at: "2026-09-14T10:00:00.000Z", source: { label: "Owner: Private Person", url: "https://example.com/source", checked_at: "2026-09-14" },
  documents: [{ id: "doc", name: "Private deed.pdf", path, kind: "deed", mime_type: "application/pdf", size: 123, uploaded_at: "2026-09-14T10:00:00.000Z" }],
};

const stored = sanitizeLandDetails(input, ids);
assert.equal(stored.block, "123");
assert.deepEqual(stored.infrastructure, ["road", "water"]);
assert.equal(stored.documents.length, 1);
assert.deepEqual(sanitizeLandDetails({ ...input, coordinates: { lat: 91, lng: 29 } }, { publicView: true }).coordinates, null);
assert.equal(landMapUrl(input), "https://www.google.com/maps?q=41.01,29.02");
assert.equal(landMapUrl({ coordinates: { lat: "", lng: 29 } }), null);

const publicDetails = sanitizeLandDetails(input, { publicView: true });
assert.equal("documents" in publicDetails, false);
assert.equal("source" in publicDetails, false);
assert.equal(JSON.stringify(publicDetails).includes("Private Person"), false);
const serialized = serializeListing({ id: ids.listingId, site_id: ids.siteId, title: "Land", description: "Land", price: 1, currency: "TRY", m2: 1, room_count: "-", listing_type: "sale", property_category: "arsa", property_subtype: "konut_imarli", district: "Test", lat: 41, lng: 29, media: [], status: "active", listing_status: "active", features: [], created_at: "2026-09-14", land_details: input }, { publicView: true });
assert.equal("documents" in serialized.land_details, false);

assert.deepEqual(landDocumentPathsToRemove({ land_details: { documents: [{ path }, { path: "remove-me" }] } }, { land_details: { documents: [{ path }] } }), ["remove-me"]);

const migration = await readFile(new URL("../supabase/migrations/20260914000900_land_listing_details.sql", import.meta.url), "utf8");
assert.match(migration, /'land-documents', 'land-documents', false/);
assert.match(migration, /can_read_land_document/);
assert.match(migration, /can_write_land_document/);
const dashboard = await readFile(new URL("../src/portfoyai/views.tsx", import.meta.url), "utf8");
assert.match(dashboard, /property_category === "arsa"/);
assert.match(dashboard, /data-land-details/);
const template = await readFile(new URL("../src/templates/land-plots/LandPlotsTemplate.tsx", import.meta.url), "utf8");
assert.match(template, /data-land-technical-details/);
assert.match(template, /landMapUrl/);
assert.match(template, /Müstakil tapu/);
assert.match(template, /Independent title/);

console.log("Land details checks passed.");
