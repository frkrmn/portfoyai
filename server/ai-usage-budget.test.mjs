import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { idempotencyKey, runBudgetedAiCall } from "./ai-usage-budget.mjs";

assert.equal(idempotencyKey({ headers: { "x-idempotency-key": "request-key-123456789" } }), "request-key-123456789");
assert.equal(idempotencyKey({ headers: { "x-idempotency-key": "short" } }), null);

const context = { workspaceId: "11111111-1111-4111-8111-111111111111", userId: "22222222-2222-4222-8222-222222222222", key: "request-key-123456789", provider: "test-provider", model: "test-model", operation: "test.generate", reservedTokens: 1000 };
let providerCalls = 0; const rpcCalls = [];
const supabase = { async rpc(name, args) { rpcCalls.push({ name, args }); if (name === "reserve_ai_usage") return { data: { allowed: true, cached: false, reservation_id: "reservation" }, error: null }; return { data: true, error: null }; } };
const result = await runBudgetedAiCall({ ...context, supabase, call: async () => { providerCalls += 1; return { text: "ok", modelVersion: "test-model-v2", usageMetadata: { totalTokenCount: 321 } }; } });
assert.equal(result.text, "ok"); assert.equal(providerCalls, 1);
assert.equal(rpcCalls[1].name, "settle_ai_usage"); assert.equal(rpcCalls[1].args.p_actual_tokens, 321);

providerCalls = 0;
const cached = await runBudgetedAiCall({ ...context, supabase: { async rpc() { return { data: { allowed: true, cached: true, response: { text: "cached" } }, error: null }; } }, call: async () => { providerCalls += 1; } });
assert.equal(cached.text, "cached"); assert.equal(providerCalls, 0, "idempotent retries must not call the provider again");

for (const reason of ["AI_DAILY_BUDGET", "AI_CONCURRENCY_LIMIT", "AI_RATE_LIMIT", "AI_REQUEST_IN_PROGRESS"]) {
  providerCalls = 0;
  await assert.rejects(() => runBudgetedAiCall({ ...context, supabase: { async rpc() { return { data: { allowed: false, reason }, error: null }; } }, call: async () => { providerCalls += 1; } }), new RegExp(reason));
  assert.equal(providerCalls, 0, `${reason} must reject before provider execution`);
}

const failureCalls = [];
await assert.rejects(() => runBudgetedAiCall({ ...context, supabase: { async rpc(name, args) { failureCalls.push({ name, args }); return name === "reserve_ai_usage" ? { data: { allowed: true, cached: false, reservation_id: "failed-reservation" }, error: null } : { data: true, error: null }; } }, call: async () => { throw new Error("provider timeout"); } }), /provider timeout/);
assert.equal(failureCalls[1].name, "settle_ai_usage");
assert.equal(failureCalls[1].args.p_outcome, "failed", "provider errors must release concurrency with a failed settlement");
assert.equal(failureCalls[1].args.p_actual_tokens, 0);

const migration = await readFile(new URL("../supabase/migrations/20260915000400_ai_workspace_budgets.sql", import.meta.url), "utf8");
assert.match(migration, /workspace_id uuid not null/);
assert.match(migration, /provider text not null/); assert.match(migration, /model text not null/); assert.match(migration, /operation text not null/);
assert.match(migration, /unique \(workspace_id, idempotency_key\)/);
assert.match(migration, /pg_advisory_xact_lock/);
assert.match(migration, /daily_request_limit := 20.*daily_token_limit := 100000.*concurrency_limit := 1.*minute_limit := 5/s);
assert.match(migration, /daily_request_limit := 500.*daily_token_limit := 5000000.*concurrency_limit := 5.*minute_limit := 30/s);
assert.match(migration, /where workspace_id = p_workspace_id and plan = 'pro'/);
assert.match(migration, /RESERVATION_TIMEOUT/);
assert.match(migration, /revoke all on function public\.reserve_ai_usage.*anon,authenticated/i);

console.info("AI usage budgets verified: provider-neutral workspace quota, concurrency, settlement and idempotency contracts passed.");
