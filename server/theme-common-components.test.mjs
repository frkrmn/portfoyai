import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const themes = [
  "bold-luxury/BoldLuxuryTemplate.tsx",
  "clean-modern/CleanModernTemplate.tsx",
  "neighborhood-friendly/NeighborhoodFriendlyTemplate.tsx",
  "investment-focused/InvestmentFocusedTemplate.tsx",
  "urgent-deals/UrgentDealsTemplate.tsx",
  "guided-match/GuidedMatchTemplate.tsx",
  "land-plots/LandPlotsTemplate.tsx",
];
const allThemes = ["warm-editorial/WarmEditorialTemplate.tsx", ...themes];

const common = await readFile(new URL("src/templates/shared/ThemeCommon.tsx", root), "utf8");
for (const contract of ["SharedThemeHeader", "SharedThemeFooter", "SharedListingCollection", "useSharedLeadForm"]) {
  assert.match(common, new RegExp(`export function ${contract}`), `${contract} must remain part of the shared theme contract`);
}

for (const relativePath of allThemes) {
  const source = await readFile(new URL(`src/templates/${relativePath}`, root), "utf8");
  assert.match(source, /useSharedLeadForm/, `${relativePath} must use the shared lead behavior`);
  assert.doesNotMatch(source, /fetch\("\/api\/leads"/, `${relativePath} must not implement lead transport itself`);
}

for (const relativePath of allThemes) {
  const source = await readFile(new URL(`src/templates/${relativePath}`, root), "utf8");
  assert.match(source, /SharedTeam(HeaderLink|Section)/, `${relativePath} must use the shared team components`);
  assert.match(source, /SharedFooterContact/, `${relativePath} must use the shared footer contact component`);
}

console.log("Theme common component contracts passed.");
