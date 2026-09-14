import { domainToASCII } from "node:url";

export const normalizeCustomDomain = (value) => {
  const raw = String(value || "").trim().replace(/\.$/, "").toLowerCase().normalize("NFD").replace(/\u0307/g, "").normalize("NFC");
  if (!raw || raw.includes("://") || raw.includes("/") || raw.startsWith("*.") || raw === "localhost") throw new Error("VALIDATION:Enter a domain name without protocol or path.");
  const hostname = domainToASCII(raw).toLowerCase();
  if (!hostname || hostname.length > 253 || !hostname.includes(".") || hostname.split(".").some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) throw new Error("VALIDATION:Enter a valid domain name.");
  return hostname;
};

export const fallbackDnsRecords = (domain) => {
  const labels = domain.split(".");
  const isSubdomain = labels.length > 2 && labels[0] !== "www";
  return isSubdomain
    ? [{ type: "CNAME", name: labels[0], value: "cname.vercel-dns.com" }]
    : [{ type: "A", name: "@", value: "76.76.21.21" }];
};

export const domainState = ({ verified, misconfigured, error }) => error ? "error" : verified && !misconfigured ? "verified" : "pending";
export const sslState = ({ verified, misconfigured, error }) => error ? "error" : verified && !misconfigured ? "active" : "pending";

export const publicDomainRecord = (record) => record ? {
  domain: record.domain,
  status: record.status,
  ssl_status: record.ssl_status,
  dns_records: Array.isArray(record.dns_records) ? record.dns_records : [],
  error_code: record.error_code || null,
  error_message: record.error_message || null,
  last_checked_at: record.last_checked_at || null,
} : null;
