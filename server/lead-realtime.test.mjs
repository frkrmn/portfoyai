import assert from "node:assert/strict";
import fs from "node:fs";
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
try {
  const { applyLeadRealtimeChange, LEAD_FALLBACK_INTERVAL_MS } = await vite.ssrLoadModule("/src/lib/lead-realtime.ts");
  const first = { id: "lead-1", site_id: "site-1", listing_id: null, name: "İlk", phone: "1", message: null, created_at: "2026-09-12T08:00:00.000Z" };
  const second = { id: "lead-2", site_id: "site-1", listing_id: "listing-1", name: "Yeni", phone: "2", message: "Merhaba", created_at: "2026-09-12T09:00:00.000Z" };
  assert.deepEqual(applyLeadRealtimeChange([first], { eventType: "INSERT", new: second, old: {} }), [second, first]);
  const updated = { ...first, name: "Güncellendi" };
  assert.deepEqual(applyLeadRealtimeChange([second, first], { eventType: "UPDATE", new: updated, old: first }), [second, updated]);
  assert.deepEqual(applyLeadRealtimeChange([second, updated], { eventType: "DELETE", new: {}, old: { id: second.id } }), [updated]);
  assert.equal(LEAD_FALLBACK_INTERVAL_MS, 60_000, "Fallback must be controlled, not the old 3-second polling loop.");
} finally {
  await vite.close();
}

const dashboard = fs.readFileSync(new URL("../src/portfoyai/dashboard.tsx", import.meta.url), "utf8");
assert.match(dashboard, /\.channel\(`dashboard-leads:/);
assert.match(dashboard, /postgres_changes/);
assert.match(dashboard, /supabase\.removeChannel\(channel\)/);
assert.match(dashboard, /CHANNEL_ERROR.*TIMED_OUT.*CLOSED/);
assert.doesNotMatch(dashboard, /setInterval\(refresh, 3000\)/);

const migration = fs.readFileSync(new URL("../supabase/migrations/20260912000500_leads_realtime.sql", import.meta.url), "utf8");
assert.match(migration, /alter publication supabase_realtime add table public\.leads/i);
assert.match(migration, /pg_publication_tables/);

console.info("Lead Realtime verified: insert/update/delete merge, cleanup, reconnect refresh, RLS publication and controlled fallback.");
