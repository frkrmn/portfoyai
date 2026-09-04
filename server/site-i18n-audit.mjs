import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const templates = ["warm-editorial", "bold-luxury", "clean-modern", "neighborhood-friendly", "investment-focused", "urgent-deals", "guided-match", "land-plots"];
const unitOnly = new Set(["m²"]);
const findings = [];

for (const template of templates) {
  const component = `${template.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join("")}Template.tsx`;
  const file = `src/templates/${template}/${component}`;
  const source = fs.readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const add = (node, string) => {
    const value = string.trim().replace(/\s+/g, " ");
    if (!value || !/[A-Za-zÇĞİÖŞÜçğıöşü]/u.test(value)) return;
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
    findings.push({ template, file, line, string: value, classification: unitOnly.has(value) ? "language-neutral unit" : "untranslated UI" });
  };
  const visit = (node) => {
    if (ts.isJsxText(node)) add(node, node.text);
    if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer) && ["placeholder", "title", "aria-label"].includes(node.name.text)) add(node, node.initializer.text);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

const untranslated = findings.filter((finding) => finding.classification === "untranslated UI");
assert.equal(untranslated.length, 0, `Found untranslated generated-site UI: ${JSON.stringify(untranslated, null, 2)}`);
console.info(JSON.stringify({ templates: templates.length, untranslated_ui: untranslated, remaining_literals: findings }, null, 2));
