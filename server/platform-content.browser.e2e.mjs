import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";
import tr from "../locales/tr/common.json" with { type: "json" };
import en from "../locales/en/common.json" with { type: "json" };

const env = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
const baseUrl = process.env.PLATFORM_CONTENT_E2E_URL || "http://127.0.0.1:4175";
const auth = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
let adminSession;
if (process.env.ADMIN_E2E_MAGIC_EMAIL) {
  const link = await service.auth.admin.generateLink({ type: "magiclink", email: process.env.ADMIN_E2E_MAGIC_EMAIL });
  if (link.error) throw link.error;
  adminSession = await auth.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: "magiclink" });
} else {
  adminSession = await auth.auth.signInWithPassword({ email: "user@portfoyai.com", password: "123456" });
}
if (adminSession.error) throw adminSession.error;
const nonAdminSession = await auth.auth.signInWithPassword({ email: "cms-nonadmin@portfoyai.test", password: "CmsNonAdmin123!" });
if (nonAdminSession.error) throw nonAdminSession.error;
const headers = (token) => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" });
const adminToken = adminSession.data.session.access_token;
const nonAdminToken = nonAdminSession.data.session.access_token;
const originals = {};
for (const locale of ["tr", "en"]) originals[locale] = await fetch(`${baseUrl}/api/platform-content?locale=${locale}`).then((response) => response.json());
const markers = { tr: `TR CMS ${Date.now()}`, en: `EN CMS ${Date.now()}` };
const documents = {
  tr: { ...structuredClone(tr.landing), hero: { ...tr.landing.hero, headline: markers.tr }, heroImageUrl: "/images/agents/neighborhood-street-hero.png" },
  en: { ...structuredClone(en.landing), hero: { ...en.landing.hero, headline: markers.en }, heroImageUrl: "/images/agents/neighborhood-street-hero.png" },
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const target = await fetch(`http://127.0.0.1:9224/json/new?${baseUrl}/`, { method: "PUT" }).then((response) => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl); let id = 0; const pending = new Map();
socket.addEventListener("message", (event) => { const message = JSON.parse(event.data); if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } });
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
const command = (method, params = {}) => new Promise((resolve) => { const commandId = ++id; pending.set(commandId, resolve); socket.send(JSON.stringify({ id: commandId, method, params })); });
const evaluate = async (expression) => { const result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (result.result.exceptionDetails) throw new Error(result.result.exceptionDetails.text); return result.result.result.value; };
const waitFor = async (expression, timeout = 30_000) => { const started = Date.now(); while (Date.now() - started < timeout) { if (await evaluate(expression)) return; await wait(200); } throw new Error(`Timed out: ${expression}`); };

try {
  for (const locale of ["tr", "en"]) {
    const response = await fetch(`${baseUrl}/api/admin/platform-content?locale=${locale}`, { method: "PATCH", headers: headers(adminToken), body: JSON.stringify({ content: documents[locale] }) });
    assert.equal(response.status, 200, await response.text());
  }
  const forbiddenGet = await fetch(`${baseUrl}/api/admin/platform-content?locale=tr`, { headers: headers(nonAdminToken) });
  const forbiddenPatch = await fetch(`${baseUrl}/api/admin/platform-content?locale=en`, { method: "PATCH", headers: headers(nonAdminToken), body: JSON.stringify({ content: documents.en }) });
  assert.equal(forbiddenGet.status, 403); assert.equal(forbiddenPatch.status, 403);

  await command("Page.enable"); await command("Runtime.enable");
  for (const locale of ["tr", "en"]) {
    await command("Page.navigate", { url: `${baseUrl}/` }); await waitFor("document.body && document.body.textContent.length > 100");
    await evaluate(`localStorage.setItem('portfoyai_language',${JSON.stringify(locale)}); location.reload()`);
    await waitFor(`document.querySelector('h1')?.textContent.includes(${JSON.stringify(markers[locale])})`);
  }

  await command("Network.clearBrowserCookies");
  await evaluate("localStorage.clear(); sessionStorage.clear(); true");
  await command("Page.navigate", { url: `${baseUrl}/login` }); await waitFor("Boolean(document.querySelector('#login-email'))");
  await evaluate(`(()=>{const set=(n,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,v);n.dispatchEvent(new Event('input',{bubbles:true}))};set(document.querySelector('#login-email'),'cms-nonadmin@portfoyai.test');set(document.querySelector('#login-password'),'CmsNonAdmin123!');document.querySelector('form button').click()})()`);
  await waitFor("location.pathname === '/dashboard'");
  await waitFor("document.body.textContent.includes('Overview') || document.body.textContent.includes('Genel Bakış')");
  assert.equal(await evaluate("document.body.textContent.includes('Platform Landing CMS')"), false);
  await command("Page.navigate", { url: `${baseUrl}/admin/landing-content` });
  await waitFor("location.pathname === '/dashboard'");
  console.info(JSON.stringify({ tr_hero_rendered: true, en_hero_rendered: true, non_admin_api_get_403: true, non_admin_api_patch_403: true, non_admin_nav_hidden: true, non_admin_direct_route_blocked: true }, null, 2));
} finally {
  socket.close();
  for (const locale of ["tr", "en"]) {
    if (originals[locale]?.content) await service.storage.from("platform-content").upload(`${locale}.json`, JSON.stringify({ locale, content: originals[locale].content, updated_at: originals[locale].updated_at }), { contentType: "application/json", upsert: true });
    else await service.storage.from("platform-content").remove([`${locale}.json`]);
  }
}
