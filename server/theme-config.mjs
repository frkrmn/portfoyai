import Ajv2020 from "ajv/dist/2020.js";
import { readFileSync } from "node:fs";

export const CURRENT_THEME_SCHEMA_VERSION = 3;
export const TEMPLATE_IDS = ["tm_01", "tm_02", "tm_03", "tm_04", "warm-editorial", "bold-luxury", "clean-modern", "neighborhood-friendly", "investment-focused", "urgent-deals", "guided-match", "land-plots"];
const color = { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" };
export const themeConfigSchema = { $schema: "https://json-schema.org/draft/2020-12/schema", type: "object", required: ["schema_version", "template_id", "colors", "fonts", "content"], properties: {
  schema_version: { const: CURRENT_THEME_SCHEMA_VERSION }, template_id: { enum: TEMPLATE_IDS }, language: { enum: ["tr", "en"] },
  colors: { type: "object", required: ["background", "primary", "accent", "text"], properties: { background: color, primary: color, accent: color, text: color, buttonColorSource: { enum: ["accent", "primary", "custom"] }, buttonColorCustom: color }, additionalProperties: true },
  fonts: { type: "object", required: ["heading", "body"], properties: { heading: { type: "string", minLength: 1 }, body: { type: "string", minLength: 1 }, headingWeight: { type: "integer", minimum: 100, maximum: 900 }, bodyWeight: { type: "integer", minimum: 100, maximum: 900 }, headingItalic: { type: "boolean" }, bodyItalic: { type: "boolean" } }, additionalProperties: true },
  content: { type: "object" }, media: { type: "object" }, layout: { type: "object" }, layout_fine_tune: { type: "object" },
}, allOf: [
  { if: { properties: { template_id: { const: "neighborhood-friendly" } } }, then: { properties: { content: { properties: { neighborhoods: { type: "array" } } } } } },
  { if: { properties: { template_id: { const: "guided-match" } } }, then: { properties: { content: { properties: { feelings: { type: "array" }, timings: { type: "array" } } } } } },
  { if: { properties: { template_id: { const: "land-plots" } } }, then: { properties: { content: { required: ["services", "processSteps"], properties: { services: { type: "array", minItems: 4 }, processSteps: { type: "array", minItems: 3 } } } } } },
], additionalProperties: true };

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateTheme = ajv.compile(themeConfigSchema);
const validateGeneration = ajv.compile(JSON.parse(readFileSync(new URL("./site-config.schema.json", import.meta.url), "utf8")));
const migrations = {
  0: (config) => ({ ...config, schema_version: 1 }),
  1: (config) => ({ ...config, colors: config.colors || { background: "#FFFFFF", primary: config.primary || "#173F32", accent: config.accent || "#D86F45", text: "#17211C" }, schema_version: 2 }),
  2: (config) => ({ ...config, fonts: config.fonts || { heading: "Manrope, Arial, sans-serif", body: "Inter, Arial, sans-serif" }, content: config.content || {}, schema_version: 3 }),
};
export const migrateThemeConfig = (input) => {
  let config = structuredClone(input && typeof input === "object" ? input : {});
  let version = Number.isInteger(config.schema_version) ? config.schema_version : 0;
  if (version > CURRENT_THEME_SCHEMA_VERSION) throw new Error(`VALIDATION:Unsupported theme_config schema version ${version}.`);
  while (version < CURRENT_THEME_SCHEMA_VERSION) { config = migrations[version](config); version = config.schema_version; }
  config.colors = { background: "#FFFFFF", primary: "#173F32", accent: "#D86F45", text: "#17211C", ...(config.colors || {}) };
  config.fonts = { heading: "Manrope, Arial, sans-serif", body: "Inter, Arial, sans-serif", ...(config.fonts || {}) };
  config.content ||= {};
  return config;
};
const errors = (items) => items?.map((error) => `${error.instancePath || "/"} ${error.message}`).join("; ") || "unknown validation error";
export const validateThemeConfig = (input) => { const config = migrateThemeConfig(input); if (!validateTheme(config)) throw new Error(`VALIDATION:Invalid theme_config: ${errors(validateTheme.errors)}`); return config; };
export const validateGeneratedSiteConfig = (input) => { if (!validateGeneration(input)) throw new Error(`VALIDATION:Invalid generated site config: ${errors(validateGeneration.errors)}`); return input; };
