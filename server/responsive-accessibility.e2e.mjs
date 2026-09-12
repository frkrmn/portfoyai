import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseUrl = process.env.A11Y_E2E_URL || "http://127.0.0.1:4178";
const debugPort = Number(process.env.A11Y_CHROME_PORT || 9331);
const chromePath = process.env.CHROME_PATH || (process.platform === "darwin"
  ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  : "google-chrome");
const profiles = [
  { name: "mobile", width: 390, height: 844, mobile: true, scale: 2 },
  { name: "tablet", width: 768, height: 1024, mobile: true, scale: 1 },
  { name: "desktop", width: 1440, height: 900, mobile: false, scale: 1 },
];
const templates = ["platform", "warm-editorial", "bold-luxury", "clean-modern", "neighborhood-friendly", "investment-focused", "urgent-deals", "guided-match", "land-plots"];
const listingId = "00000000-0000-4000-8000-000000000001";
const documentedExceptions = new Set(["color-contrast"]);
const axeSource = await readFile(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
const reportDir = new URL("../reports/accessibility/", import.meta.url);
const userDataDir = await mkdtemp(join(tmpdir(), "portfoyai-a11y-"));
await mkdir(reportDir, { recursive: true });

const chrome = spawn(chromePath, [
  "--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu",
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${userDataDir}`, "about:blank",
], { stdio: "ignore" });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fetchJson = async (url, options) => {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
};
let target;
for (let attempt = 0; attempt < 60; attempt += 1) {
  try { target = await fetchJson(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(baseUrl)}`, { method: "PUT" }); break; } catch { await wait(250); }
}
if (!target) throw new Error("Chrome DevTools endpoint başlatılamadı.");

const socket = new WebSocket(target.webSocketDebuggerUrl);
let sequence = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
});
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
const command = (method, params = {}) => new Promise((resolve) => {
  const id = ++sequence; pending.set(id, resolve); socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const response = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (response.result.exceptionDetails) throw new Error(response.result.exceptionDetails.exception?.description || response.result.exceptionDetails.text);
  return response.result.result.value;
};
const waitFor = async (expression, timeout = 20_000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) { if (await evaluate(expression)) return; await wait(100); }
  throw new Error(`Zaman aşımı: ${expression}`);
};
const results = [];

try {
  await command("Page.enable"); await command("Runtime.enable");
  await command("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  for (const template of templates) {
    const routes = template === "platform"
      ? [{ view: "landing", path: "/" }]
      : [{ view: "home", path: `/site/a11y-${template}` }, { view: "listings", path: `/site/a11y-${template}/listings` }, { view: "detail", path: `/site/a11y-${template}/listings/${listingId}` }];
    for (const { view, path } of routes) for (const profile of profiles) {
      await command("Emulation.setDeviceMetricsOverride", { width: profile.width, height: profile.height, deviceScaleFactor: profile.scale, mobile: profile.mobile });
      const url = `${baseUrl}${path}`;
      await command("Page.navigate", { url });
      await waitFor("document.querySelector('main') && !document.body.textContent.includes('Site yükleniyor')");
      await evaluate(axeSource);
      const audit = await evaluate(`axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa'] } }).then(r => ({ violations: r.violations.map(v => ({ id:v.id, impact:v.impact, help:v.help, nodes:v.nodes.map(n => n.target) })) }))`);
      const blocking = audit.violations.filter((violation) => ["critical", "serious"].includes(violation.impact) && !documentedExceptions.has(violation.id));
      const exceptions = audit.violations.filter((violation) => documentedExceptions.has(violation.id));
      const layout = await evaluate(`({ overflow: document.documentElement.scrollWidth - innerWidth, main: Boolean(document.querySelector('main')), imagesWithoutAlt: [...document.images].filter(i => !i.hasAttribute('alt')).length, reducedMotion: [...document.querySelectorAll('*')].every(n => { const s=getComputedStyle(n); return parseFloat(s.animationDuration||'0') <= .01 && parseFloat(s.transitionDuration||'0') <= .01; }) })`);
      results.push({ template, view, viewport: profile.name, url, blocking, exceptions, layout });
      assert.ok(layout.overflow <= 1, `${template}/${view}/${profile.name}: yatay taşma ${layout.overflow}px`);
      assert.equal(layout.imagesWithoutAlt, 0, `${template}/${view}/${profile.name}: alt niteliği olmayan görsel`);
      assert.equal(layout.reducedMotion, true, `${template}/${view}/${profile.name}: reduced-motion ihlali`);
    }
  }

  await command("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await command("Page.navigate", { url: `${baseUrl}/site/a11y-clean-modern` });
  await waitFor("document.querySelector('main') && !document.body.textContent.includes('Site yükleniyor')");
  await command("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await command("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  const focus = await evaluate(`(()=>{const e=document.activeElement,s=getComputedStyle(e);return { tag:e?.tagName, visible: parseFloat(s.outlineWidth)>0 || s.boxShadow!=='none', name:e?.getAttribute('aria-label')||e?.textContent?.trim()||e?.getAttribute('placeholder')||'' }})()`);
  assert.notEqual(focus.tag, "BODY", "Tab ile odaklanılabilir öğeye ulaşılamadı.");
  assert.equal(focus.visible, true, "Klavye odağı görünür değil.");
  assert.ok(focus.name, "Odaklanan kontrolün erişilebilir adı yok.");
  results.push({ keyboard: { firstFocus: focus, passed: true } });
  await writeFile(new URL("report.json", reportDir), `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`);
  const blockingAudits = results.filter((result) => result.blocking?.length);
  assert.deepEqual(blockingAudits, [], blockingAudits.map((result) => `${result.template}/${result.view}/${result.viewport}: ${result.blocking.map((item) => item.id).join(", ")}`).join("; "));
  console.info(`A11y ve responsive regresyonları geçti: platform + 8 tema × 3 kritik route × ${profiles.length} viewport + klavye akışı.`);
} catch (error) {
  await writeFile(new URL("report.json", reportDir), `${JSON.stringify({ generatedAt: new Date().toISOString(), results, error: error.message }, null, 2)}\n`);
  throw error;
} finally {
  socket.close(); chrome.kill("SIGTERM"); await wait(300); await rm(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(() => {});
}
