import { hexColorPattern } from "./api-utils.mjs";

export const fineTuneEnums = {
  buttonStyle: ["solid", "outline", "pill", "sharp"],
  navAlignment: ["left", "center", "split"],
  spacingDensity: ["compact", "comfortable", "spacious"],
  cardStyle: ["flat", "shadow", "bordered"],
  headingScale: ["modest", "bold"],
};

export const buttonColorSources = ["accent", "primary", "custom"];
export const fontWeights = [100, 200, 300, 400, 500, 600, 700, 800, 900];

const clone = (value) => structuredClone(value && typeof value === "object" ? value : {});
const textValue = (value, field, max) => {
  const text = String(value).trim();
  if (!text || text.length > max) throw new Error(`VALIDATION:${field} is invalid.`);
  return text;
};

export const mergeThemeConfig = (currentThemeConfig, patch) => {
  const themeConfig = clone(currentThemeConfig);
  themeConfig.colors ||= {};
  themeConfig.fonts ||= {};
  themeConfig.content ||= {};
  const topLevel = {};
  const appliedFields = [];

  if (patch.business_name !== undefined) {
    const value = textValue(patch.business_name, "Business name", 160);
    topLevel.business_name = value;
    themeConfig.content.businessName = value;
    appliedFields.push("business_name");
  }
  if (patch.headline !== undefined) {
    const value = textValue(patch.headline, "Headline", 240);
    topLevel.headline = value;
    themeConfig.content.headline = value;
    appliedFields.push("headline");
  }
  if (patch.tone !== undefined) {
    const value = String(patch.tone).trim();
    if (value.length > 500) throw new Error("VALIDATION:Description must be at most 500 characters.");
    topLevel.tone = value;
    themeConfig.content.bio = value;
    appliedFields.push("tone");
  }
  for (const key of ["phone", "email", "address"]) {
    if (patch[key] === undefined) continue;
    const value = String(patch[key]).trim();
    if (value.length > 240) throw new Error(`VALIDATION:${key} must be at most 240 characters.`);
    themeConfig.content[key] = value;
    appliedFields.push(key);
  }
  if (patch.region_focus !== undefined) {
    const value = String(patch.region_focus).trim();
    if (value.length > 300) throw new Error("VALIDATION:Region focus must be at most 300 characters.");
    themeConfig.content.regionFocus = value;
    appliedFields.push("region_focus");
  }
  for (const [field, colorKey] of [["primary_color", "primary"], ["accent_color", "accent"]]) {
    if (patch[field] === undefined) continue;
    if (!hexColorPattern.test(patch[field])) throw new Error(`VALIDATION:${field === "primary_color" ? "Primary" : "Accent"} color must be a six-digit hex color.`);
    topLevel[field] = patch[field];
    themeConfig.colors[colorKey] = patch[field];
    appliedFields.push(field);
  }
  if (patch.buttonColorSource !== undefined) {
    if (!buttonColorSources.includes(patch.buttonColorSource)) throw new Error("VALIDATION:Button color source must be accent, primary or custom.");
    themeConfig.colors.buttonColorSource = patch.buttonColorSource;
    appliedFields.push("colors.buttonColorSource");
  }
  if (patch.buttonColorCustom !== undefined) {
    if (!hexColorPattern.test(patch.buttonColorCustom)) throw new Error("VALIDATION:Custom button color must be a six-digit hex color.");
    themeConfig.colors.buttonColorCustom = patch.buttonColorCustom;
    appliedFields.push("colors.buttonColorCustom");
  }
  for (const [field, fontKey] of [["heading_font", "heading"], ["body_font", "body"]]) {
    if (patch[field] === undefined) continue;
    themeConfig.fonts[fontKey] = textValue(patch[field], field, 160);
    appliedFields.push(field);
  }
  for (const [field, fontKey] of [["heading_weight", "headingWeight"], ["body_weight", "bodyWeight"]]) {
    if (patch[field] === undefined) continue;
    const value = Number(patch[field]);
    if (!fontWeights.includes(value)) throw new Error(`VALIDATION:${field} must be an available CSS font weight.`);
    themeConfig.fonts[fontKey] = value;
    appliedFields.push(field);
  }
  for (const [field, fontKey] of [["heading_italic", "headingItalic"], ["body_italic", "bodyItalic"]]) {
    if (patch[field] === undefined) continue;
    if (typeof patch[field] !== "boolean") throw new Error(`VALIDATION:${field} must be a boolean.`);
    themeConfig.fonts[fontKey] = patch[field];
    appliedFields.push(field);
  }
  if (patch.layout_fine_tune !== undefined) {
    if (!patch.layout_fine_tune || typeof patch.layout_fine_tune !== "object" || Array.isArray(patch.layout_fine_tune)) {
      throw new Error("VALIDATION:layout_fine_tune must be an object.");
    }
    themeConfig.layout_fine_tune ||= {};
    for (const [field, value] of Object.entries(patch.layout_fine_tune)) {
      if (!fineTuneEnums[field]) throw new Error(`VALIDATION:Unsupported fine-tune field: ${field}.`);
      if (!fineTuneEnums[field].includes(value)) throw new Error(`VALIDATION:Invalid ${field} value.`);
      themeConfig.layout_fine_tune[field] = value;
      appliedFields.push(`layout_fine_tune.${field}`);
    }
  }

  return { themeConfig, topLevel, appliedFields };
};
