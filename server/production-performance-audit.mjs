import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const budgets = JSON.parse(await readFile(new URL("../performance-budgets.json", import.meta.url), "utf8"));
const baseUrl = process.env.PERFORMANCE_BASE_URL || "http://127.0.0.1:4178";
const samples = [];
let responseBytes = 0;
for (let index = 0; index < 5; index += 1) {
  const started = performance.now();
  const response = await fetch(`${baseUrl}/api/public-sites/performance-fixture`, { headers: { Accept: "application/json" } });
  const firstByteMs = performance.now() - started;
  const body = await response.arrayBuffer();
  if (!response.ok) throw new Error(`Fixture API returned HTTP ${response.status}`);
  responseBytes = body.byteLength;
  samples.push(Number(firstByteMs.toFixed(2)));
}
const sorted = [...samples].sort((a, b) => a - b);
const p95TtfbMs = sorted[Math.ceil(sorted.length * 0.95) - 1];

const assetsUrl = new URL("../dist/assets/", import.meta.url);
const files = await readdir(assetsUrl);
const jsFiles = files.filter((file) => file.endsWith(".js"));
const sizes = Object.fromEntries(await Promise.all(jsFiles.map(async (file) => [file, (await stat(join(assetsUrl.pathname, file))).size])));
const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
const initialName = html.match(/src="\/assets\/(index-[^"]+\.js)"/)?.[1];
if (!initialName) throw new Error("Initial JavaScript bundle was not found");
const initialJsBytes = sizes[initialName];
const largestChunkBytes = Math.max(...Object.values(sizes));
const totalJsBytes = Object.values(sizes).reduce((total, size) => total + size, 0);
const failures = [];
if (responseBytes > budgets.api.maxResponseBytes) failures.push(`API response ${responseBytes} > ${budgets.api.maxResponseBytes} bytes`);
if (p95TtfbMs > budgets.api.maxP95TtfbMs) failures.push(`API p95 TTFB ${p95TtfbMs} > ${budgets.api.maxP95TtfbMs} ms`);
if (initialJsBytes > budgets.bundle.maxInitialJsBytes) failures.push(`Initial JS ${initialJsBytes} > ${budgets.bundle.maxInitialJsBytes} bytes`);
if (largestChunkBytes > budgets.bundle.maxLargestChunkBytes) failures.push(`Largest chunk ${largestChunkBytes} > ${budgets.bundle.maxLargestChunkBytes} bytes`);
if (totalJsBytes > budgets.bundle.maxTotalJsBytes) failures.push(`Total JS ${totalJsBytes} > ${budgets.bundle.maxTotalJsBytes} bytes`);
const report = { generatedAt: new Date().toISOString(), budgets, measurements: { api: { responseBytes, ttfbSamplesMs: samples, p95TtfbMs }, bundle: { initialName, initialJsBytes, largestChunkBytes, totalJsBytes, chunkCount: jsFiles.length } }, passed: failures.length === 0, failures };
await mkdir(new URL("../reports/", import.meta.url), { recursive: true });
await writeFile(new URL("../reports/performance-budget.json", import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.info(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
