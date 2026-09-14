import { getAuthenticatedUser, getSupabaseClient, handleKnownError, methodNotAllowed, readJsonBody, sendJson, uuidPattern } from "../api-utils.mjs";
import { claimLeadRateLimit, hashLeadIp, isDuplicateLead, requestIp, verifyTurnstile } from "../lead-protection.mjs";
import { dispatchLeadNotifications } from "../lead-notifications.mjs";
import { accessibleSiteIds } from "../workspace-permissions.mjs";

export const createLead = async (request, response, { supabase = getSupabaseClient(), verifyCaptcha = verifyTurnstile, claimRate = claimLeadRateLimit, duplicateCheck = isDuplicateLead, hashIp = hashLeadIp, dispatchNotifications = dispatchLeadNotifications } = {}) => {
  const body = await readJsonBody(request);
  const siteId = typeof body.site_id === "string" ? body.site_id.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const captchaToken = typeof body.turnstile_token === "string" ? body.turnstile_token : "";
  const listingId = typeof body.listing_id === "string" && uuidPattern.test(body.listing_id) ? body.listing_id : null;
  if (typeof body.website === "string" && body.website.trim()) return sendJson(response, 400, { error: "Spam submission rejected." });
  if (!uuidPattern.test(siteId)) return sendJson(response, 400, { error: "A valid site_id is required." });
  if (!name) return sendJson(response, 400, { error: "Name is required." });
  if (!phone) return sendJson(response, 400, { error: "Phone is required." });
  if (name.length > 120) return sendJson(response, 400, { error: "Name must be 120 characters or fewer." });
  if (phone.length < 5 || phone.length > 40) return sendJson(response, 400, { error: "Phone must be between 5 and 40 characters." });
  if (message.length > 2000) return sendJson(response, 400, { error: "Message must be 2000 characters or fewer." });
  const { data: site, error: siteError } = await supabase.from("sites").select("id, user_id, business_name").eq("id", siteId).eq("status", "published").maybeSingle();
  if (siteError) throw new Error(`Failed to validate lead site: ${siteError.message}`);
  if (!site) return sendJson(response, 404, { error: "Published site not found." });
  const ip = requestIp(request);
  const allowed = await claimRate(supabase, site.id, hashIp(ip));
  if (!allowed) {
    response.setHeader("Retry-After", "600");
    return sendJson(response, 429, { error: "Too many requests. Please try again later." });
  }
  const captcha = await verifyCaptcha(captchaToken, ip);
  if (!captcha.success) {
    console.warn(`[leads] Turnstile rejected site=${site.id} errors=${captcha.errors.join(",")}`);
    return sendJson(response, 400, { error: "CAPTCHA verification failed. Please try again." });
  }
  if (await duplicateCheck(supabase, site.id, phone)) return sendJson(response, 409, { error: "This request was already received recently." });
  let { data: lead, error } = await supabase.from("leads").insert({ site_id: site.id, listing_id: listingId, name, phone, email: email || null, message: message || null }).select("id, site_id, listing_id, name, phone, message, created_at").single();
  if (error?.code === "23502" && error.message.includes("source")) {
    const retry = await supabase.from("leads").insert({ site_id: site.id, listing_id: listingId, name, phone, message: message || null, source: "public-site" }).select("id, site_id, listing_id, name, phone, message, created_at").single();
    lead = retry.data;
    error = retry.error;
  }
  if (error) throw new Error(`Failed to save lead: ${error.message}`);
  let listing = null;
  if (listingId) {
    const result = await supabase.from("listings").select("id, title").eq("id", listingId).eq("site_id", site.id).maybeSingle();
    listing = result.data || null;
  }
  await dispatchNotifications(supabase, { lead, site, listing }).catch((notificationError) => {
    console.error("[leads] Notification dispatch failed", notificationError);
  });
  return sendJson(response, 201, { id: lead.id, created_at: lead.created_at });
};

const leadFields = "id, site_id, listing_id, name, phone, email, message, source, created_at, contacted_at, crm_status, assignee, note, reminder_at";

