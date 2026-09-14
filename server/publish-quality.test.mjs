import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { auditPublishQuality } from "../src/lib/publish-quality.mjs";

const completeSite = { business_name: "Fastate", headline: "Doğru ev, doğru karar", theme_config: { content: { phone: "+90 555 000 00 00", mapUrl: "https://maps.example", hero: { tr: "Merhaba", en: "Hello" } }, media: { hero: "https://images.example/hero.jpg" }, seo: { title: { tr: "Fastate" }, description: { tr: "Gayrimenkul danışmanlığı" } } } };
const completeListings = [{ status: "active", listing_status: "active", media: [{ alt: "Deniz manzaralı salon" }] }];
const complete = auditPublishQuality({ site: completeSite, listings: completeListings, imageKeys: ["media.hero"] });
assert.equal(complete.canPublish, true);
assert.deepEqual(complete.critical, []);
assert.deepEqual(complete.warnings, []);

const incomplete = auditPublishQuality({ site: { theme_config: { content: {} } }, listings: [], imageKeys: ["media.hero"], unsaved: true });
assert.equal(incomplete.canPublish, false);
assert.deepEqual(incomplete.critical.map((item) => item.id), ["identity", "contact", "activeListing", "unsaved"]);
assert.ok(incomplete.critical.every((item) => ["site", "content", "listings", "images"].includes(item.target)));
assert.ok(incomplete.warnings.some((item) => item.id === "seo"));

const changed = auditPublishQuality({ site: completeSite, listings: completeListings, imageKeys: ["media.hero"], unsaved: true });
assert.equal(changed.canPublish, false, "unsaved draft changes must update and block the result");

const handler = await readFile(new URL("./handlers/site-versions.mjs", import.meta.url), "utf8");
assert.match(handler, /PUBLISH_QUALITY_BLOCKED/);
assert.match(handler, /auditPublishQuality/);
const dashboard = await readFile(new URL("../src/portfoyai/dashboard.tsx", import.meta.url), "utf8");
assert.match(dashboard, /PublishQualityDialog/);
assert.match(dashboard, /contentDirty \|\| mediaDirty \|\| themeDirty/);
console.log("Publish quality checks passed.");
