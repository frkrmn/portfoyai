import assert from "node:assert/strict";
import fs from "node:fs";

const templates = [
  ["warm-editorial", ["heroImage", "contactImage"]],
  ["bold-luxury", ["heroImage", "showcaseImages", "approachImage"]],
  ["clean-modern", ["heroImage", "testimonialImage"]],
  ["neighborhood-friendly", ["heroImage", "agentPortrait"]],
  ["investment-focused", []],
  ["urgent-deals", []],
  ["guided-match", ["heroImage", "agentPortrait"]],
  ["land-plots", ["heroImage"]],
];
for (const [template, slots] of templates) {
  const file = `${template.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join("")}Template.tsx`;
  const source = fs.readFileSync(new URL(`../src/templates/${template}/${file}`, import.meta.url), "utf8");
  assert.match(source, /export const imageSchema = imageSlots\(/, `${template} must export imageSchema`);
  for (const slot of slots) {
    assert.match(source, new RegExp(`media\\.${slot}`), `${template} schema missing media.${slot}`);
    assert.match(source, new RegExp(`config\\.media\\.${slot}`), `${template} renderer does not consume media.${slot}`);
  }
  console.log(`${template}: ${slots.length ? slots.map((slot) => `media.${slot}`).join(", ") : "no site-level slots; listing photos only"}`);
}
