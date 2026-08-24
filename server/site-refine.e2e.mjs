import assert from "node:assert/strict";
import { loadEnv } from "vite";
import { mapRefinementRequest } from "./handlers/site-refine.mjs";
import { mergeThemeConfig } from "./site-theme.mjs";

const env = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is required.");

const cases = [
  { request: "butonları daha yuvarlak yap", path: "layout_fine_tune.buttonStyle", expected: "pill" },
  { request: "menüyü ortala", path: "layout_fine_tune.navAlignment", expected: "center" },
  { request: "kartların gölgesini kaldır, daha sade dursun", path: "layout_fine_tune.cardStyle", expected: "flat" },
  { request: "logo boyutunu büyüt ve hero görselini kaldır", unsupported: true },
];

const baseline = {
  template_id: "clean-modern",
  colors: { primary: "#173F32", accent: "#D86F45", background: "#FFFFFF", text: "#17211C" },
  fonts: { heading: "Manrope, Inter, Arial, sans-serif", body: "Inter, Arial, sans-serif" },
  content: { businessName: "Test Emlak", headline: "Doğru evi bulun" },
  layout: { show_categories: false, show_testimonial: true },
};

const outputs = [];
for (const testCase of cases) {
  const result = await mapRefinementRequest(testCase.request, env.GEMINI_API_KEY);
  const returnedFields = Object.keys(result.patch).flatMap((key) => key === "layout_fine_tune"
    ? Object.keys(result.patch.layout_fine_tune).map((nested) => `${key}.${nested}`)
    : [key]);

  if (testCase.unsupported) {
    assert.deepEqual(returnedFields, [], "Out-of-scope request must not produce a change");
    assert.ok(result.unsupported_note, "Out-of-scope request must include unsupported_note");
  } else {
    assert.deepEqual(returnedFields, [testCase.path], "The mapper must not touch unrelated fields");
    const [, nested] = testCase.path.split(".");
    assert.equal(result.patch.layout_fine_tune[nested], testCase.expected);
    const merged = mergeThemeConfig(baseline, result.patch);
    const unchanged = structuredClone(merged.themeConfig);
    delete unchanged.layout_fine_tune;
    assert.deepEqual(unchanged, baseline, "Refinement must preserve unrelated theme_config fields");
  }
  outputs.push({ request: testCase.request, patch: result.patch, unsupported_note: result.unsupported_note });
}

console.info(JSON.stringify(outputs, null, 2));
