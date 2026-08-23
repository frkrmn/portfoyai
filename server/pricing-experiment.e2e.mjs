import assert from "node:assert/strict";
import { createServer } from "node:http";

const subscriptions = [];
const events = [];
const testUserId = "11111111-1111-4111-8111-111111111111";

const matchRows = (rows, url) => rows.filter((row) => {
  for (const [key, raw] of url.searchParams) {
    if (["select", "order", "limit"].includes(key)) continue;
    if (raw === "is.null" && row[key] !== null) return false;
    if (raw.startsWith("eq.") && String(row[key]) !== raw.slice(3)) return false;
  }
  return true;
});

const fakeSupabase = createServer(async (request, response) => {
  const url = new URL(request.url || "/", "http://127.0.0.1");
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : null;
  response.setHeader("Content-Type", "application/json");

  if (url.pathname === "/auth/v1/user" && request.method === "GET") {
    return response.end(JSON.stringify({ id: testUserId, email: "pricing@example.com" }));
  }

  if (url.pathname === "/rest/v1/subscriptions") {
    if (request.method === "GET") return response.end(JSON.stringify(matchRows(subscriptions, url)));
    if (request.method === "POST") {
      const row = { id: crypto.randomUUID(), user_id: null, session_id: null, pricing_variant: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...body };
      subscriptions.push(row);
      return response.end(JSON.stringify(row));
    }
    if (request.method === "PATCH") {
      const rows = matchRows(subscriptions, url);
      rows.forEach((row) => Object.assign(row, body));
      return response.end(JSON.stringify(rows[0] || null));
    }
  }

  if (url.pathname === "/rest/v1/experiment_events" && request.method === "POST") {
    const event = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...body };
    events.push(event);
    return response.end(JSON.stringify(event));
  }

  response.statusCode = 404;
  response.end(JSON.stringify({ message: "not found" }));
});

await new Promise((resolve) => fakeSupabase.listen(0, "127.0.0.1", resolve));
const address = fakeSupabase.address();
process.env.SUPABASE_URL = `http://127.0.0.1:${address.port}`;
process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role-key";
const { default: experimentHandler } = await import("../api/experiment.js");
const { getUserPlan } = await import("./api-utils.mjs");

const invoke = async ({ sessionId, cookie = "", accessToken = "", eventType = "pricing_view", context = "manual_pricing_page_visit" }) => {
  const headers = { "x-session-id": sessionId, cookie, host: "localhost", ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}) };
  const responseHeaders = {};
  let statusCode = 200;
  let payload;
  await experimentHandler({ method: "POST", headers, body: { event_type: eventType, context }, url: "/api/experiment" }, {
    get statusCode() { return statusCode; },
    set statusCode(value) { statusCode = value; },
    setHeader(name, value) { responseHeaders[name.toLowerCase()] = value; },
    end(value) { payload = JSON.parse(value); },
  });
  return { statusCode, headers: responseHeaders, payload };
};

try {
  assert.equal(await getUserPlan(testUserId), "free", "a missing subscription row must resolve to the free plan");
  const sessionId = "pricing-stability-session-0001";
  const first = await invoke({ sessionId });
  const cookie = String(first.headers["set-cookie"] || "").split(";")[0];
  const second = await invoke({ sessionId, cookie });
  const paywall = await invoke({ sessionId, cookie, eventType: "paywall_view", context: "listing_limit" });
  const upgrade = await invoke({ sessionId, cookie, eventType: "upgrade_click", context: "listing_limit" });
  const loggedIn = await invoke({ sessionId, cookie, accessToken: "test-access-token" });
  const otherDevice = await invoke({ sessionId: "pricing-other-device-0002", accessToken: "test-access-token" });

  assert.equal(first.statusCode, 201);
  assert.match(first.payload.variant, /^[AB]$/);
  assert.equal(second.statusCode, 201);
  assert.equal(second.payload.variant, first.payload.variant);
  assert.equal(paywall.payload.variant, first.payload.variant);
  assert.equal(upgrade.payload.variant, first.payload.variant);
  assert.equal(loggedIn.payload.variant, first.payload.variant);
  assert.equal(otherDevice.payload.variant, first.payload.variant);
  assert.equal(subscriptions.length, 1);
  assert.equal(subscriptions[0].subject_id, testUserId);
  assert.equal(events.length, 6);
  assert.deepEqual(events.map((event) => event.event_type), ["pricing_view", "pricing_view", "paywall_view", "upgrade_click", "pricing_view", "pricing_view"]);
  console.info(JSON.stringify({
    same_session_first_variant: first.payload.variant,
    same_session_second_variant: second.payload.variant,
    stable: first.payload.variant === second.payload.variant,
    missing_row_plan: "free",
    same_variant_after_login: loggedIn.payload.variant,
    same_variant_on_other_device: otherDevice.payload.variant,
    subscription_rows: subscriptions.length,
    event_types: events.map((event) => event.event_type),
  }, null, 2));
} finally {
  await new Promise((resolve, reject) => fakeSupabase.close((error) => error ? reject(error) : resolve()));
}
