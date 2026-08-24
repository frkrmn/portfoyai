import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";

const env = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
const email = process.env.E2E_TEST_EMAIL || "user@portfoyai.com";
const password = process.env.E2E_TEST_PASSWORD || "123456";
const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const auth = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const signedIn = await auth.auth.signInWithPassword({ email, password });
if (signedIn.error || !signedIn.data.user) throw signedIn.error || new Error("Test sign-in failed.");
const userId = signedIn.data.user.id;
const before = await admin.from("sites").select("id", { count: "exact" }).eq("user_id", userId);
if (before.error) throw before.error;

const prompt = "Kadıköy ve Moda'da kişisel emlak danışmanlığı yapan sıcak bir uzmanım";
const target = await fetch("http://127.0.0.1:9224/json/new?http://127.0.0.1:4173/", { method: "PUT" }).then((response) => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let commandId = 0;
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  }
});
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
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
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitFor = async (expression, timeout = 20_000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return;
    await wait(250);
  }
  throw new Error(`Timed out: ${expression}\n${await evaluate("document.body.textContent.slice(0, 1000)")}`);
};

try {
  await command("Page.enable");
  await command("Runtime.enable");
  await wait(1000);
  await evaluate("localStorage.clear(); sessionStorage.clear(); location.href='/'");
  await waitFor("Boolean(document.querySelector('#business-prompt'))");
  await evaluate(`(() => { const input=document.querySelector('#business-prompt'); const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set; setter.call(input,${JSON.stringify(prompt)}); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await evaluate("document.querySelector('#business-prompt').parentElement.querySelector('button').click()");
  await waitFor("location.pathname === '/signup'");
  assert.equal(await evaluate("localStorage.getItem('portfoyai_pending_prompt')"), prompt);
  assert.equal(await evaluate("document.body.textContent.includes('kaldığınız yerden otomatik devam edeceğiz')"), true);

  await evaluate("[...document.querySelectorAll('a')].find((link)=>link.textContent.includes('Giriş yap'))?.click()");
  await waitFor("location.pathname === '/login'");
  await evaluate(`(() => { const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; const emailInput=document.querySelector('#login-email'); const passwordInput=document.querySelector('#login-password'); setter.call(emailInput,${JSON.stringify(email)}); emailInput.dispatchEvent(new Event('input',{bubbles:true})); setter.call(passwordInput,${JSON.stringify(password)}); passwordInput.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await evaluate("document.querySelector('form').requestSubmit()");
  await waitFor("location.pathname === '/dashboard'", 30_000);
  assert.equal(await evaluate("localStorage.getItem('portfoyai_pending_prompt')"), prompt, "A blocked second generation must not clear the pending prompt");
  const after = await admin.from("sites").select("id", { count: "exact" }).eq("user_id", userId);
  if (after.error) throw after.error;
  assert.equal(after.count, before.count);
  console.info(JSON.stringify({
    logged_out_click_redirected_to_signup: true,
    prompt_survived_auth_redirect: true,
    successful_login_auto_resumed_generation: true,
    existing_site_redirected_to_dashboard: true,
    duplicate_site_created: false,
  }, null, 2));
} finally {
  socket.close();
}
