import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

const requestStorage = new AsyncLocalStorage();
const sensitiveKey = /authorization|cookie|password|secret|api.?key|access.?token|refresh.?token|id.?token|captcha.?token|turnstile.?token|email|phone|name|prompt|content|message/i;
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const bearerPattern = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;
const jwtPattern = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const aiWindow = [];

const numberFromEnv = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

export function redact(value, key = "") {
  if (sensitiveKey.test(key)) return "[REDACTED]";
  if (value instanceof Error) return { name: value.name, message: redact(value.message), stack: process.env.NODE_ENV === "development" ? redact(value.stack || "") : undefined };
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, redact(child, childKey)]));
  if (typeof value === "string") return value.replace(bearerPattern, "Bearer [REDACTED]").replace(jwtPattern, "[REDACTED_JWT]").replace(emailPattern, "[REDACTED_EMAIL]");
  return value;
}

export function requestContext() {
  return requestStorage.getStore() || {};
}

export function structuredLog(level, event, fields = {}) {
  const context = requestContext();
  const record = redact({ timestamp: new Date().toISOString(), level, event, service: "portfoyai-api", environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development", request_id: context.requestId, route: context.route, ...fields });
  const line = JSON.stringify(record);
  (level === "error" ? console.error : level === "warn" ? console.warn : console.info)(line);
  const webhook = process.env.ERROR_TRACKING_WEBHOOK_URL;
  if (level === "error" && webhook) void fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: line }).catch(() => {});
  return record;
}

export function withRequestObservability(request, response, route, handler) {
  const incoming = request.headers?.["x-request-id"];
  const requestId = typeof incoming === "string" && /^[A-Za-z0-9_-]{8,128}$/.test(incoming) ? incoming : randomUUID();
  const startedAt = Date.now();
  response.setHeader("X-Request-Id", requestId);
  return requestStorage.run({ requestId, route }, async () => {
    let logged = false;
    const complete = () => {
      if (logged) return;
      logged = true;
      structuredLog(response.statusCode >= 500 ? "error" : "info", "http.request.completed", { method: request.method, status_code: response.statusCode, duration_ms: Date.now() - startedAt });
    };
    response.once?.("finish", complete);
    try {
      return await handler();
    } catch (error) {
      structuredLog("error", "http.request.unhandled", { error });
      throw error;
    } finally {
      if (response.writableEnded) complete();
    }
  });
}

function aiUsage(result) {
  const usage = result?.usageMetadata || result?.usage || {};
  return {
    input_tokens: Number(usage.promptTokenCount || usage.inputTokens || 0),
    output_tokens: Number(usage.candidatesTokenCount || usage.outputTokens || 0),
    total_tokens: Number(usage.totalTokenCount || usage.totalTokens || 0),
  };
}

function estimatedCost(usage) {
  const inputRate = numberFromEnv("AI_INPUT_USD_PER_MILLION_TOKENS", 0.1);
  const outputRate = numberFromEnv("AI_OUTPUT_USD_PER_MILLION_TOKENS", 0.4);
  return Number(((usage.input_tokens * inputRate + usage.output_tokens * outputRate) / 1_000_000).toFixed(8));
}

function evaluateAiAlerts(metric) {
  aiWindow.push(metric);
  if (aiWindow.length > 100) aiWindow.shift();
  const latencyLimit = numberFromEnv("AI_ALERT_LATENCY_MS", 15_000);
  const costLimit = numberFromEnv("AI_ALERT_COST_USD", 0.05);
  const errorRateLimit = numberFromEnv("AI_ALERT_ERROR_RATE_PERCENT", 20);
  const errorRate = aiWindow.filter((item) => item.outcome === "error").length / aiWindow.length * 100;
  const reasons = [];
  if (metric.latency_ms > latencyLimit) reasons.push("latency");
  if (metric.estimated_cost_usd > costLimit) reasons.push("cost");
  if (aiWindow.length >= 5 && errorRate > errorRateLimit) reasons.push("error_rate");
  if (reasons.length) structuredLog("warn", "ai.alert.threshold_exceeded", { reasons, operation: metric.operation, model: metric.model, latency_ms: metric.latency_ms, estimated_cost_usd: metric.estimated_cost_usd, rolling_error_rate_percent: Number(errorRate.toFixed(2)), sample_size: aiWindow.length });
}

export async function trackAiCall({ operation, provider = "gemini", model, call }) {
  const startedAt = Date.now();
  try {
    const result = await call();
    const usage = aiUsage(result);
    const metric = { operation, provider, model: result?.modelVersion || model, outcome: "success", latency_ms: Date.now() - startedAt, ...usage, estimated_cost_usd: estimatedCost(usage), pricing: process.env.AI_INPUT_USD_PER_MILLION_TOKENS || process.env.AI_OUTPUT_USD_PER_MILLION_TOKENS ? "environment" : "default_estimate" };
    structuredLog("info", "ai.call.completed", metric);
    evaluateAiAlerts(metric);
    return result;
  } catch (error) {
    const metric = { operation, provider, model, outcome: "error", latency_ms: Date.now() - startedAt, input_tokens: 0, output_tokens: 0, total_tokens: 0, estimated_cost_usd: 0 };
    structuredLog("error", "ai.call.failed", { ...metric, error });
    evaluateAiAlerts(metric);
    throw error;
  }
}
