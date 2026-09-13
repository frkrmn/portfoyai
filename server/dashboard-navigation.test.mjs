import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [shell, dashboard] = await Promise.all([
  readFile(new URL("../src/portfoyai/views.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/portfoyai/dashboard.tsx", import.meta.url), "utf8"),
]);

for (const moduleId of ["overview", "analytics", "listings", "content", "images", "leads", "site"]) {
  assert.match(shell, new RegExp(`id: "${moduleId}" as const`), `mobile/desktop navigation is missing ${moduleId}`);
}
assert.doesNotMatch(dashboard, /dashboardSections\.map/, "main modules must not be repeated as horizontal tabs");
assert.match(shell, /lg:hidden/);
assert.match(shell, /lg:flex/);
assert.match(shell, /aria-controls="dashboard-mobile-navigation"/);
assert.match(shell, /role="dialog"/);
assert.match(shell, /aria-modal="true"/);
assert.match(shell, /aria-current=\{activeSection === id \? "page"/);
assert.match(shell, /event\.key === "Escape"/);
assert.match(shell, /firstMobileItem\.current\?\.focus\(\)/);
assert.match(shell, /mobileMenuButton\.current\?\.focus\(\)/);
assert.match(shell, /w-\[min\(86vw,340px\)\]/, "drawer must fit narrow mobile viewports");

console.log("Dashboard desktop/mobile navigation contracts passed.");
