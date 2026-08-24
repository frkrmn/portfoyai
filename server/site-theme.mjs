import { hexColorPattern } from "./api-utils.mjs";

export const fineTuneEnums = {
  buttonStyle: ["solid", "outline", "pill", "sharp"],
  navAlignment: ["left", "center", "split"],
  spacingDensity: ["compact", "comfortable", "spacious"],
  cardStyle: ["flat", "shadow", "bordered"],
  headingScale: ["modest", "bold"],
};

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
  for (const [field, colorKey] of [["primary_color", "primary"], ["accent_color", "accent"]]) {
    if (patch[field] === undefined) continue;
    if (!hexColorPattern.test(patch[field])) throw new Error(`VALIDATION:${field === "primary_color" ? "Primary" : "Accent"} color must be a six-digit hex color.`);
    topLevel[field] = patch[field];
    themeConfig.colors[colorKey] = patch[field];
    appliedFields.push(field);
  }
  for (const [field, fontKey] of [["heading_font", "heading"], ["body_font", "body"]]) {
    if (patch[field] === undefined) continue;
    themeConfig.fonts[fontKey] = textValue(patch[field], field, 160);
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
