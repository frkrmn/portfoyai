import assert from "node:assert/strict";
import { createLead } from "./handlers/leads.mjs";
import { normalizeLeadPhone, requestIp, verifyTurnstile } from "./lead-protection.mjs";

const siteId = "00000000-0000-4000-8000-000000000001";
const response = () => ({ headers: {}, setHeader(name, value) { this.headers[name] = value; }, end(value) { this.body = JSON.parse(value); } });
const request = (body, headers = {}) => ({ body, headers });
const supabase = (published = true) => ({
  from(table) {
    if (table === "sites") {
      const chain = { select() { return chain; }, eq() { return chain; }, async maybeSingle() { return { data: published ? { id: siteId } : null, error: null }; } };
      return chain;
    }
    return {
      insert() {
        return {
          select() {
            return {
              async single() { return { data: { id: "lead-1", created_at: "2026-09-11T00:00:00Z" }, error: null }; },
            };
          },
        };
      },
    };
  },
});
const defaults = { verifyCaptcha: async () => ({ success: true, errors: [] }), claimRate: async () => true, duplicateCheck: async () => false, hashIp: () => "hash" };
const validBody = { site_id: siteId, name: "Ada Lovelace", phone: "+90 555 111 22 33", message: "Bilgi rica ederim", website: "", turnstile_token: "valid-token" };

let res = response();
await createLead(request(validBody, { "cf-connecting-ip": "203.0.113.10" }), res, { ...defaults, supabase: supabase() });
assert.equal(res.statusCode, 201);
assert.equal(res.body.id, "lead-1");

res = response();
await createLead(request({ ...validBody, website: "spam.example" }, {}), res, { ...defaults, supabase: supabase() });
assert.equal(res.statusCode, 400);

res = response();
await createLead(request(validBody, {}), res, { ...defaults, supabase: supabase(false) });
assert.equal(res.statusCode, 404);

res = response();
await createLead(request(validBody, {}), res, { ...defaults, supabase: supabase(), claimRate: async () => false });
assert.equal(res.statusCode, 429);
assert.equal(res.headers["Retry-After"], "600");

res = response();
await createLead(request(validBody, {}), res, { ...defaults, supabase: supabase(), verifyCaptcha: async () => ({ success: false, errors: ["invalid-input-response"] }) });
assert.equal(res.statusCode, 400);

res = response();
await createLead(request(validBody, {}), res, { ...defaults, supabase: supabase(), duplicateCheck: async () => true });
assert.equal(res.statusCode, 409);

let turnstileRequest;
const captcha = await verifyTurnstile("token", "203.0.113.10", { secret: "secret", fetchImpl: async (url, options) => { turnstileRequest = { url, options }; return { ok: true, async json() { return { success: true, action: "lead_submit" }; } }; } });
assert.equal(captcha.success, true);
assert.equal(turnstileRequest.url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
assert.equal(turnstileRequest.options.body.get("remoteip"), "203.0.113.10");
assert.equal(requestIp({ headers: { "x-forwarded-for": "198.51.100.4, 10.0.0.1" } }), "198.51.100.4");
assert.equal(normalizeLeadPhone("+90 (555) 111-22-33"), "905551112233");

console.info("Lead protection: normal, CAPTCHA, rate-limit, honeypot, duplicate and publication flows verified");
