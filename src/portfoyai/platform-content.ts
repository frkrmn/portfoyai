export type PlatformValue = string | PlatformContent | PlatformValue[];
export type PlatformContent = { [key: string]: PlatformValue; heroImageUrl?: string };

export const mergePlatformContent = (fallback: PlatformContent, stored?: PlatformContent | null): PlatformContent => {
  if (!stored) return structuredClone(fallback);
  const result: PlatformContent = structuredClone(fallback);
  for (const [key, value] of Object.entries(stored)) {
    result[key] = value && typeof value === "object" && !Array.isArray(value)
      ? mergePlatformContent((result[key] as PlatformContent) || {}, value as PlatformContent)
      : value;
  }
  return result;
};

export const setPlatformField = (content: PlatformContent, path: string, value: string): PlatformContent => {
  const next = structuredClone(content);
  const parts = path.split(".");
  let cursor: Record<string, unknown> = next;
  parts.slice(0, -1).forEach((part) => {
    if (!cursor[part] || typeof cursor[part] !== "object") cursor[part] = {};
    cursor = cursor[part] as Record<string, unknown>;
  });
  cursor[parts.at(-1)!] = value;
  return next;
};

export const platformTextFields = (content: PlatformContent, prefix = ""):
Array<{ path: string; value: string }> => Object.entries(content).flatMap(([key, value]) => {
  const path = prefix ? `${prefix}.${key}` : key;
  if (key === "heroImageUrl") return [];
  if (typeof value === "string") return [{ path, value }];
  if (value && typeof value === "object" && !Array.isArray(value)) return platformTextFields(value as PlatformContent, path);
  return [];
});
