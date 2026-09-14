import { createHash, randomBytes } from "node:crypto";
import { getSupabaseClient, handleKnownError, methodNotAllowed, readJsonBody, sendJson, uuidPattern } from "../api-utils.mjs";
import { claimLeadRateLimit, hashLeadIp, isDuplicateLead, normalizeLeadPhone, requestIp, verifyTurnstile } from "../lead-protection.mjs";
import { GUIDED_MATCH_SCHEMA_VERSION, guidedMatchSummary, rankGuidedListings, sanitizeGuidedAnswers } from "../../src/lib/guided-match.mjs";

const tokenHash = (token) => createHash("sha256").update(token).digest("hex");
const publicResult = (row) => ({ id: row.id, locale: row.locale, answers: row.answers, recommendations: row.recommendations, summary: row.summary, expires_at: row.expires_at });

async function create(request, response) {
  const supabase = getSupabaseClient(); const body = await readJsonBody(request);
  const siteId = String(body.site_id || ""); const name = String(body.name || "").trim().slice(0, 120); const phone = String(body.phone || "").trim().slice(0, 40);
  if (!uuidPattern.test(siteId) || !name || phone.length < 5 || body.consent !== true) return sendJson(response, 400, { error: "Valid contact details and consent are required." });
  if (typeof body.website === "string" && body.website.trim()) return sendJson(response, 400, { error: "Spam submission rejected." });
  const answers = sanitizeGuidedAnswers(body.answers); const locale = body.locale === "en" ? "en" : "tr";
  const { data: site, error: siteError } = await supabase.from("sites").select("id,user_id,business_name,slug").eq("id", siteId).eq("status", "published").maybeSingle();
  if (siteError) throw siteError; if (!site) return sendJson(response, 404, { error: "Published site not found." });
  const ip = requestIp(request); if (!await claimLeadRateLimit(supabase, site.id, hashLeadIp(ip))) return sendJson(response, 429, { error: "Too many requests." });
  const captcha = await verifyTurnstile(String(body.turnstile_token || ""), ip); if (!captcha.success) return sendJson(response, 400, { error: "CAPTCHA verification failed." });
  let lead; let duplicateLead = false;
  if (await isDuplicateLead(supabase, site.id, phone)) {
    const { data } = await supabase.from("leads").select("id,phone").eq("site_id", site.id).order("created_at", { ascending: false }).limit(25);
    lead = (data || []).find((item) => normalizeLeadPhone(item.phone || "") === normalizeLeadPhone(phone)); duplicateLead = Boolean(lead);
  }
  if (!lead) { const result = await supabase.from("leads").insert({ site_id: site.id, name, phone, message: locale === "en" ? "Guided matching request" : "Rehberli eşleşme talebi", source: "guided-match" }).select("id").single(); if (result.error) throw result.error; lead = result.data; }
  const { data: listings, error: listingsError } = await supabase.from("listings").select("id,title,description,price,currency,district,address,features,property_category,property_subtype").eq("site_id", site.id).eq("status", "active").eq("listing_status", "active");
  if (listingsError) throw listingsError;
  const recommendations = rankGuidedListings(listings || [], answers, locale); const summary = guidedMatchSummary(answers, recommendations, locale); const token = randomBytes(32).toString("base64url");
  const result = await supabase.from("guided_match_results").insert({ lead_id: lead.id, site_id: site.id, token_hash: tokenHash(token), schema_version: GUIDED_MATCH_SCHEMA_VERSION, locale, answers, recommendations, summary }).select("id,locale,answers,recommendations,summary,expires_at").single();
  if (result.error) throw result.error;
  const activity = await supabase.from("lead_activities").insert({ lead_id: lead.id, user_id: site.user_id, activity_type: "guided_match", schema_version: GUIDED_MATCH_SCHEMA_VERSION, consent: true, payload: { match_id: result.data.id, share_token: token, share_path: `/site/${site.slug}/listings?match=${encodeURIComponent(token)}`, locale, answers, recommendations, summary }, detail: summary });
  if (activity.error) throw activity.error;
  return sendJson(response, 201, { ...publicResult(result.data), token, duplicate_lead: duplicateLead });
}

async function read(request, response) {
  const token = String(request.query?.token || ""); if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) return sendJson(response, 404, { error: "Match not found." });
  const { data, error } = await getSupabaseClient().from("guided_match_results").select("id,locale,answers,recommendations,summary,expires_at,revoked_at").eq("token_hash", tokenHash(token)).maybeSingle();
  if (error) throw error; if (!data || data.revoked_at || Date.parse(data.expires_at) <= Date.now()) return sendJson(response, 410, { error: "This match link has expired or was revoked." });
  return sendJson(response, 200, publicResult(data));
}

export default async function handler(request, response) { try { if (request.method === "POST") return await create(request, response); if (request.method === "GET") return await read(request, response); return methodNotAllowed(response, ["GET", "POST"]); } catch (error) { return handleKnownError(response, error, "[guided-match]"); } }
