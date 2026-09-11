import type { TemplateFamily } from "./types";

export const defaultTemplateId = "tm_01";
type TemplateModule = Record<string, unknown>;

const loaders: Record<string, () => Promise<TemplateModule>> = {
  "warm-editorial": () => import("./warm-editorial/WarmEditorialTemplate"),
  "bold-luxury": () => import("./bold-luxury/BoldLuxuryTemplate"),
  "clean-modern": () => import("./clean-modern/CleanModernTemplate"),
  "neighborhood-friendly": () => import("./neighborhood-friendly/NeighborhoodFriendlyTemplate"),
  "investment-focused": () => import("./investment-focused/InvestmentFocusedTemplate"),
  "urgent-deals": () => import("./urgent-deals/UrgentDealsTemplate"),
  "guided-match": () => import("./guided-match/GuidedMatchTemplate"),
  "land-plots": () => import("./land-plots/LandPlotsTemplate"),
};
const cache = new Map<string, Promise<TemplateFamily>>();
const normalizedId = (templateId?: string) => templateId && loaders[templateId] ? templateId : templateId?.startsWith("tm_") ? "legacy" : "warm-editorial";

const familyFrom = (id: string, module: TemplateModule): TemplateFamily => {
  const prefix = id.split("-").map((part) => `${part[0].toUpperCase()}${part.slice(1)}`).join("");
  return {
    Home: module[`${prefix}Home`] as TemplateFamily["Home"],
    Listings: module[`${prefix}Listings`] as TemplateFamily["Listings"],
    Detail: module[`${prefix}Detail`] as TemplateFamily["Detail"],
    contentSchema: module.contentSchema as TemplateFamily["contentSchema"],
    imageSchema: module.imageSchema as TemplateFamily["imageSchema"],
  };
};

export function loadTemplateFamily(templateId?: string): Promise<TemplateFamily> {
  const id = normalizedId(templateId);
  if (!cache.has(id)) cache.set(id, id === "legacy"
    ? Promise.all([import("./legacy/LegacyTemplate"), import("./warm-editorial/WarmEditorialTemplate")]).then(([legacy, warm]) => ({
      Home: legacy.LegacyHome, Listings: legacy.LegacyListings, Detail: legacy.LegacyDetail,
      contentSchema: warm.contentSchema, imageSchema: warm.imageSchema,
    }))
    : loaders[id]().then((module) => familyFrom(id, module)));
  return cache.get(id)!;
}
