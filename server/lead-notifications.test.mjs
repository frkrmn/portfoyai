import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { sendLeadNotification } from "./lead-notifications.mjs";

const context = { site: { business_name: "Ada Emlak" }, lead: { name: "Müşteri", phone: "+905551112233", message: "Bilgi", id: "lead-1" }, listing: { title: "Deniz Manzaralı Ev" }, destination: "agent@example.com" };
let request;
const okFetch = async (url, options) => { request = { url, options }; return { ok: true, status: 200 }; };
assert.deepEqual(await sendLeadNotification("browser", context), { status: "ready" });
assert.deepEqual(await sendLeadNotification("email", context, { RESEND_API_KEY: "secret", LEAD_EMAIL_FROM: "Fastate <lead@example.com>" }, okFetch), { status: "delivered" });
assert.equal(request.url, "https://api.resend.com/emails");
assert.match(request.options.body, /Deniz Manzaralı Ev/);
assert.deepEqual(await sendLeadNotification("whatsapp", { ...context, destination: "+90 555 111 22 33" }, { WHATSAPP_ACCESS_TOKEN: "secret", WHATSAPP_PHONE_NUMBER_ID: "phone-id" }, okFetch), { status: "delivered" });
assert.match(request.url, /graph\.facebook\.com/);
assert.equal(JSON.parse(request.options.body).to, "905551112233");
await assert.rejects(() => sendLeadNotification("email", context, {}, okFetch), /yapılandırılmadı/);

const migration = await readFile(new URL("../supabase/migrations/20260913000100_lead_notifications.sql", import.meta.url), "utf8");
assert.match(migration, /idempotency_key text not null unique/i);
assert.match(migration, /lead_id uuid not null references public\.leads/i);
assert.match(migration, /listing_id uuid references public\.listings/i);
const dispatcher = await readFile(new URL("./lead-notifications.mjs", import.meta.url), "utf8");
assert.match(dispatcher, /ignoreDuplicates: true/);
assert.match(dispatcher, /eq\("idempotency_key", idempotencyKey\)/);
assert.match(dispatcher, /attempts: delivery\.attempts \+ 1/);
assert.match(dispatcher, /next_retry_at/);
const dashboard = await readFile(new URL("../src/portfoyai/dashboard/LeadNotificationSettings.tsx", import.meta.url), "utf8");
assert.match(dashboard, /Notification\.requestPermission/);
assert.match(dashboard, /delivery_id: id/);

console.info("Lead notifications verified: email, WhatsApp, browser, preferences, idempotency, delivery state and retry contracts.");
