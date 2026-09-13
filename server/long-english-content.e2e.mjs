import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const baseUrl = process.env.LONG_ENGLISH_E2E_URL || "http://127.0.0.1:4178";
const debugPort = Number(process.env.LONG_ENGLISH_CHROME_PORT || 9332);
const chromePath = process.env.CHROME_PATH || (process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "google-chrome");
const templates = ["warm-editorial", "bold-luxury", "clean-modern", "neighborhood-friendly", "investment-focused", "urgent-deals", "guided-match", "land-plots"];
const viewports = [{ name: "mobile", width: 390, height: 844, mobile: true }, { name: "desktop", width: 1440, height: 900, mobile: false }];
const reportDir = new URL("../reports/long-english/", import.meta.url);
await mkdir(reportDir, { recursive: true });
const userDataDir = await mkdtemp(join(tmpdir(), "fastate-long-en-"));
const chrome = spawn(chromePath, ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", `--remote-debugging-port=${debugPort}`, `--user-data-dir=${userDataDir}`, "about:blank"], { stdio: "ignore" });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let target;
for (let attempt = 0; attempt < 60; attempt += 1) { try { target = await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: "PUT" }).then((response) => response.json()); break; } catch { await wait(250); } }
if (!target) throw new Error("Chrome DevTools endpoint could not be started.");
const socket = new WebSocket(target.webSocketDebuggerUrl); let id = 0; const pending = new Map();
socket.addEventListener("message", (event) => { const message = JSON.parse(event.data); if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } });
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
const command = (method, params = {}) => new Promise((resolve) => { const requestId = ++id; pending.set(requestId, resolve); socket.send(JSON.stringify({ id: requestId, method, params })); });
const evaluate = async (expression) => { const result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (result.result.exceptionDetails) throw new Error(result.result.exceptionDetails.text); return result.result.result.value; };
const waitFor = async (expression) => { for (let attempt = 0; attempt < 160; attempt += 1) { if (await evaluate(expression)) return; await wait(100); } throw new Error(`Timed out: ${expression}`); };
const results = [];
try {
  await command("Page.enable"); await command("Runtime.enable");
  for (const template of templates) for (const viewport of viewports) {
    await command("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.mobile });
    await command("Page.navigate", { url: `${baseUrl}/site/long-en-${template}` });
    await waitFor("document.querySelector('main') && document.documentElement.lang === 'en'");
    const layout = await evaluate(`(() => { const visible = n => { const s=getComputedStyle(n),r=n.getBoundingClientRect(); return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0 }; const text=[...document.querySelectorAll('h1,h2,h3,p,a,button')].filter(visible); const clipped=text.filter(n => !String(n.className).includes('line-clamp') && n.scrollWidth>n.clientWidth+1); const ctas=[...document.querySelectorAll('[data-site-button],a[href*="listings"],button')].filter(visible); const nav=[...document.querySelectorAll('header nav a')].filter(visible); return { overflow:document.documentElement.scrollWidth-innerWidth, clipped:clipped.map(n=>({tag:n.tagName,className:String(n.className),text:n.textContent.trim().slice(0,80),scrollWidth:n.scrollWidth,clientWidth:n.clientWidth})), ctas:ctas.length, usableCtas:ctas.filter(n=>{const r=n.getBoundingClientRect();return r.width>=36&&r.height>=30}).length, nav:nav.length, navInsideViewport:nav.every(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth}), longHeadline:document.body.innerText.toLowerCase().includes('international residential investment advisory collective') }; })()`);
    assert.ok(layout.overflow <= 1, `${template}/${viewport.name}: horizontal overflow ${layout.overflow}px`);
    assert.deepEqual(layout.clipped, [], `${template}/${viewport.name}: clipped text ${layout.clipped.join(" | ")}`);
    assert.ok(layout.ctas > 0 && layout.usableCtas > 0, `${template}/${viewport.name}: no usable CTA`);
    if (viewport.name === "desktop") assert.ok(layout.nav > 0 && layout.navInsideViewport, `${template}: desktop navigation is not usable`);
    assert.equal(layout.longHeadline, true, `${template}: long English fixture was not rendered`);
    const screenshot = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    await writeFile(new URL(`${template}-${viewport.name}.png`, reportDir), Buffer.from(screenshot.result.data, "base64"));
    results.push({ template, viewport: viewport.name, ...layout });
  }
  await writeFile(new URL("report.json", reportDir), `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`);
  console.info(`Long English visual resilience passed: ${templates.length} themes × ${viewports.length} viewports.`);
} finally {
  socket.close(); chrome.kill("SIGTERM"); await wait(250); await rm(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(() => {});
}
