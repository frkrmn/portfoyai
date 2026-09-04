import assert from "node:assert/strict";

const baseUrl = process.env.SITE_I18N_E2E_URL || "http://127.0.0.1:4173";
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let legacyBackfillCalls = 0;
let legacyBackfilled = false;
const legacyContent = { headline: "Doğru ev, doğru sorularla bulunur", bio: "Sizi dinleyen kişisel danışmanlık.", feelings: ["Sakin", "Enerjik"], timings: ["Hemen", "Henüz araştırıyorum"] };
const translatedContent = { headline: { tr: legacyContent.headline, en: "The right questions lead to the right home" }, bio: { tr: legacyContent.bio, en: "Personal guidance that starts by listening." }, feelings: [{ tr: "Sakin", en: "Calm" }, { tr: "Enerjik", en: "Vibrant" }], timings: [{ tr: "Hemen", en: "Right away" }, { tr: "Henüz araştırıyorum", en: "Just exploring" }] };
const listing = (id, overrides = {}) => ({
  id, site_id: "site-i18n", title: `Test listing ${id}`, description: "Listing body supplied by the agent.", district: "Bodrum", room_count: "3+1", price: 8_500_000, m2: 145,
  features: ["Feature one", "Feature two"], media: [], status: "active", listing_status: "active", listing_type: "sale", property_category: "konut", property_subtype: "daire", created_at: new Date().toISOString(),
  rental_yield_percent: 6.2, roi_notes: "Strong long-term potential", ...overrides,
});
const payload = (slug) => {
  const templateId = slug.replace("i18n-", "");
  return {
    id: `site-${templateId}`, slug, language: templateId === "land-plots" ? "en" : "tr", status: "published",
    config: { template_id: templateId, business_name: "Bilingual Realty", tone: "Agent-authored content stays intact.", primary_color: "#173f32", accent_color: "#d7a84b", headline: "Agent-authored headline", theme_config: { template_id: templateId, content: templateId === "guided-match" ? (legacyBackfilled ? translatedContent : legacyContent) : {} } },
    listings: [listing(`${templateId}-1`, templateId === "land-plots" ? { property_category: "arsa", property_subtype: "konut-imarli" } : {})],
    show_team_section: templateId === "land-plots", team_members: templateId === "land-plots" ? [{ id: "member-1", site_id: `site-${templateId}`, name: "Deniz Kaya", role: "Land Advisor", bio: "Agent-authored biography.", photo_url: "", sort_order: 0, created_at: new Date().toISOString() }] : [],
  };
};

const target = await fetch("http://127.0.0.1:9224/json/new?about:blank", { method: "PUT" }).then((response) => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let commandId = 0;
const errors = [];
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
const command = (method, params = {}) => new Promise((resolve) => { const id = ++commandId; pending.set(id, resolve); socket.send(JSON.stringify({ id, method, params })); });
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); return; }
  if (message.method === "Runtime.exceptionThrown") errors.push(message.params?.exceptionDetails?.exception?.description || message.params?.exceptionDetails?.text);
  if (message.method === "Fetch.requestPaused") {
    const url = new URL(message.params.request.url);
    if (url.pathname.endsWith("/content-backfill")) {
      legacyBackfillCalls += 1;
      legacyBackfilled = true;
      const theme_config = { template_id: "guided-match", content: translatedContent, site_content_i18n: { version: 1, status: "complete" } };
      const body = Buffer.from(JSON.stringify({ backfilled: true, cached: false, theme_config })).toString("base64");
      void command("Fetch.fulfillRequest", { requestId: message.params.requestId, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: "application/json" }], body });
      return;
    }
    const slug = decodeURIComponent(url.pathname.split("/").at(-1));
    const body = Buffer.from(JSON.stringify(payload(slug))).toString("base64");
    void command("Fetch.fulfillRequest", { requestId: message.params.requestId, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: "application/json" }], body });
  }
});
const evaluate = async (expression) => {
  const result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.result.value;
};
const waitFor = async (expression, timeout = 12_000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) { if (await evaluate(expression)) return; await wait(150); }
  throw new Error(`Timed out: ${expression}\n${await evaluate("document.body.innerText.slice(0, 1600)")}\n${errors.join("\n")}`);
};
const visit = async (path) => {
  await evaluate(`location.href=${JSON.stringify(`${baseUrl}${path}`)}`);
  await waitFor("Boolean(document.querySelector('[data-site-language-toggle]'))");
};
const body = () => evaluate("document.body.innerText");
const toggle = (locale) => evaluate(`document.querySelector('[data-site-language-toggle] button:nth-child(${locale === "tr" ? 1 : 2})').click()`);

try {
  await command("Page.enable"); await command("Runtime.enable");
  await command("Fetch.enable", { patterns: [{ urlPattern: "*/api/public-sites/*", requestStage: "Request" }] });

  await visit("/site/i18n-land-plots");
  assert.match(await body(), /Services/); assert.match(await body(), /Our Advisor/); assert.equal(await evaluate("document.documentElement.lang"), "en");
  await toggle("tr"); await waitFor("document.body.innerText.includes('Hizmetlerimiz') && document.body.innerText.includes('Danışmanımız')");
  assert.equal(await evaluate("sessionStorage.getItem('fastate_site_locale:i18n-land-plots')"), "tr");

  await visit("/site/i18n-investment-focused/listings");
  assert.match(await body(), /Karşılaştırma Görünümü/); assert.match(await body(), /Satılık/);
  await toggle("en"); await waitFor("document.body.innerText.includes('Comparison View') && document.body.innerText.includes('For Sale')");
  await evaluate("[...document.querySelectorAll('button')].find((button) => button.textContent.includes('Comparison View')).click()");
  await waitFor("Boolean(document.querySelector('[data-view=\"comparison\"]'))");
  assert.match(await body(), /Rental Yield/i);

  await visit("/site/i18n-guided-match");
  assert.match(await body(), /Ne Arıyorsunuz/); assert.equal(await evaluate("Boolean(document.querySelector('input[placeholder=\"En Düşük Bütçe\"]'))"), true);
  await toggle("en"); await waitFor("document.body.innerText.includes('What Are You Looking For?') && Boolean(document.querySelector('input[placeholder=\"Minimum Budget\"]')) && document.body.innerText.includes('Find My Matches')");
  await waitFor("document.body.innerText.includes('The right questions lead to the right home')");
  assert.equal(legacyBackfillCalls, 1);
  await evaluate("location.reload()"); await waitFor("document.body.innerText.includes('What Are You Looking For?')");
  assert.equal(await evaluate("document.documentElement.lang"), "en");
  await wait(500);
  assert.equal(legacyBackfillCalls, 1);

  assert.deepEqual(errors, []);
  console.info(JSON.stringify({ templates_tested: ["land-plots", "investment-focused", "guided-match"], default_language: true, immediate_toggle: true, header_nav_buttons_badges_filters_forms: true, legacy_content_backfill_calls: legacyBackfillCalls, backfill_cached_after_reload: legacyBackfillCalls === 1, session_override_after_reload: true }, null, 2));
} finally {
  socket.close();
}
