import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";

const env = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const authClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const email = process.env.E2E_TEST_EMAIL || env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD || env.E2E_TEST_PASSWORD;
if (!email || !password) throw new Error("E2E_TEST_EMAIL and E2E_TEST_PASSWORD are required.");
let userId;
let siteId;
let originalSite;
let socket;

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

try {
  const signedIn = await authClient.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.session) throw signedIn.error || new Error("Test sign-in failed.");
  userId = signedIn.data.user.id;
  const siteResult = await supabase.from("sites").select("id, business_name, primary_color, accent_color, theme_config").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).single();
  if (siteResult.error) throw siteResult.error;
  originalSite = structuredClone(siteResult.data);
  siteId = originalSite.id;
  const projectRef = new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0];
  const authStorageKey = `sb-${projectRef}-auth-token`;

  const target = await fetch("http://127.0.0.1:9224/json/new?http://127.0.0.1:4173/", { method: "PUT" }).then((response) => response.json());
  socket = new WebSocket(target.webSocketDebuggerUrl);
  let commandId = 0;
  const pending = new Map();
  const browserErrors = [];
  const patchRequests = [];
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown") browserErrors.push(message.params?.exceptionDetails?.exception?.description || message.params?.exceptionDetails?.text);
    if (message.method === "Runtime.consoleAPICalled" && message.params?.type === "error") browserErrors.push(message.params.args?.map((argument) => argument.description || argument.value).join(" "));
    if (message.method === "Network.requestWillBeSent" && message.params?.request?.method === "PATCH") patchRequests.push({ url: message.params.request.url, body: message.params.request.postData });
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
  const waitFor = async (expression, timeout = 12_000) => {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      if (await evaluate(expression)) return;
      await wait(250);
    }
    const state = await evaluate(`JSON.stringify({ href: location.href, body: document.body.textContent.slice(0, 1200) })`);
    throw new Error(`Browser condition timed out: ${expression}\n${state}\n${JSON.stringify(browserErrors)}`);
  };

  await command("Page.enable");
  await command("Runtime.enable");
  await command("Network.enable");
  await wait(1500);
  await evaluate(`localStorage.clear(); localStorage.setItem(${JSON.stringify(authStorageKey)}, ${JSON.stringify(JSON.stringify(signedIn.data.session))}); location.href = '/dashboard'`);
  await waitFor(`location.pathname === '/dashboard'`);
  await waitFor(`location.pathname === '/dashboard' && document.body.textContent.includes(${JSON.stringify(originalSite.business_name)})`, 30_000);
  await waitFor(`document.body.textContent.includes('Toplam portföy')`, 30_000);
  await evaluate(`([...document.querySelectorAll('button')].filter((button) => button.textContent.trim() === 'Site ayarları').at(-1))?.click()`);
  await waitFor(`Boolean(document.querySelector('#heading-family') && document.querySelector('#body-family'))`);

  const initial = JSON.parse(await evaluate(`JSON.stringify({
    url: location.pathname,
    headingButton: document.querySelector('#heading-family')?.textContent,
    bodyButton: document.querySelector('#body-family')?.textContent,
    headingWeight: Boolean(document.querySelector('#heading-weight')),
    bodyWeight: Boolean(document.querySelector('#body-weight')),
    technicalCopyVisible: document.body.textContent.includes('theme_config') || document.body.textContent.includes('PATCH edilir') || document.body.textContent.includes('otomatik kaydedilir'),
    saveDisabled: [...document.querySelectorAll('button')].find((button) => button.textContent.includes('Tema ayarlarını kaydet'))?.disabled,
  })`));
  assert.equal(initial.url, "/dashboard");
  assert.ok(initial.headingButton && initial.bodyButton && initial.headingWeight && initial.bodyWeight);
  assert.equal(initial.technicalCopyVisible, false);
  assert.equal(initial.saveDisabled, true);

  await evaluate(`document.querySelector('#heading-family').click()`);
  await wait(300);
  const openState = JSON.parse(await evaluate(`JSON.stringify({
    expanded: document.querySelector('#heading-family')?.getAttribute('aria-expanded'),
    listbox: Boolean(document.querySelector('[role="listbox"]')),
    renderedOptions: document.querySelectorAll('[role="option"]').length,
    styledSample: [...document.querySelectorAll('[role="option"] span')].some((node) => node.textContent.includes('İstanbul’da doğru evi bulun') && getComputedStyle(node).fontFamily.length > 0),
  })`));
  assert.equal(openState.expanded, "true");
  assert.equal(openState.listbox, true);
  assert.ok(openState.renderedOptions > 0 && openState.renderedOptions <= 10);
  assert.equal(openState.styledSample, true);

  await evaluate(`document.querySelector('input[placeholder="Font ara..."]').focus()`);
  await command("Input.insertText", { text: "Playfair Display" });
  await wait(800);
  const headingSearchOptions = await evaluate(`[...document.querySelectorAll('[role="option"]')].map((option) => option.textContent).join('|')`);
  assert.match(headingSearchOptions, /Playfair Display/);
  await evaluate(`([...document.querySelectorAll('[role="option"]')].find((option) => option.textContent.includes('Playfair Display')))?.click()`);
  await wait(300);
  await evaluate(`document.querySelector('#heading-weight').click()`);
  await wait(300);
  const headingWeightOptions = await evaluate(`[...document.querySelectorAll('[role="option"]')].map((option) => option.textContent).join('|')`);
  assert.match(headingWeightOptions, /Normal \(400\).*Örnek yazı/);
  assert.match(headingWeightOptions, /Kalın \(700\).*Örnek yazı/);
  await evaluate(`([...document.querySelectorAll('[role="option"]')].find((option) => option.textContent.includes('Kalın (700)')))?.click()`);

  await evaluate(`document.querySelector('#body-family').click()`);
  await wait(200);
  await evaluate(`document.querySelector('input[placeholder="Font ara..."]').focus()`);
  await command("Input.insertText", { text: "Roboto Slab" });
  await wait(500);
  await evaluate(`([...document.querySelectorAll('[role="option"]')].find((option) => option.textContent.includes('Roboto Slab')))?.click()`);
  await wait(300);

  const beforeSave = await supabase.from("sites").select("theme_config").eq("id", siteId).single();
  if (beforeSave.error) throw beforeSave.error;
  assert.notEqual(beforeSave.data.theme_config.fonts.heading, "Playfair Display");
  const unsaved = JSON.parse(await evaluate(`JSON.stringify({
    notice: document.body.textContent.includes('Kaydedilmemiş değişiklikler var.'),
    saveDisabled: [...document.querySelectorAll('button')].find((button) => button.textContent.includes('Tema ayarlarını kaydet'))?.disabled,
    heading: document.querySelector('#heading-family')?.textContent,
    body: document.querySelector('#body-family')?.textContent,
  })`));
  if (!unsaved.notice || unsaved.saveDisabled) throw new Error(`Unexpected draft state: ${JSON.stringify(unsaved)}`);
  assert.match(unsaved.heading, /Playfair Display/);
  assert.match(unsaved.body, /Roboto Slab/);

  await evaluate(`([...document.querySelectorAll('button')].find((button) => button.textContent.includes('Tema ayarlarını kaydet')))?.click()`);
  let afterSave;
  const saveStarted = Date.now();
  while (Date.now() - saveStarted < 8_000) {
    afterSave = await supabase.from("sites").select("theme_config").eq("id", siteId).single();
    if (afterSave.error) throw afterSave.error;
    if (afterSave.data.theme_config.fonts.heading === "Playfair Display") break;
    await wait(300);
  }
  if (afterSave.data.theme_config.fonts.heading !== "Playfair Display") throw new Error(JSON.stringify({ afterSave: afterSave.data.theme_config.fonts, patchRequests, browserErrors }));
  assert.equal(afterSave.data.theme_config.fonts.headingWeight, 700);
  assert.equal(afterSave.data.theme_config.fonts.body, "Roboto Slab");

  console.info(JSON.stringify({
    font_family_dropdowns: true,
    font_samples_rendered_in_dropdown: true,
    heading_and_body_weight_dropdowns: true,
    available_weight_samples_rendered: true,
    no_patch_before_explicit_save: true,
    explicit_save_persisted: { heading: "Playfair Display", headingWeight: 700, body: "Roboto Slab" },
    technical_copy_removed: true,
  }, null, 2));
} finally {
  socket?.close();
  if (siteId && originalSite) await supabase.from("sites").update({ theme_config: originalSite.theme_config, primary_color: originalSite.primary_color, accent_color: originalSite.accent_color }).eq("id", siteId);
}
