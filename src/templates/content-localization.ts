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

const translatableRootFields = new Set(["headline", "bio", "tagline"]);
const translatableNestedFields: Record<string, Set<string>> = {
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
