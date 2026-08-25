import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const fullFileTargets = [
  "src/App.tsx",
  "src/portfoyai/auth-pages.tsx",
  "src/portfoyai/dashboard.tsx",
  "src/portfoyai/location-fields.tsx",
  "src/portfoyai/pricing.tsx",
];
const selectedViews = new Set(["Shell", "ListingForm", "LandingPage", "AuthPage"]);
const visibleAttributes = new Set(["placeholder", "title", "aria-label", "alt"]);
const findings = [];

const hasWords = (value) => /[A-Za-zÇĞİÖŞÜçğıöşü]{2,}/.test(value);
const looksTechnical = (value) =>
  /^(?:https?:|\/|#|[a-z]+[-_:][\w./:[\]-]+|[\w-]+\.(?:png|jpg|tsx|com)|[A-Z_]{2,})/.test(value) ||
  /(?:bg-|text-|rounded-|border-|grid|flex|px-|py-|mt-|sm:|md:|lg:|xl:)/.test(value) ||
  /^[._]?[a-z0-9_.:[\]-]+(?:\s+[a-z0-9_.:[\]-]+)*$/.test(value);

function functionName(node) {
  let current = node;
  while (current) {
    if (ts.isFunctionDeclaration(current) && current.name) return current.name.text;
    current = current.parent;
  }
  return null;
}

function report(source, file, node, raw) {
  const value = raw.replace(/\s+/g, " ").trim();
  if (!value || !hasWords(value) || looksTechnical(value)) return;
  const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
  findings.push({ file, line: line + 1, value });
}

function inspect(file, selectedFunctions) {
  const sourceText = fs.readFileSync(path.join(root, file), "utf8");
  const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (node) => {
    if (selectedFunctions && !selectedFunctions.has(functionName(node))) {
      ts.forEachChild(node, visit);
      return;
    }
    if (ts.isJsxText(node)) report(source, file, node, node.getText(source));
    if (ts.isJsxAttribute(node) && visibleAttributes.has(node.name.getText(source)) && node.initializer && ts.isStringLiteral(node.initializer)) {
      report(source, file, node.initializer, node.initializer.text);
    }
    if (ts.isJsxExpression(node) && node.expression) {
      const inspectExpression = (child) => {
        if (ts.isCallExpression(child) && child.expression.getText(source) === "t") return;
        if (ts.isStringLiteral(child) || ts.isNoSubstitutionTemplateLiteral(child)) report(source, file, child, child.text);
        ts.forEachChild(child, inspectExpression);
      };
      inspectExpression(node.expression);
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

fullFileTargets.forEach((file) => inspect(file));
inspect("src/portfoyai/views.tsx", selectedViews);

if (findings.length) {
  findings.forEach(({ file, line, value }) => console.log(`${file}:${line}: ${JSON.stringify(value)}`));
  process.exitCode = 1;
} else {
  console.log("Platform i18n JSX audit: no hardcoded Turkish or English UI strings found.");
}
