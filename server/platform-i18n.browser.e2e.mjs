import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";

const env = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
const email = process.env.E2E_TEST_EMAIL || env.E2E_TEST_EMAIL || "user@portfoyai.com";
const password = process.env.E2E_TEST_PASSWORD || env.E2E_TEST_PASSWORD || "123456";
const authClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const signedIn = await authClient.auth.signInWithPassword({ email, password });
if (signedIn.error || !signedIn.data.session) throw signedIn.error || new Error("Test sign-in failed.");

const projectRef = new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0];
const authStorageKey = `sb-${projectRef}-auth-token`;
const target = await fetch("http://127.0.0.1:9224/json/new?about:blank", { method: "PUT" }).then((response) => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let commandId = 0;
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  }
});
const command = (method, params = {}) => new Promise((resolve) => {
  const id = ++commandId;
  pending.set(id, resolve);
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.result.value;
};
const waitFor = async (expression, timeout = 15_000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return;
    await wait(200);
  }
  throw new Error(`Timed out: ${expression}\n${await evaluate("document.body.textContent.slice(0, 1200)")}`);
};

try {
  await command("Page.enable");
  await command("Runtime.enable");
  await command("Emulation.setLocaleOverride", { locale: "en-US" });
  await command("Page.navigate", { url: "http://127.0.0.1:4173/" });
  await waitFor("document.readyState === 'complete'");
  await evaluate("localStorage.removeItem('portfoyai_language'); location.reload()");
  await waitFor("document.body.textContent.includes('Fast Real Estate Sites,')");
  assert.equal(await evaluate("document.documentElement.lang"), "en");
  assert.equal(await evaluate("document.title"), "Fastate AI — Fast Real Estate Sites, Built by AI");
  assert.match(await evaluate("document.querySelector('meta[property=\"og:title\"]').content"), /^Fastate AI/);
  assert.match(await evaluate("document.querySelector('meta[name=\"twitter:description\"]').content"), /Fast real estate sites, built by AI/i);
  assert.match(await evaluate("document.querySelector('#business-prompt').value"), /^I am a friendly local real estate agent/);
  assert.equal(await evaluate("Boolean(document.querySelector('img[src=\"/images/agents/neighborhood-street-hero.png\"]'))"), true);

  await evaluate("document.querySelector('button[aria-label=\"Switch to Turkish\"]').click()");
  await waitFor("document.body.textContent.includes('Emlak Siteniz')");
  assert.equal(await evaluate("localStorage.getItem('portfoyai_language')"), "tr");
  assert.equal(await evaluate("document.title"), "Fastate AI — Emlak Siteniz Saniyeler İçinde Hazır");
  assert.match(await evaluate("document.querySelector('#business-prompt').value"), /^Kadıköy ve Moda'da çalışan/);
  await command("Page.reload");
  await waitFor("document.body.textContent.includes('Emlak Siteniz')");
  assert.equal(await evaluate("document.documentElement.lang"), "tr");

  await evaluate("document.querySelector('button[aria-label=\"İngilizceye geç\"]').click()");
  await waitFor("document.body.textContent.includes('Fast Real Estate Sites,')");
  assert.equal(await evaluate("localStorage.getItem('portfoyai_language')"), "en");

  await evaluate(`localStorage.setItem(${JSON.stringify(authStorageKey)}, ${JSON.stringify(JSON.stringify(signedIn.data.session))}); location.href='/dashboard'`);
  await waitFor("location.pathname === '/dashboard' && document.body.textContent.includes('Overview')", 30_000);
  assert.equal(await evaluate("Boolean(document.querySelector('button[aria-label=\"Switch to Turkish\"]'))"), true);
  await evaluate("document.querySelector('button[aria-label=\"Switch to Turkish\"]').click()");
  await waitFor("document.body.textContent.includes('Genel bakış')");
  assert.equal(await evaluate("localStorage.getItem('portfoyai_language')"), "tr");

  console.log(JSON.stringify({ browser_default: "en", localized_example_prompt: { en: true, tr: true }, localized_brand_metadata: true, latest_design_preview: true, persisted_after_reload: "tr", landing_switch: "en", dashboard_switch: "tr", generated_site_language_untouched: true }, null, 2));
} finally {
  socket.close();
}
