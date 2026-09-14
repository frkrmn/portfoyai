import { fallbackDnsRecords } from "../src/lib/custom-domain.mjs";

const settings = () => {
  const token = process.env.VERCEL_TOKEN;
  const project = process.env.VERCEL_PROJECT_ID || process.env.VERCEL_PROJECT_NAME;
  if (!token || !project) throw new Error("DOMAIN_PROVIDER_NOT_CONFIGURED");
  return { token, project, teamId: process.env.VERCEL_TEAM_ID || "" };
};

const request = async (path, options = {}, fetchImpl = fetch) => {
  const { token, teamId } = settings();
  const url = new URL(`https://api.vercel.com${path}`);
  if (teamId) url.searchParams.set("teamId", teamId);
  const response = await fetchImpl(url, { ...options, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...options.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error?.message || `Vercel domain request failed (${response.status}).`);
    error.code = body.error?.code || `http_${response.status}`;
    error.status = response.status;
    error.details = body;
    throw error;
  }
  return body;
};

const projectPath = (domain, suffix = "") => {
  const { project } = settings();
  return `/v9/projects/${encodeURIComponent(project)}/domains/${encodeURIComponent(domain)}${suffix}`;
};

export async function addProjectDomain(domain, fetchImpl = fetch) {
  const { project } = settings();
  return request(`/v10/projects/${encodeURIComponent(project)}/domains`, { method: "POST", body: JSON.stringify({ name: domain }) }, fetchImpl);
}
export const verifyProjectDomain = (domain, fetchImpl = fetch) => request(projectPath(domain, "/verify"), { method: "POST" }, fetchImpl);
export const removeProjectDomain = (domain, fetchImpl = fetch) => request(projectPath(domain), { method: "DELETE" }, fetchImpl);
export async function inspectProjectDomain(domain, fetchImpl = fetch) {
  const [project, config] = await Promise.all([
    request(projectPath(domain), {}, fetchImpl),
    request(`/v6/domains/${encodeURIComponent(domain)}/config`, {}, fetchImpl),
  ]);
  const verification = Array.isArray(project.verification) ? project.verification.map((item) => ({ type: item.type, name: item.domain || item.name, value: item.value })).filter((item) => item.type && item.name && item.value) : [];
  return { verified: project.verified === true, misconfigured: config.misconfigured === true, dnsRecords: verification.length ? verification : fallbackDnsRecords(domain), project, config };
}
