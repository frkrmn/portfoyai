import assert from "node:assert/strict";
import { mediaPathsToRemove } from "./media-storage.mjs";
import { listingPayload } from "./api-utils.mjs";

const base = "https://example.supabase.co/storage/v1/object/public/site-media/user/site/listing/";
assert.deepEqual(mediaPathsToRemove([{ url: `${base}old.webp`, thumbUrl: `${base}old-thumb.webp` }], [{ url: `${base}new.webp` }]), ["user/site/listing/old.webp", "user/site/listing/old-thumb.webp"]);
assert.deepEqual(mediaPathsToRemove({ heroImage: `${base}keep.webp` }, { heroImage: `${base}keep.webp` }), []);
assert.throws(() => listingPayload({ title: "Test", description: "Test", district: "Test", room_count: "1+1", price: 1, m2: 1, listing_type: "sale", media: [{ url: "data:image/png;base64,AA==" }] }, "site"), /uploaded before saving/);
console.info("Media storage tests passed.");
