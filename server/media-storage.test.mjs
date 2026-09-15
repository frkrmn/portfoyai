import assert from "node:assert/strict";
import { mediaPathsToRemove, storagePathFromUrl } from "./media-storage.mjs";
import { listingPayload } from "./api-utils.mjs";

const supabaseUrl = "https://example.supabase.co";
const userId = "11111111-1111-4111-8111-111111111111";
const siteId = "22222222-2222-4222-8222-222222222222";
const foreignSiteId = "33333333-3333-4333-8333-333333333333";
const base = `${supabaseUrl}/storage/v1/object/public/site-media/${userId}/${siteId}/listing/`;
const options = { siteId, supabaseUrl };

assert.deepEqual(mediaPathsToRemove([{ url: `${base}old.webp`, thumbUrl: `${base}old-thumb.webp` }], [{ url: `${base}new.webp` }], options), [`${userId}/${siteId}/listing/old.webp`, `${userId}/${siteId}/listing/old-thumb.webp`]);
assert.deepEqual(mediaPathsToRemove({ heroImage: `${base}keep.webp` }, { heroImage: `${base}keep.webp` }, options), []);
assert.equal(storagePathFromUrl(`https://attacker.example${new URL(base).pathname}victim.webp`, options), null, "lookalike hosts must not authorize deletion");
assert.equal(storagePathFromUrl(`${supabaseUrl}/storage/v1/object/public/site-media/${userId}/${foreignSiteId}/listing/victim.webp`, options), null, "foreign site paths must not authorize deletion");
assert.equal(storagePathFromUrl(`${supabaseUrl}/storage/v1/object/public/site-media/not-a-user/${siteId}/listing/victim.webp`, options), null, "noncanonical owner paths must not authorize deletion");
assert.equal(storagePathFromUrl(`${supabaseUrl}/storage/v1/object/public/site-media/${userId}/${siteId}/unknown/victim.webp`, options), null, "unknown media scopes must not authorize deletion");
assert.throws(() => listingPayload({ title: "Test", description: "Test", district: "Test", room_count: "1+1", price: 1, m2: 1, listing_type: "sale", media: [{ url: "data:image/png;base64,AA==" }] }, "site"), /uploaded before saving/);
console.info("Media storage tests passed.");
