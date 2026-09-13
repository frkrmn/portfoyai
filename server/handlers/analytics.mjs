import { createHash } from "node:crypto";
import { getAuthenticatedUser, getSupabaseClient, handleKnownError, methodNotAllowed, readJsonBody, sendJson, uuidPattern } from "../api-utils.mjs";

const eventTypes = new Set(["site_view", "listing_view", "lead_conversion"]);
const botPattern = /bot|crawler|spider|slurp|headless|lighthouse|preview|vercel-screenshot/i;
const clean = (value, max = 120) => typeof value === "string" ? value.trim().slice(0, max) || null : null;
const day = () => new Date().toISOString().slice(0, 10);
const hash = (value) => createHash("sha256").update(`${process.env.ANALYTICS_HASH_SECRET || process.env.LEAD_IP_HASH_SECRET || "fastate-analytics"}:${value}:${day()}`).digest("hex");

export async function collectAnalytics(request, response, supabase = getSupabaseClient()) {
  if (request.headers?.dnt === "1" || request.headers?.["x-do-not-track"] === "1" || botPattern.test(request.headers?.["user-agent"] || "")) return sendJson(response, 202, { accepted: false, reason: "filtered" });
  const body = await readJsonBody(request);
  if (!eventTypes.has(body.event_type) || !uuidPattern.test(body.site_id || "")) return sendJson(response, 400, { error: "Invalid analytics event." });
  const listingId = uuidPattern.test(body.listing_id || "") ? body.listing_id : null;
  const leadId = uuidPattern.test(body.lead_id || "") ? body.lead_id : null;
  const { data: site } = await supabase.from("sites").select("id").eq("id", body.site_id).eq("status", "published").maybeSingle();
  if (!site) return sendJson(response, 404, { error: "Published site not found." });
  if (listingId) { const { data } = await supabase.from("listings").select("id").eq("id", listingId).eq("site_id", site.id).maybeSingle(); if (!data) return sendJson(response, 400, { error: "Listing does not belong to site." }); }
  if (leadId) { const { data } = await supabase.from("leads").select("id").eq("id", leadId).eq("site_id", site.id).maybeSingle(); if (!data) return sendJson(response, 400, { error: "Lead does not belong to site." }); }
  const sessionHash = hash(clean(body.session_id, 160) || `${request.socket?.remoteAddress || "unknown"}:${request.headers?.["user-agent"] || ""}`);
  const source = clean(body.utm_source) || clean(body.referrer_host) || "direct";
  const eventKey = hash(`${sessionHash}:${body.event_type}:${listingId || "site"}:${leadId || "none"}`);
  const { data: event, error } = await supabase.from("analytics_events").upsert({ site_id: site.id, listing_id: listingId, lead_id: leadId, event_type: body.event_type, session_hash: sessionHash, source, referrer_host: clean(body.referrer_host), utm_source: clean(body.utm_source), utm_medium: clean(body.utm_medium), utm_campaign: clean(body.utm_campaign), event_key: eventKey }, { onConflict: "event_key", ignoreDuplicates: true }).select("id").maybeSingle();
  if (error) throw new Error(`Analytics event could not be saved: ${error.message}`);
  return sendJson(response, event ? 201 : 200, { accepted: true, duplicate: !event });
}

export async function reportAnalytics(request, response, supabase = getSupabaseClient()) {
  const user = await getAuthenticatedUser(request);
  const requestUrl = new URL(request.url || "/api/analytics", `http://${request.headers?.host || "localhost"}`);
  const siteId = clean(request.query?.site_id || requestUrl.searchParams.get("site_id"));
  if (!siteId || !uuidPattern.test(siteId)) return sendJson(response, 400, { error: "Valid site_id required." });
  const { data: site } = await supabase.from("sites").select("id").eq("id", siteId).eq("user_id", user.id).maybeSingle();
  if (!site) return sendJson(response, 404, { error: "Site not found." });
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data, error } = await supabase.from("analytics_events").select("event_type, listing_id, source, utm_source, utm_medium, utm_campaign, occurred_at").eq("site_id", site.id).gte("occurred_at", since).order("occurred_at", { ascending: false }).limit(10000);
  if (error) throw new Error(`Analytics report could not be loaded: ${error.message}`);
  const events = data || [];
  const count = (type) => events.filter((event) => event.event_type === type).length;
  const byListing = Object.values(events.reduce((result, event) => { if (!event.listing_id) return result; const item = result[event.listing_id] ||= { listing_id: event.listing_id, views: 0, conversions: 0 }; if (event.event_type === "listing_view") item.views += 1; if (event.event_type === "lead_conversion") item.conversions += 1; return result; }, {}));
  const sources = Object.entries(events.reduce((result, event) => { result[event.source || "direct"] = (result[event.source || "direct"] || 0) + 1; return result; }, {})).map(([source, views]) => ({ source, views })).sort((a, b) => b.views - a.views);
  const siteViews = count("site_view") + count("listing_view"); const conversions = count("lead_conversion");
  return sendJson(response, 200, { period_days: 30, totals: { views: siteViews, listing_views: count("listing_view"), conversions, conversion_rate: siteViews ? Number(((conversions / siteViews) * 100).toFixed(1)) : 0 }, by_listing: byListing, sources });
}

export default async function handler(request, response) {
  if (!['GET', 'POST'].includes(request.method || '')) return methodNotAllowed(response, ['GET', 'POST']);
  try { return request.method === 'POST' ? await collectAnalytics(request, response) : await reportAnalytics(request, response); }
  catch (error) { return handleKnownError(response, error, "[analytics] Request failed"); }
}
