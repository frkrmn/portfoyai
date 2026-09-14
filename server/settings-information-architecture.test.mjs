import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dashboard = await readFile(new URL("../src/portfoyai/dashboard.tsx", import.meta.url), "utf8");
const sections = ["general", "contact", "design", "team", "publishing", "language-seo", "advanced"];

for (const section of sections) {
  assert.match(dashboard, new RegExp(`settings-${section}`), `${section} must have a stable deep-link target`);
}
assert.match(dashboard, /searchParams\.get\("settings"\)/);
assert.match(dashboard, /next\.set\("settings", section\)/);
assert.match(dashboard, /aria-label=\{t\("dashboard\.settings\.sectionsLabel"\)\}/);
assert.match(dashboard, /aria-current=/);
assert.match(dashboard, /tabIndex=\{-1\}/);
assert.match(dashboard, /overflow-x-auto/, "section navigation must remain usable on mobile");
const sectionHandler = dashboard.match(/const selectSettingsSection = \(section: SettingsSection\) => \{([\s\S]*?)\n  \};/)?.[1] || "";
assert.ok(sectionHandler);
assert.doesNotMatch(sectionHandler, /setSiteDraft|setTeamDraft|setRefineNote/, "section navigation must not reset unsaved or error state");

console.log("Settings information architecture contract passed.");
