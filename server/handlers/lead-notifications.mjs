import { getAuthenticatedUser, getSupabaseClient, handleKnownError, methodNotAllowed, readJsonBody, sendJson, uuidPattern } from "../api-utils.mjs";
import { dispatchLeadNotifications } from "../lead-notifications.mjs";

const boolean = (value, fallback) => typeof value === "boolean" ? value : fallback;

export async function getLeadNotifications(request, response, supabase = getSupabaseClient()) {
  const user = await getAuthenticatedUser(request);
  const [{ data: preferences, error: preferenceError }, { data: deliveries, error: deliveryError }] = await Promise.all([
    supabase.from("lead_notification_preferences").select("email_enabled, whatsapp_enabled, browser_enabled, email_to, whatsapp_to").eq("user_id", user.id).maybeSingle(),
    supabase.from("lead_notification_deliveries").select("id, lead_id, listing_id, channel, status, attempts, last_error, delivered_at, next_retry_at, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
  ]);
  if (preferenceError || deliveryError) throw new Error(preferenceError?.message || deliveryError?.message);
  return sendJson(response, 200, { preferences: preferences || { email_enabled: true, whatsapp_enabled: false, browser_enabled: true, email_to: user.email || "", whatsapp_to: "" }, deliveries: deliveries || [] });
}

export async function updateLeadNotifications(request, response, supabase = getSupabaseClient()) {
  const user = await getAuthenticatedUser(request);
  const body = await readJsonBody(request);
  if (body.delivery_id) {
    if (!uuidPattern.test(body.delivery_id) || !["delivered", "failed"].includes(body.status)) return sendJson(response, 400, { error: "Invalid delivery update." });
    const { data, error } = await supabase.from("lead_notification_deliveries").update({ status: body.status, delivered_at: body.status === "delivered" ? new Date().toISOString() : null, last_error: body.error || null, updated_at: new Date().toISOString() }).eq("id", body.delivery_id).eq("user_id", user.id).select("*").single();
    if (error) throw new Error(error.message);
    return sendJson(response, 200, { delivery: data });
  }
  const record = { user_id: user.id, email_enabled: boolean(body.email_enabled, true), whatsapp_enabled: boolean(body.whatsapp_enabled, false), browser_enabled: boolean(body.browser_enabled, true), email_to: typeof body.email_to === "string" ? body.email_to.trim() || null : null, whatsapp_to: typeof body.whatsapp_to === "string" ? body.whatsapp_to.replace(/[^\d+]/g, "") || null : null, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from("lead_notification_preferences").upsert(record).select("*").single();
  if (error) throw new Error(error.message);
  return sendJson(response, 200, { preferences: data });
}

export async function retryLeadNotification(request, response, supabase = getSupabaseClient()) {
  const user = await getAuthenticatedUser(request);
  const body = await readJsonBody(request);
  if (!uuidPattern.test(body.delivery_id || "")) return sendJson(response, 400, { error: "Valid delivery_id required." });
  const { data: delivery, error } = await supabase.from("lead_notification_deliveries").select("*").eq("id", body.delivery_id).eq("user_id", user.id).single();
  if (error || !delivery) return sendJson(response, 404, { error: "Delivery not found." });
  const { data: lead } = await supabase.from("leads").select("id, site_id, listing_id, name, phone, message, created_at").eq("id", delivery.lead_id).single();
  if (!lead) return sendJson(response, 404, { error: "Lead not found." });
  const { data: site } = await supabase.from("sites").select("id, user_id, business_name").eq("id", lead.site_id).eq("user_id", user.id).single();
  if (!site) return sendJson(response, 404, { error: "Site not found." });
  const listing = lead.listing_id ? (await supabase.from("listings").select("id, title").eq("id", lead.listing_id).maybeSingle()).data : null;
  await supabase.from("lead_notification_deliveries").update({ status: "pending", next_retry_at: null, updated_at: new Date().toISOString() }).eq("id", delivery.id);
  await dispatchLeadNotifications(supabase, { lead, site, listing });
  return sendJson(response, 200, { retried: true });
}

export default async function handler(request, response) {
  if (!['GET', 'PATCH', 'POST'].includes(request.method || '')) return methodNotAllowed(response, ['GET', 'PATCH', 'POST']);
  try {
    if (request.method === 'GET') return await getLeadNotifications(request, response);
    if (request.method === 'PATCH') return await updateLeadNotifications(request, response);
    return await retryLeadNotification(request, response);
  } catch (error) {
    return handleKnownError(response, error, "[lead-notifications] Request failed");
  }
}
