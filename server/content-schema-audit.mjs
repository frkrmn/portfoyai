import assert from "node:assert/strict";
import fs from "node:fs";

const templates = [
  ["warm-editorial", "WarmEditorialTemplate.tsx"],
  ["bold-luxury", "BoldLuxuryTemplate.tsx"],
  ["clean-modern", "CleanModernTemplate.tsx"],
  ["neighborhood-friendly", "NeighborhoodFriendlyTemplate.tsx"],
  ["investment-focused", "InvestmentFocusedTemplate.tsx"],
  ["urgent-deals", "UrgentDealsTemplate.tsx"],
  ["guided-match", "GuidedMatchTemplate.tsx"],
  ["land-plots", "LandPlotsTemplate.tsx"],
];
const existingControls = new Set(["businessName", "headline", "bio", "phone", "email", "address"]);
const intentional = new Map([
  ["heroImage", "Görsel yükleme/fallback akışının alanı; metin düzenleyicisine ait değil."],
  ["agentImage", "Görsel yükleme/fallback akışının alanı; metin düzenleyicisine ait değil."],
  ["stats", "investment-focused metrik değerleri ilanlardan hesaplanıyor; yalnızca etiketleri düzenlenebilir."],
]);

for (const [id, file] of templates) {
  const source = fs.readFileSync(new URL(`../src/templates/${id}/${file}`, import.meta.url), "utf8");
  const schemaStart = source.indexOf("export const contentSchema");
  const schemaEnd = source.indexOf("\nconst ", schemaStart);
  assert(schemaStart >= 0 && schemaEnd > schemaStart, `${id} contentSchema export missing`);
  const schemaSource = source.slice(schemaStart, schemaEnd);
  const declared = new Set([...schemaSource.matchAll(/"([A-Za-z][A-Za-z0-9]*)"/g)].map((match) => match[1]));
  const readMatches = [
    ...source.matchAll(/\bc\.([A-Za-z][A-Za-z0-9]*)/g),
    ...source.matchAll(/\bconfig\.content\.([A-Za-z][A-Za-z0-9]*)/g),
  ];
  const reads = new Set(readMatches.map((match) => match[1]));
  reads.add("teamDescription");
  if (id === "land-plots") { reads.add("processTitle"); reads.add("processSteps"); }
  const uncovered = [...reads].filter((key) => !existingControls.has(key) && !declared.has(key) && !intentional.has(key));
  assert.deepEqual(uncovered, [], `${id} uncovered content fields: ${uncovered.join(", ")}`);
  console.log(`${id}: ${reads.size} content fields audited; ${declared.size} schema fields; no unexplained gaps`);
}
