import { getAuthenticatedUser, getSupabaseClient, handleKnownError, methodNotAllowed, readJsonBody, sendJson, uuidPattern } from "../api-utils.mjs";

const cleanMember = (row) => ({ ...row, bio: row.bio || "", photo_url: row.photo_url || "" });

const ownedSite = async (userId, siteId) => {
  const { data, error } = await getSupabaseClient().from("sites").select("id").eq("id", siteId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`Failed to verify team ownership: ${error.message}`);
  return data;
};

const memberPayload = (body, partial = false) => {
  const payload = {};
  for (const field of ["name", "role", "bio", "photo_url"]) {
    if (body[field] === undefined) continue;
    const value = String(body[field] || "").trim();
    const max = field === "photo_url" ? 2_200_000 : field === "bio" ? 1000 : 160;
    if (value.length > max) throw new Error(`VALIDATION:${field} is too long.`);
    if (!partial && (field === "name" || field === "role") && !value) throw new Error(`VALIDATION:${field} is required.`);
    payload[field] = value || null;
  }
  if (!partial && (!payload.name || !payload.role)) throw new Error("VALIDATION:Name and role are required.");
  if (body.sort_order !== undefined) {
    const order = Number(body.sort_order);
    if (!Number.isInteger(order) || order < 0 || order > 10000) throw new Error("VALIDATION:Invalid sort order.");
    payload.sort_order = order;
  }
  return payload;
};

export default async function handler(request, response) {
  const siteId = request.query?.siteId;
  const memberId = request.query?.memberId;
  const allowed = siteId ? ["GET", "POST"] : ["PATCH", "DELETE"];
  if (!allowed.includes(request.method || "")) return methodNotAllowed(response, allowed);
  try {
    const user = await getAuthenticatedUser(request);
    const supabase = getSupabaseClient();
    if (siteId) {
      if (!uuidPattern.test(siteId) || !(await ownedSite(user.id, siteId))) return sendJson(response, 404, { error: "Owned site not found." });
      if (request.method === "GET") {
        const { data, error } = await supabase.from("team_members").select("id, site_id, name, role, bio, photo_url, sort_order, created_at").eq("site_id", siteId).order("sort_order").order("created_at");
        if (error) throw new Error(`Failed to load team members: ${error.message}`);
        return sendJson(response, 200, { team_members: (data || []).map(cleanMember) });
      }
      const body = await readJsonBody(request, 3 * 1024 * 1024);
      const payload = memberPayload(body);
      const { data, error } = await supabase.from("team_members").insert({ site_id: siteId, ...payload, sort_order: body.sort_order ?? 0 }).select().single();
      if (error) throw new Error(`Failed to add team member: ${error.message}`);
      return sendJson(response, 201, { team_member: cleanMember(data) });
    }
    if (!uuidPattern.test(memberId || "")) return sendJson(response, 400, { error: "A valid team member id is required." });
    const { data: current, error: currentError } = await supabase.from("team_members").select("id, site_id").eq("id", memberId).maybeSingle();
    if (currentError) throw new Error(`Failed to load team member: ${currentError.message}`);
    if (!current || !(await ownedSite(user.id, current.site_id))) return sendJson(response, 404, { error: "Team member not found." });
    if (request.method === "DELETE") {
      const { error } = await supabase.from("team_members").delete().eq("id", memberId);
      if (error) throw new Error(`Failed to delete team member: ${error.message}`);
      return sendJson(response, 200, { deleted: true });
    }
    const body = await readJsonBody(request, 3 * 1024 * 1024);
    const payload = memberPayload(body, true);
    if (!Object.keys(payload).length) return sendJson(response, 400, { error: "No team member changes supplied." });
    const { data, error } = await supabase.from("team_members").update(payload).eq("id", memberId).select().single();
    if (error) throw new Error(`Failed to update team member: ${error.message}`);
    return sendJson(response, 200, { team_member: cleanMember(data) });
  } catch (error) {
    if (error instanceof Error && error.message === "Request body is too large") return sendJson(response, 413, { error: "Fotoğraf dahil istek boyutu en fazla 3 MB olabilir." });
    if (error instanceof Error && error.message.startsWith("VALIDATION:")) return sendJson(response, 400, { error: error.message.slice(11) });
    return handleKnownError(response, error, "[team-members] Request failed");
  }
}
