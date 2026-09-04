const pairSchema = { type: "object", additionalProperties: false, properties: { tr: { type: "string" }, en: { type: "string" } }, required: ["tr", "en"] };
const rootFields = [
  "eyebrow", "headline", "headlineAccent", "bio", "featuredEyebrow", "featuredTitle", "categoriesEyebrow", "categoriesTitle", "tourTitle", "tourDescription", "tagline",
  "showcaseEyebrow", "showcaseTitle", "whyEyebrow", "whyTitle", "testimonialQuote", "testimonialAuthor", "testimonialRole", "listingsTitle", "listingsDescription",
  "findHomeTitle", "findHomeDescription", "neighborhoodsTitle", "neighborhoodsDescription", "featuredStripTitle", "aboutTitle", "aboutDescription", "investmentWhyTitle",
  "dealsSectionTitle", "dealsSectionDescription", "matchEyebrow", "matchTitle", "matchDescription", "matchResultsTitle", "matchResultsDescription", "guideTitle", "guideQuote",
  "servicesTitle", "servicesDescription", "teamTitle", "teamDescription", "processTitle",
];
const primitiveArrays = ["feelings", "timings"];
const objectArrays = { stats: ["label"], whyItems: ["title", "description"], neighborhoods: ["description"], teamMembers: ["role", "bio"], services: ["title", "description"], processSteps: ["title", "description"] };

export const localizedTurkish = (value) => typeof value === "string" ? value : value?.tr || "";
export const localizedMissingEnglish = (value) => Boolean(localizedTurkish(value).trim()) && !(value && typeof value === "object" && typeof value.en === "string" && value.en.trim());

export function needsContentEnglishBackfill(content) {
  if (!content || typeof content !== "object") return false;
  if (rootFields.some((field) => localizedMissingEnglish(content[field]))) return true;
  if (primitiveArrays.some((field) => Array.isArray(content[field]) && content[field].some(localizedMissingEnglish))) return true;
  return Object.entries(objectArrays).some(([field, keys]) => Array.isArray(content[field]) && content[field].some((item) => keys.some((key) => localizedMissingEnglish(item?.[key]))));
}

export function buildContentTranslationRequest(content) {
  const source = {};
  const properties = {};
  for (const field of rootFields) {
    if (!localizedMissingEnglish(content?.[field])) continue;
    source[field] = localizedTurkish(content[field]);
    properties[field] = pairSchema;
  }
  for (const field of primitiveArrays) {
    if (!Array.isArray(content?.[field]) || !content[field].some(localizedMissingEnglish)) continue;
    source[field] = content[field].map(localizedTurkish);
    properties[field] = { type: "array", minItems: content[field].length, maxItems: content[field].length, items: pairSchema };
  }
  for (const [field, keys] of Object.entries(objectArrays)) {
    if (!Array.isArray(content?.[field]) || !content[field].some((item) => keys.some((key) => localizedMissingEnglish(item?.[key])))) continue;
    source[field] = content[field].map((item) => Object.fromEntries(keys.map((key) => [key, localizedTurkish(item?.[key])] ))) ;
    properties[field] = {
      type: "array", minItems: content[field].length, maxItems: content[field].length,
      items: { type: "object", additionalProperties: false, properties: Object.fromEntries(keys.map((key) => [key, pairSchema])), required: keys },
    };
  }
  return {
    source,
    responseSchema: { type: "object", additionalProperties: false, properties: { content: { type: "object", additionalProperties: false, properties, required: Object.keys(properties) } }, required: ["content"] },
  };
}

const mergePair = (current, translated) => ({ tr: localizedTurkish(current) || localizedTurkish(translated), en: current?.en?.trim?.() || translated?.en || "" });

export function mergeTranslatedContent(content, translated) {
  const next = structuredClone(content || {});
  for (const field of rootFields) if (translated?.[field]) next[field] = mergePair(next[field], translated[field]);
  for (const field of primitiveArrays) if (Array.isArray(translated?.[field])) next[field] = (next[field] || []).map((item, index) => mergePair(item, translated[field][index]));
  for (const [field, keys] of Object.entries(objectArrays)) if (Array.isArray(translated?.[field])) next[field] = (next[field] || []).map((item, index) => {
    const merged = { ...item };
    for (const key of keys) if (translated[field][index]?.[key]) merged[key] = mergePair(item?.[key], translated[field][index][key]);
    return merged;
  });
  return next;
}

export const contentBackfillInstruction = "Adapt the supplied Turkish real-estate website copy into natural, polished English. Return both the original Turkish and the English adaptation for every field, preserve array order and meaning, and return only the requested JSON schema. Do not translate proper person or place names. English must sound native, not word-for-word.";
