const tokens = new Map<string, { token: string; expiresAt: number }>();

async function visitorToken(siteId: string) {
  const cached = tokens.get(siteId);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
  const response = await fetch(`/api/analytics/session?site_id=${encodeURIComponent(siteId)}`, { headers: { "X-Do-Not-Track": navigator.doNotTrack || "0" } });
  if (!response.ok) throw new Error("Analytics session could not be created");
  const payload = await response.json() as { token: string; expires_in: number };
  tokens.set(siteId, { token: payload.token, expiresAt: Date.now() + payload.expires_in * 1000 });
  return payload.token;
}

export function trackPublicAnalytics(input: { siteId: string; eventType: "site_view" | "listing_view"; listingId?: string }) {
  if (navigator.doNotTrack === "1") return;
  const params = new URLSearchParams(location.search);
  let referrerHost = "";
  try { referrerHost = document.referrer ? new URL(document.referrer).hostname : ""; } catch { /* invalid referrer is ignored */ }
  const send = async (retry = true): Promise<void> => {
    const token = await visitorToken(input.siteId);
    const response = await fetch("/api/analytics", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json", "X-Do-Not-Track": navigator.doNotTrack || "0" }, body: JSON.stringify({ site_id: input.siteId, listing_id: input.listingId, event_type: input.eventType, visitor_token: token, referrer_host: referrerHost, utm_source: params.get("utm_source"), utm_medium: params.get("utm_medium"), utm_campaign: params.get("utm_campaign") }) });
    if (response.status === 401 && retry) { tokens.delete(input.siteId); await send(false); }
  };
  void send().catch(() => undefined);
}
