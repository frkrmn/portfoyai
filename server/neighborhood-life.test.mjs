import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const [template, editor, localization, schema, generation] = await Promise.all([readFile(new URL("../src/templates/neighborhood-friendly/NeighborhoodFriendlyTemplate.tsx", import.meta.url), "utf8"), readFile(new URL("../src/portfoyai/content-editor.tsx", import.meta.url), "utf8"), readFile(new URL("./site-content-i18n.mjs", import.meta.url), "utf8"), readFile(new URL("./site-config.schema.json", import.meta.url), "utf8"), readFile(new URL("./handlers/generate-theme.mjs", import.meta.url), "utf8")]);
for (const field of ["transit", "schools", "greenSpace", "priceRange", "lifestyle", "source", "asOf"]) { assert.match(template, new RegExp(field)); assert.match(editor, new RegExp(field)); assert.match(schema, new RegExp(field)); }
assert.match(localization, /transit.*schools.*greenSpace.*priceRange.*lifestyle.*source/);
assert.match(template, /role="group"/); assert.match(template, /aria-pressed/); assert.match(template, /onMouseEnter/); assert.match(template, /onFocus/); assert.match(template, /scrollIntoView/);
assert.match(template, /loading="lazy"/); assert.match(template, /sm:grid-cols-2/); assert.match(template, /labels\.missing/); assert.match(template, /neighborhoodLifeVisibility === "hidden"/);
assert.match(generation, /never invent local facts or sources/i);
console.log("Neighborhood life and interactive map checks passed.");
