import { domainState, normalizeCustomDomain, publicDomainRecord, sslState } from "../../src/lib/custom-domain.mjs";
import { getAuthenticatedUser, getSupabaseClient, handleKnownError, methodNotAllowed, readJsonBody, routeParam, sendJson, uuidPattern } from "../api-utils.mjs";
import { requireSitePermission } from "../workspace-permissions.mjs";
import { addProjectDomain, inspectProjectDomain, removeProjectDomain, verifyProjectDomain } from "../vercel-domains.mjs";

const select = "site_id,domain,status,ssl_status,dns_records,error_code,error_message,last_checked_at,created_at,updated_at";
const load = (siteId) => getSupabaseClient().from("site_domains").select(select).eq("site_id", siteId).maybeSingle();

const saveProviderState = async (siteId, domain, provider) => {
  const now = new Date().toISOString();
  const status = domainState(provider);
  const ssl_status = sslState(provider);
  const { data, error } = await getSupabaseClient().from("site_domains").upsert({ site_id: siteId, domain, status, ssl_status, dns_records: provider.dnsRecords || [], provider_data: { verified: provider.verified, misconfigured: provider.misconfigured }, error_code: null, error_message: null, last_checked_at: now, updated_at: now }, { onConflict: "site_id" }).select(select).single();
  if (error) throw error;
  await getSupabaseClient().from("sites").update({ custom_domain: status === "verified" ? domain : null }).eq("id", siteId);
  return data;
};

const saveProviderError = async (siteId, domain, error) => {
  const now = new Date().toISOString();
  const { data, error: databaseError } = await getSupabaseClient().from("site_domains").upsert({ site_id: siteId, domain, status: "error", ssl_status: "error", dns_records: error.details?.verification || [], provider_data: error.details || {}, error_code: error.code || "provider_error", error_message: error.message, last_checked_at: now, updated_at: now }, { onConflict: "site_id" }).select(select).single();
  if (databaseError) throw databaseError;
  return data;
};

export default async function handler(request, response) {
  if (!["GET", "POST", "DELETE"].includes(request.method || "")) return methodNotAllowed(response, ["GET", "POST", "DELETE"]);
  const siteId = routeParam(request, "id");
  if (!uuidPattern.test(siteId)) return sendJson(response, 400, { error: "A valid site id is required." });
  try {
    const user = await getAuthenticatedUser(request);
    await requireSitePermission(user.id, siteId, request.method === "GET" ? "domain.read" : "domain.write");
    if (request.method === "GET") {
      const { data, error } = await load(siteId);
      if (error) throw error;
      return sendJson(response, 200, { domain: publicDomainRecord(data) });
    }
    if (request.method === "DELETE") {
      const { data, error } = await load(siteId);
      if (error) throw error;
      if (!data) return sendJson(response, 200, { removed: true });
      try { await removeProjectDomain(data.domain); } catch (providerError) { if (providerError.status !== 404) throw providerError; }
      await getSupabaseClient().from("site_domains").delete().eq("site_id", siteId);
      await getSupabaseClient().from("sites").update({ custom_domain: null }).eq("id", siteId);
      return sendJson(response, 200, { removed: true });
    }
    const body = await readJsonBody(request);
    const action = body.action === "verify" ? "verify" : "connect";
    const current = await load(siteId);
    if (current.error) throw current.error;
    const domain = action === "verify" && current.data ? current.data.domain : normalizeCustomDomain(body.domain);
    const conflict = await getSupabaseClient().from("site_domains").select("site_id").eq("domain", domain).neq("site_id", siteId).maybeSingle();
    if (conflict.error) throw conflict.error;
    if (conflict.data) return sendJson(response, 409, { error: "This domain is already connected to another site.", code: "DOMAIN_CONFLICT" });
    try {
      if (action === "connect") {
        if (current.data?.domain && current.data.domain !== domain) {
          try { await removeProjectDomain(current.data.domain); } catch (removeError) { if (removeError.status !== 404) throw removeError; }
        }
        await addProjectDomain(domain);
      } else await verifyProjectDomain(domain);
      const record = await saveProviderState(siteId, domain, await inspectProjectDomain(domain));
      return sendJson(response, 200, { domain: publicDomainRecord(record) });
    } catch (providerError) {
      const record = await saveProviderError(siteId, domain, providerError);
      return sendJson(response, providerError.status === 409 ? 409 : 502, { error: providerError.message, code: providerError.code, domain: publicDomainRecord(record) });
    }
  } catch (error) {
    return handleKnownError(response, error, "[domains] Custom domain request failed");
  }
}