const getOwnedLeads = async (request, response) => {
  const user = await getAuthenticatedUser(request);
  const siteIds = await accessibleSiteIds(user.id, "lead.read");
  if (siteIds.length === 0) return sendJson(response, 200, { leads: [] });
  const supabase = getSupabaseClient();
  const { data: leads, error } = await supabase.from("leads").select(leadFields).in("site_id", siteIds).order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load owned leads: ${error.message}`);
  const leadIds = (leads || []).map((lead) => lead.id);
  const activitiesResult = leadIds.length ? await supabase.from("lead_activities").select("id,lead_id,activity_type,detail,created_at").in("lead_id", leadIds).order("created_at", { ascending: false }) : { data: [], error: null };
  if (activitiesResult.error) throw new Error(`Failed to load lead activities: ${activitiesResult.error.message}`);
  return sendJson(response, 200, { leads: (leads || []).map((lead) => ({ ...lead, activities: (activitiesResult.data || []).filter((activity) => activity.lead_id === lead.id) })) });
};

const updateOwnedLead = async (request, response) => {
  const user = await getAuthenticatedUser(request);
  const body = await readJsonBody(request);
  if (!uuidPattern.test(String(body.id || ""))) return sendJson(response, 400, { error: "A valid lead id is required." });
  const statuses = ["new", "contacted", "appointment", "won", "lost"];
  const siteIds = await accessibleSiteIds(user.id, body.action === "merge" ? "lead.merge" : "lead.write");
  const supabase = getSupabaseClient();
  if (body.action === "merge") {
    if (!uuidPattern.test(String(body.duplicate_id || ""))) return sendJson(response, 400, { error: "A valid duplicate id is required." });
    const { data: merged, error: mergeError } = await supabase.rpc("merge_owned_leads", { p_primary_id: body.id, p_duplicate_id: body.duplicate_id, p_user_id: user.id });
    if (mergeError) throw mergeError;
    return sendJson(response, 200, { lead: merged, deleted_id: body.duplicate_id });
  }
  const updates = {};
  if (body.contacted_at === null || (typeof body.contacted_at === "string" && Number.isFinite(Date.parse(body.contacted_at)))) updates.contacted_at = body.contacted_at;
  if (body.crm_status !== undefined) { if (!statuses.includes(body.crm_status)) return sendJson(response, 400, { error: "Invalid CRM status." }); updates.crm_status = body.crm_status; updates.contacted_at = body.crm_status === "new" ? null : new Date().toISOString(); }
  for (const key of ["assignee", "note"]) if (body[key] === null || typeof body[key] === "string") updates[key] = body[key]?.trim() || null;
  if (body.reminder_at === null || (typeof body.reminder_at === "string" && Number.isFinite(Date.parse(body.reminder_at)))) updates.reminder_at = body.reminder_at;
  if (!Object.keys(updates).length) return sendJson(response, 400, { error: "No valid CRM changes supplied." });
  const { data: lead, error } = await supabase.from("leads").update(updates).eq("id", body.id).in("site_id", siteIds).select(leadFields).maybeSingle();
  if (error) throw new Error(`Failed to update lead: ${error.message}`);
  if (!lead) return sendJson(response, 404, { error: "Lead not found." });
  const detail = Object.entries(updates).map(([key, value]) => `${key}: ${value ?? "—"}`).join(", ");
  await supabase.from("lead_activities").insert({ lead_id: lead.id, user_id: user.id, activity_type: body.crm_status ? "status_changed" : "updated", detail });
  return sendJson(response, 200, { lead: { ...lead, activities: [{ id: crypto.randomUUID(), activity_type: body.crm_status ? "status_changed" : "updated", detail, created_at: new Date().toISOString() }, ...(body.activities || [])] } });
};

export default async function handler(request, response) {
  if (!["GET", "POST", "PATCH"].includes(request.method || "")) return methodNotAllowed(response, ["GET", "POST", "PATCH"]);
  try {
    return request.method === "POST" ? await createLead(request, response) : request.method === "PATCH" ? await updateOwnedLead(request, response) : await getOwnedLeads(request, response);
  } catch (error) {
    return handleKnownError(response, error, request.method === "POST" ? "[leads] Lead creation failed" : "[leads] Owned lead fetch failed");
  }
}
