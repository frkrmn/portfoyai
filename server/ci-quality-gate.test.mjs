import assert from "node:assert/strict";
import fs from "node:fs";

const workflowPath = new URL("../.github/workflows/quality-gate.yml", import.meta.url);
const workflow = fs.readFileSync(workflowPath, "utf8");

const requiredFragments = [
  "pull_request:",
  "cache: npm",
  "cancel-in-progress: true",
  "npm run lint",
  "npm run build",
  "npm run test:schema-audits",
  "npm run test:i18n-audits",
  "suite: [performance, accessibility]",
  "needs: [build, schema, i18n, browser]",
  "name: required",
  "if: always()",
];

for (const fragment of requiredFragments) {
  assert.ok(workflow.includes(fragment), `CI quality gate is missing: ${fragment}`);
}

const workflowFiles = fs.readdirSync(new URL("../.github/workflows/", import.meta.url)).filter((file) => file.endsWith(".yml"));
assert.deepEqual(workflowFiles, ["quality-gate.yml"], "Required checks must be orchestrated by the single quality gate workflow.");

console.info("CI quality gate contract passed: PR trigger, cache, parallel audits, browser suites and required aggregate check are present.");
