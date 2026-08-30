import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";

const env = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
const service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const auth = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const email = process.env.E2E_TEST_EMAIL || env.E2E_TEST_EMAIL || "user@portfoyai.com";
const password = process.env.E2E_TEST_PASSWORD || env.E2E_TEST_PASSWORD || "123456";

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const signedIn = await auth.auth.signInWithPassword({ email, password });
if (signedIn.error || !signedIn.data.session) throw signedIn.error || new Error("Test sign-in failed.");
const siteResult = await service.from("sites").select("id, theme_config").eq("user_id", signedIn.data.user.id).order("created_at", { ascending: false }).limit(1).single();
if (siteResult.error) throw siteResult.error;
const originalTheme = structuredClone(siteResult.data.theme_config);
const projectRef = new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0];
const authStorageKey = `sb-${projectRef}-auth-token`;
const target = await fetch("http://127.0.0.1:9224/json/new?http://127.0.0.1:4173/", { method: "PUT" }).then((response) => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
let commandId = 0;
const pending = new Map();

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
  if (result.result.exceptionDetails) throw new Error(result.result.exceptionDetails.exception?.description || result.result.exceptionDetails.text);
  return result.result.result.value;
};
const waitFor = async (expression, timeout = 30_000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return;
    await wait(250);
  }
  const state = await evaluate(`JSON.stringify({ href: location.href, body: document.body.textContent.slice(0, 1500) })`);
  throw new Error(`Browser condition timed out: ${expression}\n${state}`);
};

