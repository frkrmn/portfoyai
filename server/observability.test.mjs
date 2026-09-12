import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import { handleKnownError } from "./api-utils.mjs";
import { redact, trackAiCall, withRequestObservability } from "./observability.mjs";

const redacted = redact({ authorization: "Bearer secret", email: "ada@example.com", nested: { apiKey: "super-secret" }, input_tokens: 42 });
assert.equal(redacted.authorization, "[REDACTED]");
assert.equal(redacted.email, "[REDACTED]");
assert.equal(redacted.nested.apiKey, "[REDACTED]");
assert.equal(redacted.input_tokens, 42);

const lines = [];
const originalInfo = console.info;
const originalError = console.error;
console.info = (line) => lines.push(JSON.parse(line));
console.error = (line) => lines.push(JSON.parse(line));
try {
  const response = new EventEmitter();
  response.statusCode = 200;
  response.headers = {};
  response.setHeader = (key, value) => { response.headers[key] = value; };
  response.end = (body) => { response.body = body; response.writableEnded = true; response.emit("finish"); };
  await withRequestObservability({ method: "GET", headers: { "x-request-id": "request_test_123" } }, response, "/api/test", async () => {
    response.statusCode = 500;
    handleKnownError(response, new Error("database secret detail"), "[test]");
  });
  assert.equal(response.headers["X-Request-Id"], "request_test_123");
  assert.deepEqual(JSON.parse(response.body), { error: "Unexpected server error.", code: "INTERNAL_ERROR", request_id: "request_test_123" });
  assert(lines.some((line) => line.event === "api.error" && line.request_id === "request_test_123"));
  assert(lines.some((line) => line.event === "http.request.completed" && line.status_code === 500));

  const result = await trackAiCall({ operation: "test.generate", model: "test-model", call: async () => ({ modelVersion: "test-model-v2", usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 500, totalTokenCount: 1500 } }) });
  assert.equal(result.modelVersion, "test-model-v2");
  const metric = lines.find((line) => line.event === "ai.call.completed");
  assert.equal(metric.input_tokens, 1000);
  assert.equal(metric.output_tokens, 500);
  assert.equal(metric.total_tokens, 1500);
  assert.equal(metric.estimated_cost_usd, 0.0003);
  assert.equal(metric.outcome, "success");
} finally {
  console.info = originalInfo;
  console.error = originalError;
}

for (const file of ["handlers/generate-theme.mjs", "handlers/site-refine.mjs", "handlers/listing-copy.mjs", "site-content-backfill.mjs"]) {
  assert.match(fs.readFileSync(new URL(file, import.meta.url), "utf8"), /trackAiCall\(/, `${file} must track its AI call`);
}

console.info("Observability verified: safe public errors, request correlation, redaction, structured logs and AI usage/cost metrics.");
