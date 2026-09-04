import assert from "node:assert/strict";
import { GoogleGenAI } from "@google/genai";
import { loadEnv } from "vite";
import { siteConfigModel, siteConfigSchema, siteConfigSystemPrompt } from "./handlers/generate-theme.mjs";

const env = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is required.");
let generationCalls = 0;
generationCalls += 1;
const response = await new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }).models.generateContent({
  model: siteConfigModel,
  contents: "USER BUSINESS DESCRIPTION:\nBodrum'da müşterilerini dinleyerek doğru evle eşleştiren kişisel bir gayrimenkul danışmanıyım; sıcak ve rehberlik odaklı bir site istiyorum.",
  config: { systemInstruction: siteConfigSystemPrompt, responseMimeType: "application/json", responseSchema: siteConfigSchema },
});
const config = JSON.parse(response.text || "{}");
assert.equal(generationCalls, 1);
assert.equal(config.template_id, "guided-match");
for (const field of [config.headline, config.tone]) assert.ok(field?.tr && field?.en);
assert.ok(config.content.feelings.length >= 3 && config.content.feelings.every((value) => value.tr && value.en));
assert.ok(config.content.timings.length >= 3 && config.content.timings.every((value) => value.tr && value.en));
console.info(JSON.stringify({ generation_calls: generationCalls, template_id: config.template_id, headline: config.headline, tone: config.tone, localized_feelings: config.content.feelings.length, localized_timings: config.content.timings.length }, null, 2));
