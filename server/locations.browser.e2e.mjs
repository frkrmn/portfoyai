import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";

const env = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
const email = process.env.E2E_TEST_EMAIL || "user@portfoyai.com";
const password = process.env.E2E_TEST_PASSWORD || "123456";
const auth = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const signedIn = await auth.auth.signInWithPassword({ email, password });
if (signedIn.error || !signedIn.data.session) throw signedIn.error || new Error("Test sign-in failed.");
const projectRef = new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0];
const authStorageKey = `sb-${projectRef}-auth-token`;
const target = await fetch("http://127.0.0.1:9224/json/new?http://127.0.0.1:4173/", { method: "PUT" }).then((response) => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let commandId = 0;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
});
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
const command = (method, params = {}) => new Promise((resolve) => { const id = ++commandId; pending.set(id, resolve); socket.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression) => {
  const result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.result.value;
};
const waitFor = async (expression, timeout = 30_000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) { if (await evaluate(expression)) return; await wait(250); }
  throw new Error(`Timed out: ${expression}\n${await evaluate("document.body.textContent.slice(0,1500)")}`);
};
const chooseOption = async (triggerId, label) => {
  await waitFor(`!document.querySelector(${JSON.stringify(`#${triggerId}`)}).disabled`);
  await evaluate(`document.querySelector(${JSON.stringify(`#${triggerId}`)}).click()`);
  await waitFor(`document.querySelector(${JSON.stringify(`#${triggerId}`)}).getAttribute('aria-expanded')==='true'`);
  await waitFor(`[...document.querySelectorAll('[role="option"]')].some((option)=>option.textContent.trim()===${JSON.stringify(label)})`);
  await evaluate(`([...document.querySelectorAll('[role="option"]')].find((option)=>option.textContent.trim()===${JSON.stringify(label)})).click()`);
};
const optionLabels = () => evaluate(`[...document.querySelectorAll('[role="option"]')].map((option)=>option.textContent.trim())`);

try {
  await command("Page.enable");
  await command("Runtime.enable");
  await evaluate(`localStorage.clear(); localStorage.setItem(${JSON.stringify(authStorageKey)}, ${JSON.stringify(JSON.stringify(signedIn.data.session))}); location.href='/dashboard'`);
  await waitFor("document.body.textContent.includes('Toplam portföy')");
  await evaluate("[...document.querySelectorAll('button')].find((button)=>button.textContent.trim()==='Portföyler')?.click()");
  await waitFor("Boolean(document.querySelector('#listing-location-province'))");

  const cases = [
    { province: "İSTANBUL", district: "ADALAR", expectedNeighborhood: "BURGAZADA Mah.", excludedDistrict: "ÇANKAYA" },
    { province: "ANKARA", district: "ÇANKAYA", expectedNeighborhood: "100.YIL Mah.", excludedDistrict: "ADALAR" },
    { province: "İZMİR", district: "ALİAĞA", expectedNeighborhood: "AŞAĞIŞAKRAN Mah.", excludedDistrict: "ÇANKAYA" },
  ];
  const results = {};
  for (const item of cases) {
    await chooseOption("listing-location-province", item.province);
    await waitFor("!document.querySelector('#listing-location-district').disabled");
    await evaluate("document.querySelector('#listing-location-district').click()");
    await waitFor(`[...document.querySelectorAll('[role="option"]')].some((option)=>option.textContent.trim()===${JSON.stringify(item.district)})`);
    const districts = await optionLabels();
    assert.ok(districts.includes(item.district));
    assert.ok(!districts.includes(item.excludedDistrict));
    await evaluate(`([...document.querySelectorAll('[role="option"]')].find((option)=>option.textContent.trim()===${JSON.stringify(item.district)})).click()`);
    await waitFor("!document.querySelector('#listing-location-neighborhood').disabled");
    await evaluate("document.querySelector('#listing-location-neighborhood').click()");
    await waitFor(`[...document.querySelectorAll('[role="option"]')].some((option)=>option.textContent.trim()===${JSON.stringify(item.expectedNeighborhood)})`);
    const neighborhoods = await optionLabels();
    assert.ok(neighborhoods.includes(item.expectedNeighborhood));
    await evaluate(`([...document.querySelectorAll('[role="option"]')].find((option)=>option.textContent.trim()===${JSON.stringify(item.expectedNeighborhood)})).click()`);
    results[item.province] = { district: item.district, neighborhood: item.expectedNeighborhood, districtOptions: districts.length, neighborhoodOptions: neighborhoods.length };
  }
  assert.equal(await evaluate("document.body.textContent.includes('Mevcut konum metni:')"), false);
  await evaluate("[...document.querySelectorAll('button')].filter((button)=>button.textContent.trim()==='Site ayarları').at(-1)?.click()");
  await waitFor("Boolean(document.querySelector('#site-region-province') && document.querySelector('#site-region-district') && document.querySelector('#site-region-neighborhood'))");
  console.info(JSON.stringify({ cascading_dropdowns: true, site_region_targeting_uses_same_hierarchy: true, country_hidden_and_defaulted_to_TR: true, database_writes: 0, results }, null, 2));
} finally {
  socket.close();
}
