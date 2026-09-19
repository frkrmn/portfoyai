export const isLoopbackHostname = (value) => {
  const hostname = String(value || "").trim().toLowerCase().replace(/^\[|\]$/g, "");
  return hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "::1" || /^127(?:\.\d{1,3}){3}$/.test(hostname);
};
