import type { SiteLocale } from "./site-locale";

export type LocalizedText = { tr: string; en?: string };
export type StoredContentValue = string | LocalizedText | StoredContentRecord | StoredContentValue[] | null | undefined;
export type StoredContentRecord = { [key: string]: StoredContentValue };

export const isLocalizedText = (value: unknown): value is LocalizedText => Boolean(
  value && typeof value === "object" && !Array.isArray(value) && typeof (value as LocalizedText).tr === "string",
);

export function resolveStoredContent<T = unknown>(value: unknown, locale: SiteLocale): T {
  if (isLocalizedText(value)) return (locale === "en" && value.en?.trim() ? value.en : value.tr) as T;
  if (Array.isArray(value)) return value.map((item) => resolveStoredContent(item, locale)) as T;
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, resolveStoredContent(item, locale)]),
  ) as T;
  return value as T;
}

export const translatableRootFields = new Set([
  "eyebrow", "headline", "headlineAccent", "bio", "featuredEyebrow", "featuredTitle", "categoriesEyebrow", "categoriesTitle",
  "tourTitle", "tourDescription", "tagline", "showcaseEyebrow", "showcaseTitle", "whyEyebrow", "whyTitle",
  "testimonialQuote", "testimonialAuthor", "testimonialRole", "listingsTitle", "listingsDescription", "findHomeTitle", "findHomeDescription",
  "neighborhoodsTitle", "neighborhoodsDescription", "featuredStripTitle", "aboutTitle", "aboutDescription", "investmentWhyTitle",
  "dealsSectionTitle", "dealsSectionDescription", "matchEyebrow", "matchTitle", "matchDescription", "matchResultsTitle", "matchResultsDescription",
  "guideTitle", "guideQuote", "servicesTitle", "servicesDescription", "teamTitle", "teamDescription", "processTitle",
]);
const translatableNestedFields: Record<string, Set<string>> = {
  stats: new Set(["label"]),
  whyItems: new Set(["title", "description"]),
  neighborhoods: new Set(["description"]),
  teamMembers: new Set(["role", "bio"]),
  services: new Set(["title", "description"]),
  processSteps: new Set(["title", "description"]),
};

export function isTranslatableContentPath(parts: string[]) {
  if (parts.length === 1) return translatableRootFields.has(parts[0]);
  const root = parts[0];
  if ((root === "feelings" || root === "timings") && parts.length === 2) return true;
  return Boolean(translatableNestedFields[root]?.has(parts.at(-1) || ""));
}

export function contentNeedsEnglishBackfill(content: unknown) {
  if (!content || typeof content !== "object") return false;
  const record = content as Record<string, unknown>;
  const missing = (value: unknown) => typeof value === "string" ? Boolean(value.trim()) : isLocalizedText(value) && !value.en?.trim();
  if ([...translatableRootFields].some((key) => missing(record[key]))) return true;
  if (["feelings", "timings"].some((key) => Array.isArray(record[key]) && (record[key] as unknown[]).some(missing))) return true;
  return Object.entries(translatableNestedFields).some(([key, fields]) => Array.isArray(record[key]) && (record[key] as unknown[]).some((item) => (
    item && typeof item === "object" && [...fields].some((field) => missing((item as Record<string, unknown>)[field]))
  )));
}

export function countMissingEnglish(content: unknown) {
  if (!content || typeof content !== "object") return 0;
  const record = content as Record<string, unknown>;
  const missing = (value: unknown) => typeof value === "string" ? Number(Boolean(value.trim())) : isLocalizedText(value) ? Number(!value.en?.trim()) : 0;
  let count = [...translatableRootFields].reduce((total, key) => total + missing(record[key]), 0);
  for (const key of ["feelings", "timings"]) if (Array.isArray(record[key])) count += (record[key] as unknown[]).reduce((total, item) => total + missing(item), 0);
  for (const [key, fields] of Object.entries(translatableNestedFields)) if (Array.isArray(record[key])) count += (record[key] as unknown[]).reduce((total, item) => total + (item && typeof item === "object" ? [...fields].reduce((sum, field) => sum + missing((item as Record<string, unknown>)[field]), 0) : 0), 0);
  return count;
}

export function materializeTranslatableContent(defaults: Record<string, unknown>, stored: StoredContentRecord) {
  const next = structuredClone(stored || {});
  for (const key of translatableRootFields) if (next[key] === undefined && typeof defaults[key] === "string") next[key] = defaults[key] as string;
  for (const key of ["stats", "whyItems", "neighborhoods", "teamMembers", "services", "processSteps", "feelings", "timings"]) {
    if (next[key] === undefined && Array.isArray(defaults[key]) && defaults[key].length) next[key] = structuredClone(defaults[key]) as StoredContentValue[];
  }
  return next;
}
