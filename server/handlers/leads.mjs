import { getAuthenticatedUser, getSupabaseClient, handleKnownError, methodNotAllowed, readJsonBody, sendJson, uuidPattern } from "../api-utils.mjs";

const createLead = async (request, response) => {
  const body = await readJsonBody(request);
  const siteId = typeof body.site_id === "string" ? body.site_id.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!uuidPattern.test(siteId)) return sendJson(response, 400, { error: "A valid site_id is required." });
  if (!name) return sendJson(response, 400, { error: "Name is required." });
  if (!phone) return sendJson(response, 400, { error: "Phone is required." });
  if (name.length > 120) return sendJson(response, 400, { error: "Name must be 120 characters or fewer." });
  if (phone.length < 5 || phone.length > 40) return sendJson(response, 400, { error: "Phone must be between 5 and 40 characters." });
  if (message.length > 2000) return sendJson(response, 400, { error: "Message must be 2000 characters or fewer." });
  const { data: site, error: siteError } = await getSupabaseClient().from("sites").select("id").eq("id", siteId).maybeSingle();
  if (siteError) throw new Error(`Failed to validate lead site: ${siteError.message}`);
  if (!site) return sendJson(response, 404, { error: "Site not found." });
  let { data: lead, error } = await getSupabaseClient().from("leads").insert({ site_id: site.id, name, phone, message: message || null }).select("id, created_at").single();
  if (error?.code === "23502" && error.message.includes("source")) {
    const retry = await getSupabaseClient().from("leads").insert({ site_id: site.id, name, phone, message: message || null, source: "public-site" }).select("id, created_at").single();
    lead = retry.data;
    error = retry.error;
  }
  if (error) throw new Error(`Failed to save lead: ${error.message}`);
  return sendJson(response, 201, { id: lead.id, created_at: lead.created_at });
};

const getOwnedLeads = async (request, response) => {
  const user = await getAuthenticatedUser(request);
  const { data: sites, error: sitesError } = await getSupabaseClient().from("sites").select("id").eq("user_id", user.id);
  if (sitesError) throw new Error(`Failed to load lead sites: ${sitesError.message}`);
  const siteIds = (sites || []).map((site) => site.id);
  if (siteIds.length === 0) return sendJson(response, 200, { leads: [] });
  const { data: leads, error } = await getSupabaseClient().from("leads").select("id, site_id, name, phone, message, created_at").in("site_id", siteIds).order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load owned leads: ${error.message}`);
  return sendJson(response, 200, { leads: leads || [] });
};

export default async function handler(request, response) {
  if (!["GET", "POST"].includes(request.method || "")) return methodNotAllowed(response, ["GET", "POST"]);
  try {
    return request.method === "POST" ? await createLead(request, response) : await getOwnedLeads(request, response);
  } catch (error) {
    return handleKnownError(response, error, request.method === "POST" ? "[leads] Lead creation failed" : "[leads] Owned lead fetch failed");
  }
}
