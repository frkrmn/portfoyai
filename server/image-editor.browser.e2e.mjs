import assert from "node:assert/strict";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";

const env = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
const baseUrl = process.env.IMAGE_EDITOR_E2E_URL || "http://127.0.0.1:4175";
const service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const auth = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const signedIn = await auth.auth.signInWithPassword({ email: env.E2E_TEST_EMAIL || "user@portfoyai.com", password: env.E2E_TEST_PASSWORD || "123456" });
if (signedIn.error || !signedIn.data.session) throw signedIn.error || new Error("Sign-in failed.");
const userId = signedIn.data.user.id;
const { data: sites, error } = await service.from("sites").select("id,slug,theme_config").eq("user_id", userId).in("theme_config->>template_id", ["warm-editorial", "bold-luxury"]);
if (error) throw error;
const warm = sites.find((site) => site.theme_config?.template_id === "warm-editorial");
const bold = sites.find((site) => site.theme_config?.template_id === "bold-luxury");
assert(warm && bold, "Test user needs warm-editorial and bold-luxury sites.");
const originals = new Map([[warm.id, structuredClone(warm.theme_config)], [bold.id, structuredClone(bold.theme_config)]]);
const files = [path.resolve("public/images/listings/bagdat-residence.jpg"), path.resolve("public/images/listings/caddebostan-sea-view.jpg")];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const target = await fetch(`http://127.0.0.1:9224/json/new?${baseUrl}/`, { method: "PUT" }).then((response) => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl); let id = 0; const pending = new Map();
socket.addEventListener("message", (event) => { const message = JSON.parse(event.data); if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } });
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
const command = (method, params = {}) => new Promise((resolve) => { const commandId = ++id; pending.set(commandId, resolve); socket.send(JSON.stringify({ id: commandId, method, params })); });
const evaluate = async (expression, byValue = true) => { const result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: byValue }); if (result.result.exceptionDetails) throw new Error(result.result.exceptionDetails.text); return byValue ? result.result.result.value : result.result.result; };
const waitFor = async (expression, timeout = 30_000) => { const start = Date.now(); while (Date.now() - start < timeout) { if (await evaluate(expression)) return; await wait(250); } const state = await evaluate(`JSON.stringify({href:location.href,body:document.body.textContent.slice(0,1800)})`); throw new Error(`Timed out: ${expression}\n${state}`); };
const setFiles = async (selector, selectedFiles) => { const urls = selectedFiles.map((file) => `/images/listings/${path.basename(file)}`); await evaluate(`(async()=>{ const input=document.querySelector(${JSON.stringify(selector)}); if(!input) throw new Error('Missing file input'); const transfer=new DataTransfer(); for(const url of ${JSON.stringify(urls)}) { const blob=await fetch(url).then((response)=>response.blob()); transfer.items.add(new File([blob],url.split('/').at(-1),{type:blob.type})); } input.files=transfer.files; input.dispatchEvent(new Event('change',{bubbles:true})); return input.files.length; })()`); };
const openImages = async (site) => {
  await command("Page.navigate", { url: `${baseUrl}/dashboard?site=${site.id}` }); await waitFor(`location.pathname === '/dashboard'`);
  await waitFor(`[...document.querySelectorAll('button')].some((button) => ['Görselleri Düzenle','Edit Images'].includes(button.textContent.trim()))`);
  await evaluate(`([...document.querySelectorAll('button')].filter((button) => ['Görselleri Düzenle','Edit Images'].includes(button.textContent.trim())).at(-1))?.click()`);
  await waitFor(`document.querySelectorAll('input[type=file]').length > 0`);
};
const save = async () => { await waitFor(`[...document.querySelectorAll('button')].some((button) => ['Görselleri kaydet','Save images'].includes(button.textContent.trim()) && !button.disabled)`); await evaluate(`([...document.querySelectorAll('button')].find((button) => ['Görselleri kaydet','Save images'].includes(button.textContent.trim()) && !button.disabled))?.click()`); await waitFor(`document.body.textContent.includes('Site images updated.') || document.body.textContent.includes('Site görselleri güncellendi.')`); };

try {
  await command("Page.enable"); await command("Runtime.enable"); await command("DOM.enable");
  await wait(1200);
  await command("Page.navigate", { url: `${baseUrl}/login` }); await waitFor(`location.pathname === '/dashboard' || Boolean(document.querySelector('#login-email') && document.querySelector('#login-password'))`);
  if (await evaluate(`location.pathname !== '/dashboard'`)) {
    await evaluate(`(() => { const set=(node,value)=>{ const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(node,value); node.dispatchEvent(new Event('input',{bubbles:true})); }; set(document.querySelector('#login-email'),${JSON.stringify(env.E2E_TEST_EMAIL || "user@portfoyai.com")}); set(document.querySelector('#login-password'),${JSON.stringify(env.E2E_TEST_PASSWORD || "123456")}); document.querySelector('form button').click(); })()`);
    await waitFor(`location.pathname === '/dashboard'`, 30_000);
  }
  await openImages(warm);
  await setFiles('input[type=file]', [files[0]]); await waitFor(`document.querySelectorAll('img[src^="data:image/"]').length > 0`); await save();
  let row = await service.from("sites").select("theme_config").eq("id", warm.id).single(); assert.equal(typeof row.data.theme_config.media.heroImage, "string");
  await evaluate(`document.querySelector('iframe').contentWindow.location.reload()`);
  await waitFor(`document.querySelector('iframe').contentDocument.querySelector('[data-image-slot="heroImage"]')?.src.startsWith('data:image/')`);
  await service.from("sites").update({ theme_config: originals.get(warm.id) }).eq("id", warm.id);

  await openImages(bold);
  await setFiles('input[type=file][multiple]', files);
  await waitFor(`document.querySelectorAll('img[src^="data:image/"]').length >= 2`);
  await evaluate(`(() => { const section=[...document.querySelectorAll('section')].find((node)=>node.textContent.includes('Mimari Seçki Galerisi')); const rows=[...section.querySelectorAll('.rounded-xl.border.p-2')]; const enabled=[...rows[0].querySelectorAll('button')].filter((button)=>!button.disabled); enabled[0].click(); })()`);
  await save(); row = await service.from("sites").select("theme_config").eq("id", bold.id).single();
  const gallery = row.data.theme_config.media.showcaseImages; assert.equal(gallery.length, 2); assert.match(gallery[0], /data:image/); assert.notEqual(gallery[0], gallery[1]);
  await evaluate(`document.querySelector('iframe').contentWindow.location.reload()`);
  await waitFor(`document.querySelector('iframe').contentDocument.querySelectorAll('[data-image-slot="showcaseImages"]').length === 2`);
  const publicOrder = await evaluate(`[...document.querySelector('iframe').contentDocument.querySelectorAll('[data-image-slot="showcaseImages"]')].map((img)=>img.src)`);
  assert.deepEqual(publicOrder, gallery);
  console.info(JSON.stringify({ warm_single_hero_upload_reflected: true, bold_gallery_upload_reflected: true, bold_gallery_reorder_reflected: true, originals_restored: true }, null, 2));
} finally {
  socket.close();
  for (const [siteId, theme_config] of originals) await service.from("sites").update({ theme_config }).eq("id", siteId);
}
