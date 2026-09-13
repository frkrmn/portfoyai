import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { QueryClient } from "@tanstack/react-query";

const [querySource, dashboardSource, analyticsSource, notificationsSource, appSource] = await Promise.all([
  readFile(new URL("../src/lib/dashboard-query.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/portfoyai/dashboard.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/portfoyai/dashboard/AnalyticsPanel.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/portfoyai/dashboard/LeadNotificationSettings.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/App.tsx", import.meta.url), "utf8"),
]);

for (const domain of ["sites", "leads", "listings", "team", "analytics", "notifications", "fonts", "adminAccess"]) {
  assert.match(querySource, new RegExp(`\\b${domain}:`), `missing query key: ${domain}`);
}
assert.match(appSource, /new QueryClient\(dashboardQueryClientConfig\)/, "shared defaults must configure the app client");
assert.match(querySource, /staleTime: 30_000/);
assert.match(querySource, /status !== 408 && error\.status !== 429/);
assert.doesNotMatch(analyticsSource, /useEffect|useState/, "analytics server state must use a query");
assert.match(dashboardSource, /useQueryClient/);
assert.match(dashboardSource, /setQueryData/);
assert.match(notificationsSource, /cancelQueries/);
assert.match(notificationsSource, /invalidateQueries/);
assert.match(notificationsSource, /onError:[\s\S]*previous/, "optimistic updates need rollback");

let calls = 0;
const client = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: false } } });
const options = { queryKey: ["dashboard", "sites", "user-1"], queryFn: async () => { calls += 1; return { sites: [] }; } };
await Promise.all([client.fetchQuery(options), client.fetchQuery(options)]);
await client.fetchQuery(options);
assert.equal(calls, 1, "in-flight and fresh dashboard queries should be deduplicated");

console.log("Dashboard React Query contract checks passed.");
