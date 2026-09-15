import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { requestIp } from "./lead-protection.mjs";

export const analyticsVisitorLimit = 60;
export const analyticsSiteDailyLimit = 50_000;
export const experimentVisitorLimit = 120;
const tokenLifetimeSeconds = 30 * 60;

const secret = () => process.env.ANALYTICS_SIGNING_SECRET || process.env.ANALYTICS_HASH_SECRET || process.env.LEAD_IP_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
const digest = (value) => createHash("sha256").update(value).digest("hex");
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const signature = (payload, key) => createHmac("sha256", key).update(payload).digest("base64url");

export const analyticsVisitorHash = (request, siteId, key = secret()) => {
  if (!key) throw new Error("ANALYTICS_SIGNING_SECRET environment variable is not set.");
  const day = new Date().toISOString().slice(0, 10);
  return digest(`${key}:${siteId}:${requestIp(request)}:${request.headers?.["user-agent"] || "unknown"}:${day}`);
};

export const mintAnalyticsToken = (request, siteId, now = Date.now()) => {
  const key = secret();
  if (!key) throw new Error("ANALYTICS_SIGNING_SECRET environment variable is not set.");
  const payload = encode({ site_id: siteId, visitor: analyticsVisitorHash(request, siteId, key), exp: Math.floor(now / 1000) + tokenLifetimeSeconds });
  return `${payload}.${signature(payload, key)}`;
};

export const verifyAnalyticsToken = (request, token, siteId, now = Date.now()) => {
  const key = secret();
  if (!key || typeof token !== "string" || token.length > 1024) return null;
  const [payload, supplied, extra] = token.split(".");
  if (!payload || !supplied || extra) return null;
  const expected = signature(payload, key);
  const left = Buffer.from(supplied); const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (parsed.site_id !== siteId || parsed.exp < Math.floor(now / 1000) || parsed.visitor !== analyticsVisitorHash(request, siteId, key)) return null;
    return parsed;
  } catch { return null; }
};

export async function claimAnalyticsBudget(supabase, siteId, visitorHash) {
  const { data, error } = await supabase.rpc("claim_public_ingestion_budget", { p_scope: "analytics", p_tenant_key: siteId, p_visitor_hash: visitorHash, p_visitor_limit: analyticsVisitorLimit, p_tenant_limit: analyticsSiteDailyLimit });
  if (error) throw new Error(`Analytics budget could not be checked: ${error.message}`);
  return data === true;
}

export async function claimExperimentBudget(supabase, request) {
  const visitorHash = analyticsVisitorHash(request, "platform");
  const { data, error } = await supabase.rpc("claim_public_ingestion_budget", { p_scope: "experiment", p_tenant_key: "platform", p_visitor_hash: visitorHash, p_visitor_limit: experimentVisitorLimit, p_tenant_limit: analyticsSiteDailyLimit });
  if (error) throw new Error(`Experiment budget could not be checked: ${error.message}`);
  return data === true;
}
