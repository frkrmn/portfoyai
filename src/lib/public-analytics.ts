const SESSION_KEY = "fastate_analytics_session";

function sessionId() {
  let value = sessionStorage.getItem(SESSION_KEY);
  if (!value) { value = crypto.randomUUID(); sessionStorage.setItem(SESSION_KEY, value); }
  return value;
}

export function trackPublicAnalytics(input: { siteId: string; eventType: "site_view" | "listing_view" | "lead_conversion"; listingId?: string; leadId?: string }) {
  if (navigator.doNotTrack === "1") return;
  const params = new URLSearchParams(location.search);
  let referrerHost = "";
  try { referrerHost = document.referrer ? new URL(document.referrer).hostname : ""; } catch { /* invalid referrer is ignored */ }
  void fetch("/api/analytics", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json", "X-Do-Not-Track": navigator.doNotTrack || "0" }, body: JSON.stringify({ site_id: input.siteId, listing_id: input.listingId, lead_id: input.leadId, event_type: input.eventType, session_id: sessionId(), referrer_host: referrerHost, utm_source: params.get("utm_source"), utm_medium: params.get("utm_medium"), utm_campaign: params.get("utm_campaign") }) }).catch(() => undefined);
}
