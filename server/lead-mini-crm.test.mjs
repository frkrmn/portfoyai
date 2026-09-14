import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createLeadCsv, filterLeads, findDuplicateLeads } from "../src/lib/lead-crm.mjs";
const leads = [
  { id: "1", name: "Ayşe Kaya", phone: "+90 555 111", email: "ayse@example.com", crm_status: "new", assignee: "Faruk", message: "Villa", source: "public-site", listing_id: "listing-1", note: "A, B", reminder_at: null, created_at: "2026-09-14" },
  { id: "2", name: "Ayşe K.", phone: "90555111", email: null, crm_status: "contacted", assignee: null, message: null, source: "public-site", listing_id: null, note: null, reminder_at: null, created_at: "2026-09-13" },
];
assert.deepEqual(filterLeads(leads, "faruk", "all").map((lead) => lead.id), ["1"]);
assert.deepEqual(filterLeads(leads, "", "contacted").map((lead) => lead.id), ["2"]);
assert.deepEqual(findDuplicateLeads(leads, leads[0]).map((lead) => lead.id), ["2"]);
const csv = createLeadCsv(leads);
assert.match(csv, /^"name","phone","email","status"/);
assert.match(csv, /"A, B"/);
const handler = await readFile(new URL("./handlers/leads.mjs", import.meta.url), "utf8");
assert.match(handler, /merge_owned_leads/);
assert.match(handler, /lead_activities/);
const migration = await readFile(new URL("../supabase/migrations/20260914000100_lead_mini_crm.sql", import.meta.url), "utf8");
for (const status of ["new", "contacted", "appointment", "won", "lost"]) assert.match(migration, new RegExp(`'${status}'`));
console.log("Lead mini CRM checks passed.");
