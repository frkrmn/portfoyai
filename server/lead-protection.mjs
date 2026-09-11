import { createHash, randomUUID } from "node:crypto";

export const leadRateLimit = 5;
export const leadRateWindowMinutes = 10;
export const leadDuplicateWindowMinutes = 15;

export const requestIp = (request) => {
  const value = request.headers["cf-connecting-ip"] || request.headers["x-real-ip"] || request.headers["x-forwarded-for"];
  const raw = Array.isArray(value) ? value[0] : String(value || "").split(",")[0];
  return raw.trim() || "unknown";
};

export const hashLeadIp = (ip, secret = process.env.LEAD_IP_HASH_SECRET || process.env.TURNSTILE_SECRET_KEY) => {
  if (!secret) throw new Error("LEAD_IP_HASH_SECRET or TURNSTILE_SECRET_KEY environment variable is not set.");
  return createHash("sha256").update(`${secret}:${ip}`).digest("hex");
};

export const normalizeLeadPhone = (phone) => phone.replace(/\D/g, "");

export async function verifyTurnstile(token, ip, { secret = process.env.TURNSTILE_SECRET_KEY, fetchImpl = fetch } = {}) {
  if (!secret) throw new Error("TURNSTILE_SECRET_KEY environment variable is not set.");
  if (typeof token !== "string" || !token || token.length > 2048) return { success: false, errors: ["missing-or-invalid-token"] };
  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token);
  if (ip !== "unknown") form.set("remoteip", ip);
  form.set("idempotency_key", randomUUID());
  const response = await fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Turnstile verification failed with status ${response.status}.`);
  const result = await response.json();
  return { success: result.success === true && (!result.action || result.action === "lead_submit"), errors: result["error-codes"] || [] };
}

export async function claimLeadRateLimit(supabase, siteId, ipHash) {
  const { data, error } = await supabase.rpc("claim_lead_submission", { p_site_id: siteId, p_ip_hash: ipHash, p_limit: leadRateLimit, p_window_minutes: leadRateWindowMinutes });
  if (error) throw new Error(`Failed to check lead rate limit: ${error.message}`);
  return data === true;
}

export async function isDuplicateLead(supabase, siteId, phone, now = new Date()) {
  const cutoff = new Date(now.getTime() - leadDuplicateWindowMinutes * 60_000).toISOString();
  const normalized = normalizeLeadPhone(phone);
  const candidates = new Set([phone, normalized]);
  const { data, error } = await supabase.from("leads").select("phone").eq("site_id", siteId).gte("created_at", cutoff).limit(25);
  if (error) throw new Error(`Failed to check duplicate lead: ${error.message}`);
  return (data || []).some((lead) => candidates.has(lead.phone) || normalizeLeadPhone(lead.phone || "") === normalized);
}
