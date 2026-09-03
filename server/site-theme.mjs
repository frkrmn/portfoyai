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

const sanitizeContent = (value, path = "content", depth = 0) => {
  if (depth > 5) throw new Error(`VALIDATION:${path} is nested too deeply.`);
  if (typeof value === "string") {
    if (value.length > 5000) throw new Error(`VALIDATION:${path} is too long.`);
    return value.trim();
  }
  if (Array.isArray(value)) {
    if (value.length > 50) throw new Error(`VALIDATION:${path} has too many items.`);
    return value.map((item, index) => sanitizeContent(item, `${path}.${index}`, depth + 1));
  }
  if (!value || typeof value !== "object") throw new Error(`VALIDATION:${path} must contain text, objects or arrays.`);
  const entries = Object.entries(value);
  if (entries.length > 100) throw new Error(`VALIDATION:${path} has too many fields.`);
  return Object.fromEntries(entries.map(([key, item]) => {
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(key)) throw new Error(`VALIDATION:${path} contains an invalid field.`);
    return [key, sanitizeContent(item, `${path}.${key}`, depth + 1)];
  }));
};

const mergeContent = (current, patch) => {
  const result = clone(current);
  for (const [key, value] of Object.entries(patch)) {
    result[key] = value && typeof value === "object" && !Array.isArray(value)
      ? mergeContent(result[key], value)
      : value;
  }
  return result;
};

const sanitizeMedia = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("VALIDATION:media must be an object.");
  const entries = Object.entries(value);
  if (entries.length > 30) throw new Error("VALIDATION:media has too many slots.");
  const cleanUrl = (url, path) => {
    if (typeof url !== "string" || url.length > 2_200_000) throw new Error(`VALIDATION:${path} is invalid.`);
    if (url && !url.startsWith("data:image/") && !url.startsWith("https://") && !url.startsWith("http://") && !url.startsWith("/")) throw new Error(`VALIDATION:${path} is invalid.`);
    return url;
  };
  return Object.fromEntries(entries.map(([key, item]) => {
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(key)) throw new Error("VALIDATION:media contains an invalid slot.");
    if (Array.isArray(item)) {
      if (item.length > 10) throw new Error(`VALIDATION:media.${key} has too many images.`);
      return [key, item.map((url, index) => cleanUrl(url, `media.${key}.${index}`))];
    }
    return [key, cleanUrl(item, `media.${key}`)];
  }));
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
  if (patch.map_url !== undefined) {
    const value = String(patch.map_url).trim();
    if (value.length > 1000) throw new Error("VALIDATION:Map URL must be at most 1000 characters.");
    if (value) {
      try {
        const url = new URL(value);
        if (!["http:", "https:"].includes(url.protocol)) throw new Error();
      } catch {
        throw new Error("VALIDATION:Map URL must be a valid http or https URL.");
      }
    }
    themeConfig.content.mapUrl = value;
    appliedFields.push("map_url");
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
  if (patch.content !== undefined) {
    if (!patch.content || typeof patch.content !== "object" || Array.isArray(patch.content)) throw new Error("VALIDATION:content must be an object.");
    const sanitized = sanitizeContent(patch.content);
    themeConfig.content = mergeContent(themeConfig.content, sanitized);
    appliedFields.push(...Object.keys(sanitized).map((key) => `content.${key}`));
  }
  if (patch.media !== undefined) {
    themeConfig.media = sanitizeMedia(patch.media);
    appliedFields.push(...Object.keys(themeConfig.media).map((key) => `media.${key}`));
  }

  return { themeConfig, topLevel, appliedFields };
};