try {
  await command("Page.enable");
  await command("Runtime.enable");
  await wait(1000);
  await evaluate(`localStorage.clear(); localStorage.setItem(${JSON.stringify(authStorageKey)}, ${JSON.stringify(JSON.stringify(signedIn.data.session))}); location.href = '/dashboard'`);
  await waitFor(`location.pathname === '/dashboard' && [...document.querySelectorAll('button')].some((button) => ['İçerik', 'Edit Content'].includes(button.textContent.trim()))`);
  await evaluate(`([...document.querySelectorAll('button')].find((button) => ['İçerik', 'Edit Content'].includes(button.textContent.trim())))?.click()`);
  await waitFor(`Boolean(document.querySelector('iframe')?.contentDocument?.body?.textContent?.trim())`);
  await waitFor(`document.querySelector('iframe')?.contentDocument?.querySelectorAll('[data-fastate-editable]').length > 0`, 30_000);
  await waitFor(`document.querySelector('iframe')?.contentDocument?.querySelectorAll('[data-fastate-locked]').length > 0`, 30_000);

  const initial = JSON.parse(await evaluate(`(() => {
    const iframe = document.querySelector('iframe');
    const walker = iframe.contentDocument.createTreeWalker(iframe.contentDocument.body, NodeFilter.SHOW_TEXT);
    let unclassified = 0; let node = walker.nextNode();
    while (node) { if (node.nodeValue.trim() && !node.parentElement.closest('script,style,noscript,[data-fastate-editable],[data-fastate-locked]')) unclassified += 1; node = walker.nextNode(); }
    return JSON.stringify({ editableCount: iframe.contentDocument.querySelectorAll('[data-fastate-editable]').length, lockedCount: iframe.contentDocument.querySelectorAll('[data-fastate-locked]').length, lockedWithReason: [...iframe.contentDocument.querySelectorAll('[data-fastate-locked]')].every((node) => Boolean(node.title)), unclassified, editableLinkCount: iframe.contentDocument.querySelectorAll('a [data-fastate-editable]').length, desktopWidth: iframe.getBoundingClientRect().width, sideFormFields: [...document.querySelectorAll('input, textarea')].filter((node) => node.offsetParent).length, previewPath: iframe.contentWindow.location.pathname });
  })()`));
  assert.ok(initial.editableCount > 0, JSON.stringify(initial));
  assert.ok(initial.lockedCount > 0 && initial.lockedWithReason, "Every locked text must explain why it cannot be edited.");
  assert.equal(initial.unclassified, 0, "Every visible copy node must be editable or explicitly locked.");
  assert.ok(initial.editableLinkCount > 0, "Navigation copy should be directly editable.");
  assert.equal(initial.sideFormFields, 0, "The old side-panel form should not be rendered.");
  await evaluate(`document.querySelector('button[role="switch"]')?.click()`);
  await waitFor(`document.querySelector('iframe').contentDocument.body.classList.contains('fastate-hide-locked')`);
  const lockedHidden = await evaluate(`[...document.querySelector('iframe').contentDocument.querySelectorAll('[data-fastate-locked]')].every((node) => getComputedStyle(node).display === 'none')`);
  assert.equal(lockedHidden, true, "The toggle must hide every non-editable text node.");

  await evaluate(`document.querySelector('iframe').contentDocument.querySelector('a [data-fastate-editable]').click()`);
  await wait(400);
  const pathAfterClick = await evaluate(`document.querySelector('iframe').contentWindow.location.pathname`);
  assert.equal(pathAfterClick, initial.previewPath, "Editor preview must not navigate when a link is clicked.");
  await evaluate(`(() => {
    const iframe = document.querySelector('iframe');
    const editor = iframe.contentDocument.querySelector('a [data-fastate-editable]');
    editor.dispatchEvent(new iframe.contentWindow.MouseEvent('dblclick', { bubbles: true, cancelable: true }));
  })()`);
  await waitFor(`document.querySelector('iframe').contentDocument.querySelector('a [data-fastate-editable]')?.contentEditable === 'true'`);

  const marker = `E2E-${Date.now()}`;
  await command("Input.insertText", { text: marker });
  await waitFor(`document.querySelector('iframe').contentDocument.body.textContent.includes(${JSON.stringify(marker)})`);
  await evaluate(`([...document.querySelectorAll('button')].find((button) => ['Değişiklikleri kaydet', 'Save changes'].includes(button.textContent.trim())))?.click()`);
  const saveStarted = Date.now();
  let persisted = false;
  while (Date.now() - saveStarted < 10_000) {
    const savedSite = await service.from("sites").select("theme_config").eq("id", siteResult.data.id).single();
    if (savedSite.error) throw savedSite.error;
    if (JSON.stringify(savedSite.data.theme_config).includes(marker)) { persisted = true; break; }
    await wait(250);
  }
  assert.equal(persisted, true, "Inline edit was not persisted after Save changes.");
  await evaluate(`location.reload()`);
  await waitFor(`location.pathname === '/dashboard' && [...document.querySelectorAll('button')].some((button) => ['İçerik', 'Edit Content'].includes(button.textContent.trim()))`);
  await evaluate(`([...document.querySelectorAll('button')].find((button) => ['İçerik', 'Edit Content'].includes(button.textContent.trim())))?.click()`);
  await waitFor(`document.querySelector('iframe')?.contentDocument?.body?.textContent?.includes(${JSON.stringify(marker)})`, 30_000);
  await evaluate(`document.querySelector('button[aria-label="Mobil görünüm"], button[aria-label="Mobile view"]')?.click()`);
  await waitFor(`document.querySelector('iframe').getBoundingClientRect().width <= 390`);
  const mobileWidth = await evaluate(`document.querySelector('iframe').getBoundingClientRect().width`);
  assert.ok(initial.desktopWidth > mobileWidth);

  console.info(JSON.stringify({ preview_only_editor: true, every_text_is_classified: true, locked_text_has_explanation: true, hide_non_editable_text_toggle_works: true, preview_navigation_is_locked: true, navigation_text_is_editable: true, double_click_enables_inline_editing: true, typing_updates_preview_without_save: true, save_persists_after_reload: true, mobile_preview_width: mobileWidth }, null, 2));
} finally {
  socket.close();
  await service.from("sites").update({ theme_config: originalTheme }).eq("id", siteResult.data.id);
}
