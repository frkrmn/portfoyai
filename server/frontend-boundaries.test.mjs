import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";

const root = resolve("src");
const boundaryRoot = resolve("src/portfoyai");
const files = [];
const walk = async (directory) => { for (const entry of await readdir(directory, { withFileTypes: true })) entry.isDirectory() ? await walk(join(directory, entry.name)) : /\.[jt]sx?$/.test(entry.name) && files.push(join(directory, entry.name)); };
await walk(root);
const known = new Set(files);
const graph = new Map();
for (const file of files) {
  const source = await readFile(file, "utf8");
  const dependencies = [];
  for (const match of source.matchAll(/(?:from\s+|import\s*\()["'](\.[^"']+)["']/g)) {
    const base = resolve(dirname(file), match[1]);
    const target = [base, ...[".ts", ".tsx", ".js", ".jsx"].map((suffix) => `${base}${suffix}`), ...["index.ts", "index.tsx"].map((name) => join(base, name))].find((candidate) => known.has(candidate));
    if (target?.startsWith(boundaryRoot)) dependencies.push(target);
  }
  graph.set(file, dependencies);
}
const visiting = new Set(); const visited = new Set();
const visit = (file, path = []) => { if (visiting.has(file)) throw new Error(`Import cycle: ${[...path, file].map((item) => relative(root, item)).join(" -> ")}`); if (visited.has(file)) return; visiting.add(file); for (const dependency of graph.get(file) || []) visit(dependency, [...path, file]); visiting.delete(file); visited.add(file); };
for (const file of files) visit(file);
assert.ok(files.some((file) => file.endsWith("views/landing.ts")));
assert.ok(files.some((file) => file.endsWith("dashboard/sections.tsx")));
console.info(`Frontend module graph verified: ${files.length} files, no import cycles.`);
