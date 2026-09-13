import type { DashboardLead } from "@/lib/lead-realtime";
import type { Listing } from "../types";
export type ChecklistSite = { business_name: string; headline: string; status: "draft" | "published"; theme_config?: { content?: Record<string, unknown>; media?: Record<string, string | string[]>; seo?: { canonical_url?: string } } };

export type ChecklistTarget = "site" | "content" | "images" | "listings" | "leads";
export type ChecklistItem = { id: string; complete: boolean; target: ChecklistTarget; count?: number };

const hasEnglish = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.every(hasEnglish);
  if (!value || typeof value !== "object") return true;
  const record = value as Record<string, unknown>;
  if (typeof record.tr === "string" && record.tr.trim()) return typeof record.en === "string" && Boolean(record.en.trim());
  return Object.values(record).every(hasEnglish);
};

export function buildOverviewChecklist(site: ChecklistSite, listings: Listing[], leads: DashboardLead[], imageKeys: string[], now = Date.now()) {
  const content = site.theme_config?.content || {};
  const media = site.theme_config?.media || {};
  const missingSiteImages = imageKeys.filter((key) => { const value = media[key.replace(/^media\./, "")]; return Array.isArray(value) ? value.length === 0 : !value; }).length;
  const listingsWithoutPhotos = listings.filter((listing) => !listing.media?.length).length;
  const recentLeads = leads.filter((lead) => now - new Date(lead.created_at).getTime() <= 7 * 24 * 60 * 60 * 1000).length;
  const uncontactedLeads = leads.filter((lead) => !lead.contacted_at).length;
  const canonical = site.theme_config?.seo?.canonical_url || "";
  const items: ChecklistItem[] = [
    { id: "profile", complete: [site.business_name, site.headline, content.phone, content.email, content.address].every((value) => typeof value === "string" && value.trim()), target: "site" },
    { id: "photos", complete: missingSiteImages + listingsWithoutPhotos === 0, target: missingSiteImages ? "images" : "listings", count: missingSiteImages + listingsWithoutPhotos },
    { id: "english", complete: hasEnglish(content), target: "content" },
    { id: "leads", complete: uncontactedLeads === 0, target: "leads", count: uncontactedLeads },
    { id: "publish", complete: site.status === "published", target: "site" },
    { id: "domain", complete: /^https:\/\//i.test(canonical), target: "site" },
    { id: "maps", complete: typeof content.mapUrl === "string" && /^https?:\/\//i.test(content.mapUrl), target: "site" },
  ];
  const completed = items.filter((item) => item.complete).length;
  return { items, recentLeads, uncontactedLeads, completed, percentage: Math.round((completed / items.length) * 100) };
}
