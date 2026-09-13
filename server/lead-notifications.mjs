const channelConfig = {
  email: { enabled: "email_enabled", destination: "email_to" },
  whatsapp: { enabled: "whatsapp_enabled", destination: "whatsapp_to" },
  browser: { enabled: "browser_enabled" },
};

const errorMessage = (error) => error instanceof Error ? error.message : String(error);

export async function sendLeadNotification(channel, context, env = process.env, fetcher = fetch) {
  const text = `Yeni lead: ${context.lead.name} (${context.lead.phone})${context.listing?.title ? `\nİlan: ${context.listing.title}` : ""}${context.lead.message ? `\n${context.lead.message}` : ""}`;
  if (channel === "browser") return { status: "ready" };
  if (channel === "email") {
    if (!env.RESEND_API_KEY || !context.destination) throw new Error("E-posta kanalı yapılandırılmadı");
    const response = await fetcher("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: env.LEAD_EMAIL_FROM || "Fastate AI <onboarding@resend.dev>", to: [context.destination], subject: `Yeni lead · ${context.site.business_name}`, text }) });
    if (!response.ok) throw new Error(`Resend ${response.status}`);
    return { status: "delivered" };
  }
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID || !context.destination) throw new Error("WhatsApp kanalı yapılandırılmadı");
  const response = await fetcher(`https://graph.facebook.com/v22.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, { method: "POST", headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", to: context.destination.replace(/\D/g, ""), type: "text", text: { body: text } }) });
  if (!response.ok) throw new Error(`WhatsApp ${response.status}`);
  return { status: "delivered" };
}

export async function dispatchLeadNotifications(supabase, context, dependencies = {}) {
  const { data: preference } = await supabase.from("lead_notification_preferences").select("*").eq("user_id", context.site.user_id).maybeSingle();
  const preferences = preference || { email_enabled: true, whatsapp_enabled: false, browser_enabled: true };
  const results = [];
  for (const [channel, config] of Object.entries(channelConfig)) {
    if (!preferences[config.enabled]) continue;
    const idempotencyKey = `${context.lead.id}:${channel}`;
    const { data: inserted, error } = await supabase.from("lead_notification_deliveries").upsert({ lead_id: context.lead.id, listing_id: context.lead.listing_id || null, user_id: context.site.user_id, channel, idempotency_key: idempotencyKey }, { onConflict: "idempotency_key", ignoreDuplicates: true }).select("*").maybeSingle();
    if (error) throw new Error(`Bildirim teslimatı oluşturulamadı: ${error.message}`);
    let delivery = inserted;
    if (!delivery) {
      const existing = await supabase.from("lead_notification_deliveries").select("*").eq("idempotency_key", idempotencyKey).single();
      delivery = existing.data;
    }
    if (!delivery || ["delivered", "ready"].includes(delivery.status)) { results.push(delivery); continue; }
    try {
      const sent = await (dependencies.send || sendLeadNotification)(channel, { ...context, destination: config.destination ? preferences[config.destination] : null }, dependencies.env, dependencies.fetcher);
      const now = new Date().toISOString();
      const { data } = await supabase.from("lead_notification_deliveries").update({ status: sent.status, attempts: delivery.attempts + 1, last_error: null, delivered_at: sent.status === "delivered" ? now : null, next_retry_at: null, updated_at: now }).eq("id", delivery.id).select("*").single();
      results.push(data);
    } catch (error) {
      const now = new Date();
      const { data } = await supabase.from("lead_notification_deliveries").update({ status: "failed", attempts: delivery.attempts + 1, last_error: errorMessage(error).slice(0, 500), next_retry_at: new Date(now.getTime() + 5 * 60_000).toISOString(), updated_at: now.toISOString() }).eq("id", delivery.id).select("*").single();
      results.push(data);
    }
  }
  return results;
}
