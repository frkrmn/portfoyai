import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolveTemplateExperience, templateExperienceIds, templateExperiences } from "../src/templates/experience.ts";

assert.equal(templateExperienceIds.length, 8);
for (const dimension of ["composition", "interaction"]) assert.equal(new Set(templateExperienceIds.map((id) => templateExperiences[id][dimension])).size, 8, `${dimension} must be unique per theme`);
assert.ok(new Set(templateExperienceIds.map((id) => `${templateExperiences[id].density}:${templateExperiences[id].geometry}:${templateExperiences[id].media}`)).size >= 7);
assert.equal(resolveTemplateExperience("unknown"), templateExperiences["warm-editorial"]);

const [types, styles, docs, registry, shared] = await Promise.all([
  readFile(new URL("../src/templates/types.ts", import.meta.url), "utf8"), readFile(new URL("../src/index.css", import.meta.url), "utf8"),
  readFile(new URL("../docs/theme-experience-principles.md", import.meta.url), "utf8"), readFile(new URL("../src/templates/registry.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/templates/shared/ThemeCommon.tsx", import.meta.url), "utf8"),
]);
for (const id of templateExperienceIds) { assert.ok(registry.includes(`\"${id}\"`)); assert.ok(docs.includes(id.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ")) || docs.toLowerCase().includes(id.replace("-", " "))); }
for (const attribute of ["data-template", "data-composition", "data-interaction", "data-density", "data-geometry", "data-media-treatment"]) assert.ok(types.includes(attribute));
for (const composition of templateExperienceIds.map((id) => templateExperiences[id].composition)) assert.ok(styles.includes(composition));
for (const contract of ["SharedThemeHeader", "SharedThemeFooter", "SharedListingCollection", "useSharedLeadForm"]) assert.ok(shared.includes(contract));
assert.match(styles, /overflow-wrap: anywhere/); assert.match(styles, /prefers-reduced-motion: reduce/); assert.match(styles, /focus-visible/);
console.log("Eight-theme composition, interaction, resilience, and shared behavior contracts passed.");
