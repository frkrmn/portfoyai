import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const assetsDir = new URL("../dist/assets/", import.meta.url);
const files = await readdir(assetsDir);
const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
const entryName = html.match(/src="\/assets\/(index-[^"]+\.js)"/)?.[1];
assert(entryName, "Could not find the initial JS entry");
const entryBytes = (await stat(join(assetsDir.pathname, entryName))).size;
assert(entryBytes < 700_000, `Initial JS exceeds 700 KB budget: ${entryBytes}`);
for (const prefix of ["not-found-", "dashboard-", "platform-content-admin-", "SiteRenderer-"]) assert(files.some((file) => file.startsWith(prefix)), `Missing route chunk: ${prefix}`);
for (const prefix of ["WarmEditorialTemplate-", "BoldLuxuryTemplate-", "CleanModernTemplate-", "NeighborhoodFriendlyTemplate-", "InvestmentFocusedTemplate-", "UrgentDealsTemplate-", "GuidedMatchTemplate-", "LandPlotsTemplate-"]) assert(files.some((file) => file.startsWith(prefix)), `Missing template chunk: ${prefix}`);
const entry = await readFile(join(assetsDir.pathname, entryName), "utf8");
assert(entry.includes("import("), "Initial entry does not contain lazy route imports");
console.info(`Bundle split audit passed: initial=${entryBytes} bytes, route and 8 template chunks present.`);
