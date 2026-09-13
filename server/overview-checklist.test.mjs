import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [logic, component, dashboard, leadsHandler, migration] = await Promise.all([
  readFile(new URL("../src/portfoyai/dashboard/overview-checklist.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/portfoyai/dashboard/OverviewChecklist.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/portfoyai/dashboard.tsx", import.meta.url), "utf8"),
  readFile(new URL("./handlers/leads.mjs", import.meta.url), "utf8"),
  readFile(new URL("../supabase/migrations/20260913000300_lead_follow_up.sql", import.meta.url), "utf8"),
]);

for (const item of ["profile", "photos", "english", "leads", "publish", "domain", "maps"]) {
  assert.match(logic, new RegExp(`id: "${item}"`), `missing real-data checklist item: ${item}`);
}
assert.match(logic, /ChecklistTarget = "site" \| "content" \| "images" \| "listings" \| "leads"/);
assert.match(logic, /7 \* 24 \* 60 \* 60 \* 1000/, "recent leads must use a seven-day window");
assert.match(logic, /!lead\.contacted_at/, "uncontacted leads must be derived from persisted data");
assert.match(component, /role="progressbar"/);
assert.match(component, /loading/);
assert.match(component, /error/);
assert.match(dashboard, /onNavigate=\{setActiveTab\}/);
assert.match(leadsHandler, /request\.method === "PATCH"/);
assert.match(migration, /contacted_at timestamptz/);

console.log("Dashboard overview checklist contracts passed.");
