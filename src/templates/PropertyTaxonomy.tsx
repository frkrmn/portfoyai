import type { Listing } from "@/portfoyai/types";
import type { TemplateConfig } from "./types";

export type PropertyTaxonomyFilter = "all" | "konut" | "konut:daire" | "konut:mustakil_ev" | "konut:villa" | "konut:rezidans" | "arsa" | "arsa:konut_imarli" | "arsa:ticari_imarli" | "arsa:tarla_tarimsal" | "arsa:villa_imarli" | "arsa:kentsel_donusum" | "isyeri";

export const propertyCategoryFor = (listing: Listing) => listing.property_category || "konut";
export const propertySubtypeFor = (listing: Listing) => propertyCategoryFor(listing) === "isyeri" ? null : (listing.property_subtype || (propertyCategoryFor(listing) === "arsa" ? "konut_imarli" : "daire"));

export function propertyTaxonomyLabel(config: TemplateConfig, listing: Listing) {
  const category = propertyCategoryFor(listing);
  if (category === "arsa") {
    const subtype = propertySubtypeFor(listing);
    const labels: Record<string, string> = { konut_imarli: config.content.residentialZonedLabel, ticari_imarli: config.content.commercialZonedLabel, tarla_tarimsal: config.content.agriculturalFieldLabel, villa_imarli: config.content.villaZonedLabel, kentsel_donusum: config.content.urbanRenewalLabel };
    return `${config.content.landLabel} · ${labels[subtype || ""] || config.content.residentialZonedLabel}`;
  }
  if (category === "isyeri") return config.content.commercialLabel;
  const subtype = propertySubtypeFor(listing);
  if (subtype === "mustakil_ev") return `${config.content.residentialLabel} · ${config.content.detachedHouseLabel}`;
  if (subtype === "villa") return `${config.content.residentialLabel} · ${config.content.villaLabel}`;
  if (subtype === "rezidans") return `${config.content.residentialLabel} · ${config.content.residenceLabel}`;
  return `${config.content.residentialLabel} · ${config.content.apartmentLabel}`;
}

export function matchesPropertyTaxonomy(listing: Listing, value: string) {
  if (!value || value === "all") return true;
  const [category, subtype] = value.split(":");
  return propertyCategoryFor(listing) === category && (!subtype || propertySubtypeFor(listing) === subtype);
}

export function PropertyTaxonomySelect({ config, value, onChange, className }: { config: TemplateConfig; value: string; onChange: (value: PropertyTaxonomyFilter) => void; className?: string }) {
  const c = config.content;
  return <select aria-label={c.propertyTypeLabel} className={className} value={value} onChange={(event) => onChange(event.target.value as PropertyTaxonomyFilter)}>
    <option value="all">{c.allPropertyTypesLabel}</option>
    <option value="konut">{c.residentialLabel}</option>
    <option value="konut:daire">{c.residentialLabel} · {c.apartmentLabel}</option>
    <option value="konut:mustakil_ev">{c.residentialLabel} · {c.detachedHouseLabel}</option>
    <option value="konut:villa">{c.residentialLabel} · {c.villaLabel}</option>
    <option value="konut:rezidans">{c.residentialLabel} · {c.residenceLabel}</option>
    <option value="arsa">{c.landLabel}</option>
    <option value="arsa:konut_imarli">{c.landLabel} · {c.residentialZonedLabel}</option>
    <option value="arsa:ticari_imarli">{c.landLabel} · {c.commercialZonedLabel}</option>
    <option value="arsa:tarla_tarimsal">{c.landLabel} · {c.agriculturalFieldLabel}</option>
    <option value="arsa:villa_imarli">{c.landLabel} · {c.villaZonedLabel}</option>
    <option value="arsa:kentsel_donusum">{c.landLabel} · {c.urbanRenewalLabel}</option>
    <option value="isyeri">{c.commercialLabel}</option>
  </select>;
}

export function PropertyTaxonomyBadge({ config, listing, className = "" }: { config: TemplateConfig; listing: Listing; className?: string }) {
  return <span data-property-category={propertyCategoryFor(listing)} data-property-subtype={propertySubtypeFor(listing) || undefined} className={className}>{propertyTaxonomyLabel(config, listing)}</span>;
}
