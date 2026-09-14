import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Check, ChevronDown, Download, Globe, Home, Lock, Pencil, Plus, RefreshCw, Search, Trash2, Users } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { readApiJson } from "@/lib/api";
import { trackExperimentEvent } from "@/lib/experiment";
import { getAgentImage, getListingImage } from "@/templates/mediaFallbacks";
import { GoogleFontStylesheet } from "@/templates/GoogleFontStylesheet";
import { useAuth } from "./auth";
import type { Listing, ListingDraft, SeoConfig, TeamMember } from "./types";
import { formatListingLocation } from "./listing-location";
import { formatListingPrice } from "@/lib/listing-price";
import { ListingForm, Shell } from "./views";
import { LocationHierarchyFields } from "./location-fields";
import { useTranslation } from "react-i18next";
import { loadTemplateFamily } from "@/templates/registry";
import { materializeTranslatableContent } from "@/templates/content-localization";
import { templateContentFallbacks, type TemplateFamily } from "@/templates/types";
import { ContentEditor, type ContentRecord } from "./content-editor";
import { ImageEditor, type SiteMedia } from "./image-editor";
import { uploadImage } from "@/lib/media-storage";
import { ListingManagementRow, OverviewMetric as Metric } from "./dashboard/sections";
import { applyLeadRealtimeChange, LEAD_FALLBACK_INTERVAL_MS, type DashboardLead } from "@/lib/lead-realtime";
import { supabase } from "@/lib/supabase";
import { LeadNotificationSettings } from "./dashboard/LeadNotificationSettings";
import { AnalyticsPanel } from "./dashboard/AnalyticsPanel";
import { OverviewChecklist } from "./dashboard/OverviewChecklist";
import { TemplateSwitcher, type SwitchableTemplateId } from "./dashboard/TemplateSwitcher";
import { PublishQualityDialog } from "./dashboard/PublishQualityDialog";
import { LeadMiniCrm } from "./dashboard/LeadMiniCrm";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardQueryKeys, dashboardRequest } from "@/lib/dashboard-query";
import { HelpCenter } from "./dashboard/HelpCenter";
import { WorkspaceMembers } from "./dashboard/WorkspaceMembers";

type DashboardTab = "overview" | "analytics" | "site" | "content" | "images" | "listings" | "leads";
type SettingsSection = "general" | "contact" | "design" | "team" | "publishing" | "language-seo" | "advanced";

const settingsSections: SettingsSection[] = ["general", "contact", "design", "team", "publishing", "language-seo", "advanced"];
const settingsSectionLabels = {
  tr: { general: "Genel", contact: "İletişim ve lokasyon", design: "Tasarım", team: "Ekip", publishing: "Yayın ve domain", "language-seo": "Dil ve SEO", advanced: "Gelişmiş" },
  en: { general: "General", contact: "Contact and location", design: "Design", team: "Team", publishing: "Publishing and domain", "language-seo": "Language and SEO", advanced: "Advanced" },
} satisfies Record<"tr" | "en", Record<SettingsSection, string>>;

export type DashboardSite = {
  id: string;
  workspace_id?: string | null;
  slug: string;
  business_name: string;
  tone: string;
  primary_color: string;
  accent_color: string;
  headline: string;
  theme_config: {
    template_id?: string;
    colors?: {
      background?: string;
      primary?: string;
      accent?: string;
      text?: string;
      buttonColorSource?: "accent" | "primary" | "custom";
      buttonColorCustom?: string;
    };
    fonts?: {
      heading?: string;
      body?: string;
      headingWeight?: number;
      headingItalic?: boolean;
      bodyWeight?: number;
      bodyItalic?: boolean;
    };
    content?: ContentRecord;
    media?: SiteMedia;
    layout?: Record<string, unknown>;
    seo?: SeoConfig;
    selection_context?: {
      template_id: string;
      audience: string;
      region: string;
      reason: { tr: string; en?: string };
    };
    layout_fine_tune?: {
      buttonStyle?: "solid" | "outline" | "pill" | "sharp";
      navAlignment?: "left" | "center" | "split";
      spacingDensity?: "compact" | "comfortable" | "spacious";
      cardStyle?: "flat" | "shadow" | "bordered";
      headingScale?: "modest" | "bold";
    };
  };
  can_undo: boolean;
  country_id?: string | null;
  province_id?: string | null;
  district_id?: string | null;
  neighborhood_id?: string | null;
  status: "draft" | "published";
  draft_revision: number;
  published_version: number;
  published_at: string | null;
  show_closed_listings: boolean;
  show_team_section: boolean;
  team_section_label: string | null;
  created_at: string;
};

type SiteDraft = {
  business_name: string;
  headline: string;
  tone: string;
  phone: string;
  email: string;
  address: string;
  region_focus: string;
  map_url: string;
  country_id: string | null;
  province_id: string | null;
  district_id: string | null;
  neighborhood_id: string | null;
  primary_color: string;
  accent_color: string;
  heading_font: string;
  body_font: string;
  heading_weight: number;
  heading_italic: boolean;
  body_weight: number;
  body_italic: boolean;
  buttonColorSource: "accent" | "primary" | "custom";
  buttonColorCustom: string;
  seo: SeoConfig;
};

export type GoogleFont = { family: string; variants: string[] };
type TeamDraft = {
  id?: string;
  name: string;
  role: string;
  bio: string;
  photo_url: string;
};
const blankTeamMember = (): TeamDraft => ({
  name: "",
  role: "",
  bio: "",
  photo_url: "",
});

const variantWeight = (variant: string) => Number.parseInt(variant, 10) || 400;
const weightsFor = (font: GoogleFont | undefined, italic: boolean) => {
  if (!font) return [400];
  const weights = font.variants.filter((variant) => (italic ? variant === "italic" || variant.endsWith("italic") : variant === "regular" || /^\d+$/.test(variant))).map(variantWeight);
  return [...new Set(weights)].sort((a, b) => a - b);
};
const closestWeight = (weights: number[], target: number) => weights.reduce((best, weight) => (Math.abs(weight - target) < Math.abs(best - target) ? weight : best), weights[0] || 400);
const familyName = (family: string) =>
  family
    .split(",")[0]
    .trim()
    .replace(/^['"]|['"]$/g, "");

const previewStylesheetUrl = (fonts: GoogleFont[]) => {
  const families = fonts.map((font) => {
    const normalWeights = weightsFor(font, false);
    const italicWeights = weightsFor(font, true);
    if (normalWeights.length) return `family=${encodeURIComponent(font.family).replace(/%20/g, "+")}:wght@${closestWeight(normalWeights, 400)}`;
    return `family=${encodeURIComponent(font.family).replace(/%20/g, "+")}:ital,wght@1,${closestWeight(italicWeights, 400)}`;
  });
  return families.length ? `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap` : "";
};

function FontFamilyPicker({ id, fonts, family, disabled, onSelect }: { id: string; fonts: GoogleFont[]; family: string; disabled: boolean; onSelect: (font: GoogleFont) => void }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [scrollTop, setScrollTop] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const selectedName = familyName(family);
  const filteredFonts = useMemo(() => {
    const locale = i18n.resolvedLanguage === "en" ? "en-US" : "tr-TR";
    const normalized = query.trim().toLocaleLowerCase(locale);
    return fonts.filter((font) => !normalized || font.family.toLocaleLowerCase(locale).includes(normalized));
  }, [fonts, i18n.resolvedLanguage, query]);
  const rowHeight = 68;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 2);
  const visibleFonts = filteredFonts.slice(startIndex, startIndex + 10);

  useEffect(() => {
    setScrollTop(0);
    if (list.current) list.current.scrollTop = 0;
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={root} className="relative mt-2">
      {open && visibleFonts.length ? <link rel="stylesheet" href={previewStylesheetUrl(visibleFonts)} /> : null}
      <button id={id} type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex h-11 w-full items-center justify-between rounded-md border bg-white px-3 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50">
        <span className="truncate" style={{ fontFamily: family }}>
          {selectedName || t("dashboard.fonts.select")}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border bg-white shadow-xl">
          <div className="border-b p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("dashboard.fonts.search")} className="pl-9" />
            </div>
          </div>
          <div ref={list} role="listbox" aria-labelledby={id} onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)} className="h-72 overflow-y-auto p-1">
            <div className="relative" style={{ height: filteredFonts.length * rowHeight }}>
              {visibleFonts.map((font, visibleIndex) => {
                const selected = font.family === selectedName;
                const previewWeight = closestWeight(weightsFor(font, false).length ? weightsFor(font, false) : weightsFor(font, true), 400);
                return (
                  <button
                    key={font.family}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onSelect(font);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn("absolute left-0 flex w-full items-center gap-3 rounded-lg px-3 text-left hover:bg-[#f2f0e9]", selected && "bg-[#edf1eb]")}
                    style={{
                      height: rowHeight,
                      top: (startIndex + visibleIndex) * rowHeight,
                    }}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs text-slate-500">{font.family}</span>
                      <span
                        className="mt-1 block truncate text-lg"
                        style={{
                          fontFamily: `'${font.family}'`,
                          fontWeight: previewWeight,
                        }}
                      >
                        {t("dashboard.fonts.sample")}
                      </span>
                    </span>
                    {selected ? <Check className="h-4 w-4 shrink-0 text-[#173f32]" /> : null}
                  </button>
                );
              })}
            </div>
            {!filteredFonts.length ? <p className="p-5 text-center text-sm text-slate-500">{t("dashboard.fonts.noResults")}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FontControl({ id, label, fonts, family, weight, italic, disabled, onChange }: { id: string; label: string; fonts: GoogleFont[]; family: string; weight: number; italic: boolean; disabled: boolean; onChange: (change: { family?: string; weight?: number; italic?: boolean }) => void }) {
  const { t } = useTranslation();
  const selected = fonts.find((font) => font.family === family);
  const resolvedSelected = selected || fonts.find((font) => font.family === familyName(family));
  const availableWeights = weightsFor(resolvedSelected, italic);
  const italicWeights = weightsFor(resolvedSelected, true);
  const canItalic = Boolean(resolvedSelected && resolvedSelected.variants.some((variant) => variant.includes("italic")));
  return (
    <div className="rounded-xl border bg-white p-4">
      <Label htmlFor={`${id}-family`}>{label}</Label>
      <FontFamilyPicker
        id={`${id}-family`}
        fonts={fonts}
        family={family}
        disabled={disabled}
        onSelect={(font) => {
          const nextFamily = font.family;
          const nextItalic = italic && font.variants.some((variant) => variant.includes("italic"));
          const nextWeights = weightsFor(font, nextItalic);
          onChange({
            family: nextFamily,
            italic: nextItalic,
            weight: closestWeight(nextWeights, weight),
          });
        }}
      />
      <div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-3">
        <div>
          <Label htmlFor={`${id}-weight`}>{t("dashboard.fonts.weight")}</Label>
          <Select disabled={disabled || !resolvedSelected} value={String(availableWeights.includes(weight) ? weight : closestWeight(availableWeights, weight))} onValueChange={(value) => onChange({ weight: Number(value) })}>
            <SelectTrigger id={`${id}-weight`} className="mt-2 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableWeights.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  <span
                    style={{
                      fontFamily: family,
                      fontWeight: option,
                      fontStyle: italic ? "italic" : "normal",
                    }}
                  >
                    {t(`dashboard.fonts.weights.${option}`, {
                      defaultValue: `${t("dashboard.fonts.weight")} ${option}`,
                    })}{" "}
                    ({option}) — {t("dashboard.fonts.sampleLabel")}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm">
          <input
            type="checkbox"
            checked={italic && canItalic}
            disabled={disabled || !canItalic}
            onChange={(event) => {
              const nextItalic = event.target.checked;
              const nextWeights = nextItalic ? italicWeights : weightsFor(resolvedSelected, false);
              onChange({
                italic: nextItalic,
                weight: closestWeight(nextWeights, weight),
              });
            }}
          />{" "}
          {t("dashboard.fonts.italic")}
        </label>
      </div>
    </div>
  );
}

const blankListing = (siteId: string, district = ""): ListingDraft & { id?: string } => ({
  site_id: siteId,
  title: "",
  description: "",
  price: 0,
  currency: "TRY",
  m2: 0,
  room_count: "2+1",
  listing_type: "sale",
  property_category: "konut",
  property_subtype: "daire",
  district,
  country_id: null,
  province_id: null,
  district_id: null,
  neighborhood_id: null,
  lat: 41,
  lng: 29,
  media: [],
  status: "active",
  listing_status: "active",
  features: [],
  seo: { title: {}, description: {}, robots_index: true },
  rental_yield_percent: null,
  roi_notes: null,
  investment_metrics: {},
});

const siteDraftFrom = (site: DashboardSite): SiteDraft => ({
  business_name: site.business_name,
  headline: site.headline,
  tone: site.tone || "",
  phone: String(site.theme_config?.content?.phone || ""),
  email: String(site.theme_config?.content?.email || ""),
  address: String(site.theme_config?.content?.address || ""),
  region_focus: String(site.theme_config?.content?.regionFocus || ""),
  map_url: String(site.theme_config?.content?.mapUrl || ""),
  country_id: site.country_id || null,
  province_id: site.province_id || null,
  district_id: site.district_id || null,
  neighborhood_id: site.neighborhood_id || null,
  primary_color: site.theme_config?.colors?.primary || site.primary_color,
  accent_color: site.theme_config?.colors?.accent || site.accent_color,
  heading_font: site.theme_config?.fonts?.heading || "Manrope, Inter, Arial, sans-serif",
  body_font: site.theme_config?.fonts?.body || "Inter, Arial, sans-serif",
  heading_weight: site.theme_config?.fonts?.headingWeight || 400,
  heading_italic: site.theme_config?.fonts?.headingItalic === true,
  body_weight: site.theme_config?.fonts?.bodyWeight || 400,
  body_italic: site.theme_config?.fonts?.bodyItalic === true,
  buttonColorSource: site.theme_config?.colors?.buttonColorSource || "accent",
  buttonColorCustom: site.theme_config?.colors?.buttonColorCustom || site.accent_color,
  seo: site.theme_config?.seo || {
    title: {},
    description: {},
    robots_index: true,
  },
});

const themeFields = ["primary_color", "accent_color", "heading_font", "body_font", "heading_weight", "heading_italic", "body_weight", "body_italic", "buttonColorSource", "buttonColorCustom"] as const;

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { session, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSiteId = searchParams.get("site") || "";
  const requestedSettingsSection = searchParams.get("settings");
  const activeSettingsSection: SettingsSection = settingsSections.includes(requestedSettingsSection as SettingsSection) ? (requestedSettingsSection as SettingsSection) : "general";
  const [teamDraft, setTeamDraft] = useState<TeamDraft>(blankTeamMember);
  const [teamLabel, setTeamLabel] = useState("");
  const [savingTeam, setSavingTeam] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [selectedSiteId, setSelectedSiteId] = useState(requestedSiteId);
  const [draft, setDraft] = useState<ListingDraft & { id?: string }>(() => blankListing(""));
  const [siteDraft, setSiteDraft] = useState<SiteDraft | null>(null);
  const [contentDraft, setContentDraft] = useState<ContentRecord>({});
  const [persistedContent, setPersistedContent] = useState<ContentRecord>({});
  const [mediaDraft, setMediaDraft] = useState<SiteMedia>({});
  const [persistedMedia, setPersistedMedia] = useState<SiteMedia>({});
  const [savingListing, setSavingListing] = useState(false);
  const [updatingListingStatusId, setUpdatingListingStatusId] = useState("");
  const [savingSite, setSavingSite] = useState(false);
  const [publishQualityOpen, setPublishQualityOpen] = useState(false);
  const [draftSaveState, setDraftSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [translatingContent, setTranslatingContent] = useState(false);
  const [openingPaywall, setOpeningPaywall] = useState(false);
  const [refineRequest, setRefineRequest] = useState("");
  const [refining, setRefining] = useState(false);
  const [refineNote, setRefineNote] = useState<string | null>(null);
  const [refineFields, setRefineFields] = useState<string[]>([]);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [templateFamily, setTemplateFamily] = useState<TemplateFamily | null>(null);
  const siteDraftSiteId = useRef("");
  const contentDraftSiteId = useRef("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const authHeaders = useMemo(() => (session ? { Authorization: `Bearer ${session.access_token}` } : {}), [session]);
  const userId = user?.id || "";
  const sitesQuery = useQuery({
    queryKey: dashboardQueryKeys.sites(userId),
    enabled: Boolean(session && userId),
    queryFn: ({ signal }) => dashboardRequest<{ sites?: DashboardSite[]; plan?: "free" | "pro" }>("/api/sites", authHeaders, signal),
  });
  const sites = useMemo(() => sitesQuery.data?.sites || [], [sitesQuery.data?.sites]);
  const plan = sitesQuery.data?.plan === "pro" ? "pro" : "free";
  const loading = sitesQuery.isLoading;
  const activeSite = sites.find((site) => site.id === selectedSiteId) || sites[0] || null;
  const leadsQuery = useQuery({
    queryKey: dashboardQueryKeys.leads(userId),
    enabled: Boolean(session && userId),
    queryFn: ({ signal }) => dashboardRequest<{ leads?: DashboardLead[] }>("/api/leads", authHeaders, signal),
  });
  const leads = useMemo(() => leadsQuery.data?.leads || [], [leadsQuery.data?.leads]);
  const listingsQuery = useQuery({
    queryKey: dashboardQueryKeys.listings(activeSite?.id || ""),
    enabled: Boolean(session && activeSite),
    queryFn: ({ signal }) => dashboardRequest<{ listings?: Listing[] }>(`/api/sites/${activeSite!.id}/listings`, authHeaders, signal),
  });
  const listings = useMemo(() => listingsQuery.data?.listings || [], [listingsQuery.data?.listings]);
  const teamQuery = useQuery({
    queryKey: dashboardQueryKeys.team(activeSite?.id || ""),
    enabled: Boolean(session && activeSite),
    queryFn: ({ signal }) => dashboardRequest<{ team_members?: TeamMember[] }>(`/api/sites/${activeSite!.id}/team-members`, authHeaders, signal),
  });
  const teamMembers = useMemo(() => teamQuery.data?.team_members || [], [teamQuery.data?.team_members]);
  const fontsQuery = useQuery({
    queryKey: dashboardQueryKeys.fonts,
    enabled: Boolean(session),
    queryFn: ({ signal }) => dashboardRequest<{ fonts?: GoogleFont[] }>("/api/fonts", authHeaders, signal),
    staleTime: 60 * 60_000,
  });
  const fonts = useMemo(() => fontsQuery.data?.fonts || [], [fontsQuery.data?.fonts]);
  const fontsLoading = fontsQuery.isLoading;
  const fontsError = fontsQuery.error instanceof Error ? fontsQuery.error.message : "";
  const adminQuery = useQuery({
    queryKey: dashboardQueryKeys.adminAccess(userId),
    enabled: Boolean(session && userId),
    retry: false,
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/admin/platform-content?locale=tr", {
        headers: authHeaders,
        signal,
      });
      return response.ok;
    },
  });
  const isAdmin = adminQuery.data === true;
  const setSites = useCallback(
    (update: (current: DashboardSite[]) => DashboardSite[]) => {
      queryClient.setQueryData<{
        sites?: DashboardSite[];
        plan?: "free" | "pro";
      }>(dashboardQueryKeys.sites(userId), (current) => ({
        ...current,
        sites: update(current?.sites || []),
      }));
    },
    [queryClient, userId],
  );
  const setListings = useCallback(
    (update: (current: Listing[]) => Listing[]) => {
      if (!activeSite) return;
      queryClient.setQueryData<{ listings?: Listing[] }>(dashboardQueryKeys.listings(activeSite.id), (current) => ({
        ...current,
        listings: update(current?.listings || []),
      }));
    },
    [activeSite, queryClient],
  );
  const setTeamMembers = useCallback(
    (update: (current: TeamMember[]) => TeamMember[]) => {
      if (!activeSite) return;
      queryClient.setQueryData<{ team_members?: TeamMember[] }>(dashboardQueryKeys.team(activeSite.id), (current) => ({
        ...current,
        team_members: update(current?.team_members || []),
      }));
    },
    [activeSite, queryClient],
  );
  const setLeads = useCallback(
    (update: (current: DashboardLead[]) => DashboardLead[]) => {
      queryClient.setQueryData<{ leads?: DashboardLead[] }>(dashboardQueryKeys.leads(userId), (current) => ({ ...current, leads: update(current?.leads || []) }));
    },
    [queryClient, userId],
  );
  const loadLeads = useCallback(async () => {
    await queryClient.refetchQueries({
      queryKey: dashboardQueryKeys.leads(userId),
      exact: true,
    });
  }, [queryClient, userId]);
  const markLeadContacted = async (lead: DashboardLead) => {
    const contactedAt = lead.contacted_at ? null : new Date().toISOString();
    try {
      const payload = await dashboardRequest<{ lead: DashboardLead }>("/api/leads", authHeaders, undefined, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, contacted_at: contactedAt }),
      });
      setLeads((current) => current.map((item) => (item.id === lead.id ? payload.lead : item)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("dashboard.leads.statusError"));
    }
  };
  const updateLeadCrm = async (lead: DashboardLead, changes: Record<string, unknown>) => {
    try {
      const payload = await dashboardRequest<{ lead: DashboardLead }>("/api/leads", authHeaders, undefined, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, ...changes }),
      });
      setLeads((current) => current.map((item) => (item.id === lead.id ? { ...item, ...payload.lead } : item)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("dashboard.leads.statusError"));
    }
  };
  const mergeLeads = async (primary: DashboardLead, duplicateId: string) => {
    try {
      const payload = await dashboardRequest<{
        lead: DashboardLead;
        deleted_id: string;
      }>("/api/leads", authHeaders, undefined, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: primary.id,
          duplicate_id: duplicateId,
          action: "merge",
        }),
      });
      setLeads((current) => current.filter((item) => item.id !== payload.deleted_id).map((item) => (item.id === primary.id ? { ...item, ...payload.lead } : item)));
      toast.success(t("dashboard.leads.merged"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("dashboard.leads.statusError"));
    }
  };
  const activeTemplateId = activeSite?.theme_config?.template_id;
  const siteLeads = leads.filter((lead) => lead.site_id === activeSite?.id);
  const persistedSiteDraft = activeSite ? siteDraftFrom(activeSite) : null;
  const themeDirty = Boolean(siteDraft && persistedSiteDraft && themeFields.some((field) => siteDraft[field] !== persistedSiteDraft[field]));

  useEffect(() => {
    if (activeTab !== "site" || !requestedSettingsSection || !settingsSections.includes(requestedSettingsSection as SettingsSection)) return;
    window.requestAnimationFrame(() => document.getElementById(`settings-${requestedSettingsSection}`)?.focus());
  }, [activeTab, requestedSettingsSection]);
  const contentSchema = templateFamily?.contentSchema || [];
  const imageSchema = templateFamily?.imageSchema || [];
  const contentDirty = JSON.stringify(contentDraft) !== JSON.stringify(persistedContent);
  const mediaDirty = JSON.stringify(mediaDraft) !== JSON.stringify(persistedMedia);

  useEffect(() => {
    if (!activeSite) {
      setTemplateFamily(null);
      return;
    }
    let active = true;
    void loadTemplateFamily(activeTemplateId).then((family) => {
      if (active) setTemplateFamily(family);
    });
    return () => {
      active = false;
    };
  }, [activeSite, activeTemplateId]);

  useEffect(() => {
    if (sitesQuery.error) toast.error(sitesQuery.error instanceof Error ? sitesQuery.error.message : t("dashboard.errors.load"));
  }, [sitesQuery.error, t]);

  useEffect(() => {
    if (!sites.length) return;
    setSelectedSiteId((current) => (sites.some((site) => site.id === requestedSiteId) ? requestedSiteId : sites.some((site) => site.id === current) ? current : sites[0].id));
  }, [requestedSiteId, sites]);

  useEffect(() => {
    if (!activeSite || !session) {
      setSiteDraft(null);
      setContentDraft({});
      setPersistedContent({});
      siteDraftSiteId.current = "";
      contentDraftSiteId.current = "";
      return;
    }
    setTeamDraft(blankTeamMember());
    setTeamLabel(activeSite.team_section_label || "");
    setDraft(blankListing(activeSite.id));
    if (siteDraftSiteId.current !== activeSite.id) {
      siteDraftSiteId.current = activeSite.id;
      setSiteDraft(siteDraftFrom(activeSite));
    }
    if (contentDraftSiteId.current !== activeSite.id) {
      contentDraftSiteId.current = activeSite.id;
      const stored = structuredClone(activeSite.theme_config?.content || {}) as ContentRecord;
      const content = materializeTranslatableContent(templateContentFallbacks(activeSite.theme_config?.template_id) as unknown as Record<string, unknown>, stored) as ContentRecord;
      setContentDraft(content);
      setPersistedContent(content);
      const media = structuredClone(activeSite.theme_config?.media || {}) as SiteMedia;
      setMediaDraft(media);
      setPersistedMedia(media);
    }
  }, [activeSite, session]);

  useEffect(() => {
    if (!session) return;
    let disposed = false;
    let fallbackTimer: number | undefined;
    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      void loadLeads().catch((error) => console.warn("[leads-realtime] refresh failed", error));
    };
    const stopFallback = () => {
      if (fallbackTimer !== undefined) window.clearInterval(fallbackTimer);
      fallbackTimer = undefined;
    };
    const startFallback = () => {
      if (disposed || fallbackTimer !== undefined) return;
      fallbackTimer = window.setInterval(refresh, LEAD_FALLBACK_INTERVAL_MS);
      refresh();
    };

    void supabase.realtime.setAuth(session.access_token);
    const channel = supabase
      .channel(`dashboard-leads:${session.user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, (payload) => {
        setLeads((current) => applyLeadRealtimeChange(current, payload));
      })
      .subscribe((status) => {
        if (disposed) return;
        if (status === "SUBSCRIBED") {
          stopFallback();
          refresh();
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") startFallback();
      });

    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => {
      disposed = true;
      stopFallback();
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      void supabase.removeChannel(channel);
    };
  }, [loadLeads, session, setLeads]);

  const selectSite = (siteId: string) => {
    siteDraftSiteId.current = "";
    contentDraftSiteId.current = "";
    setSelectedSiteId(siteId);
    setSearchParams({ site: siteId });
  };

  const openPaywall = async (context: "listing_limit" | "branding_removal" | "lead_export") => {
    if (!session || openingPaywall) return;
    setOpeningPaywall(true);
    try {
      await trackExperimentEvent(session.access_token, "paywall_view", context);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("dashboard.errors.paywall"));
    } finally {
      navigate(`/pricing?context=${context}`);
      setOpeningPaywall(false);
    }
  };

  const startNewListing = () => {
    if (!activeSite) return;
    const activeCount = listings.filter((listing) => listing.status === "active" && listing.listing_status === "active").length;
    if (plan === "free" && activeCount >= 5) {
      void openPaywall("listing_limit");
      return;
    }
    setDraft(blankListing(activeSite.id));
    setActiveTab("listings");
  };

  const saveListing = async () => {
    if (!session || !activeSite) return;
    setSavingListing(true);
    try {
      const editing = Boolean(draft.id);
      const response = await fetch(editing ? `/api/listings/${draft.id}` : `/api/sites/${activeSite.id}/listings`, {
        method: editing ? "PATCH" : "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload = await readApiJson<{
        error?: string;
        code?: string;
        listing: Listing;
      }>(response);
      if (!response.ok && payload.code === "FREE_LISTING_LIMIT") {
        await openPaywall("listing_limit");
        return;
      }
      if (!response.ok) throw new Error(payload.error || t("dashboard.listings.saveError"));
      setListings((current) => (editing ? current.map((item) => (item.id === payload.listing.id ? payload.listing : item)) : [payload.listing, ...current]));
      setDraft({ ...payload.listing });
      toast.success(t(editing ? "dashboard.listings.updated" : "dashboard.listings.created"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("dashboard.listings.saveError"));
    } finally {
      setSavingListing(false);
    }
  };

  const generateListingCopy = async () => {
    if (!session) throw new Error(t("dashboard.errors.copyAuth"));
    const response = await fetch("/api/listings/generate-copy", {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const payload = await readApiJson<{
      error?: string;
      platform_style?: string;
      seo_style?: string;
    }>(response);
    if (!response.ok) throw new Error(payload.error || t("dashboard.listingForm.copyError"));
    if (!payload.platform_style || !payload.seo_style) throw new Error(t("dashboard.errors.copyVariants"));
    return {
      platform_style: payload.platform_style,
      seo_style: payload.seo_style,
    };
  };

  const loadSocialKit = async (format: "post" | "story") => {
    if (!session || !draft.id) throw new Error(t("dashboard.errors.socialSaveFirst"));
    const response = await fetch(`/api/listings/${draft.id}/social-kit?format=${format}`, { headers: authHeaders });
    if (!response.ok) {
      const payload = await readApiJson<{ error?: string }>(response);
      throw new Error(payload.error || t("dashboard.listingForm.socialError"));
    }
    if (!(response.headers.get("content-type") || "").includes("image/png")) throw new Error(t("dashboard.errors.socialInvalid"));
    return response.blob();
  };

  const removeListing = async () => {
    if (!session || !activeSite || !draft.id || !window.confirm(t("dashboard.listings.deleteConfirm"))) return;
    try {
      const response = await fetch(`/api/listings/${draft.id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      const payload = await readApiJson<{ error?: string; deleted?: boolean }>(response);
      if (!response.ok) throw new Error(payload.error || t("dashboard.listings.deleteError"));
      setListings((current) => current.filter((item) => item.id !== draft.id));
      setDraft(blankListing(activeSite.id));
      toast.success(t("dashboard.listings.deleted"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("dashboard.listings.deleteError"));
    }
  };

  const toggleListingAvailability = async (listing: Listing) => {
    if (!session) return;
    const nextStatus = listing.listing_status === "active" ? (listing.listing_type === "sale" ? "sold" : "rented") : "active";
    setUpdatingListingStatusId(listing.id);
    try {
      const response = await fetch(`/api/listings/${listing.id}`, {
        method: "PATCH",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ listing_status: nextStatus }),
      });
      const payload = await readApiJson<{ error?: string; listing?: Listing }>(response);
      if (!response.ok || !payload.listing) throw new Error(payload.error || t("dashboard.listings.statusError"));
      setListings((current) => current.map((item) => (item.id === payload.listing!.id ? payload.listing! : item)));
      setDraft((current) => (current.id === payload.listing!.id ? { ...payload.listing! } : current));
      toast.success(t(nextStatus === "active" ? "dashboard.listings.reopened" : nextStatus === "sold" ? "dashboard.listings.markedSold" : "dashboard.listings.markedRented"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("dashboard.listings.statusError"));
    } finally {
      setUpdatingListingStatusId("");
    }
  };

  const patchSite = async (changes: Record<string, unknown>, success: string, notify = true) => {
    if (!session || !activeSite) return false;
    setSavingSite(true);
    try {
      const response = await fetch(`/api/sites/${activeSite.id}`, {
        method: "PATCH",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          ...changes,
          expected_revision: activeSite.draft_revision,
        }),
      });
      const payload = await readApiJson<{
        error?: string;
        site: DashboardSite;
      }>(response);
      if (!response.ok) throw new Error(payload.error || t("dashboard.site.saveError"));
      setSites((current) => current.map((site) => (site.id === payload.site.id ? payload.site : site)));
      setSiteDraft(siteDraftFrom(payload.site));
      if (notify) toast.success(success);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("dashboard.site.saveError"));
      return false;
    } finally {
      setSavingSite(false);
    }
  };

  const saveIdentity = () =>
    siteDraft &&
    patchSite(
      {
        business_name: siteDraft.business_name,
        headline: siteDraft.headline,
        tone: siteDraft.tone,
        phone: siteDraft.phone,
        email: siteDraft.email,
        address: siteDraft.address,
        region_focus: siteDraft.region_focus,
        map_url: siteDraft.map_url,
        country_id: siteDraft.country_id,
        province_id: siteDraft.province_id,
        district_id: siteDraft.district_id,
        neighborhood_id: siteDraft.neighborhood_id,
      },
      t("dashboard.site.saved"),
    );
  const publishSite = async () => {
    if (!session || !activeSite) return;
    setSavingSite(true);
    try {
      const response = await fetch(`/api/sites/${activeSite.id}/publish`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ expected_revision: activeSite.draft_revision }),
      });
      const payload = await readApiJson<{
        error?: string;
        site?: DashboardSite;
      }>(response);
      if (!response.ok || !payload.site) throw new Error(payload.error || t("dashboard.site.saveError"));
      setSites((current) => current.map((site) => (site.id === payload.site!.id ? payload.site! : site)));
      toast.success(t("dashboard.site.published"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("dashboard.site.saveError"));
    } finally {
      setSavingSite(false);
    }
  };
  const togglePublication = () => setPublishQualityOpen(true);
  const toggleClosedListings = () => activeSite && patchSite({ show_closed_listings: !activeSite.show_closed_listings }, t(!activeSite.show_closed_listings ? "dashboard.site.closedListingsShown" : "dashboard.site.closedListingsHidden"));
  const toggleTeamSection = () => activeSite && patchSite({ show_team_section: !activeSite.show_team_section }, t(!activeSite.show_team_section ? "dashboard.team.shown" : "dashboard.team.hidden"));
  const saveTeamLabel = () => patchSite({ team_section_label: teamLabel.trim() || null }, t("dashboard.team.labelSaved"));

  useEffect(() => {
    if (!siteDraft || !persistedSiteDraft || savingSite || JSON.stringify(siteDraft) === JSON.stringify(persistedSiteDraft)) return;
    setDraftSaveState("saving");
    const timer = window.setTimeout(() => {
      void patchSite(siteDraft, "", false).then((saved) => setDraftSaveState(saved ? "saved" : "idle"));
    }, 900);
    return () => window.clearTimeout(timer);
    // activeSite is the persisted baseline; patchSite is intentionally excluded to keep the debounce stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSite, savingSite, siteDraft]);

  const saveTeamMember = async () => {
    if (!session || !activeSite || !teamDraft.name.trim() || !teamDraft.role.trim()) return;
    setSavingTeam(true);
    try {
      const editing = Boolean(teamDraft.id);
      const response = await fetch(editing ? `/api/team-members/${teamDraft.id}` : `/api/sites/${activeSite.id}/team-members`, {
        method: editing ? "PATCH" : "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          ...teamDraft,
          sort_order: editing ? undefined : teamMembers.length,
        }),
      });
      const payload = await readApiJson<{
        error?: string;
        team_member?: TeamMember;
      }>(response);
      if (!response.ok || !payload.team_member) throw new Error(payload.error || t("dashboard.team.saveError"));
      setTeamMembers((current) => (editing ? current.map((member) => (member.id === payload.team_member!.id ? payload.team_member! : member)) : [...current, payload.team_member!]));
      setTeamDraft(blankTeamMember());
      toast.success(t(editing ? "dashboard.team.updated" : "dashboard.team.added"));
      setPreviewVersion((value) => value + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("dashboard.team.saveError"));
    } finally {
      setSavingTeam(false);
    }
  };

  const deleteTeamMember = async (member: TeamMember) => {
    if (!session || !window.confirm(t("dashboard.team.deleteConfirm"))) return;
    const response = await fetch(`/api/team-members/${member.id}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    const payload = await readApiJson<{ error?: string }>(response);
    if (!response.ok) return toast.error(payload.error || t("dashboard.team.deleteError"));
    setTeamMembers((current) => current.filter((item) => item.id !== member.id));
    if (teamDraft.id === member.id) setTeamDraft(blankTeamMember());
    toast.success(t("dashboard.team.deleted"));
    setPreviewVersion((value) => value + 1);
  };

  const moveTeamMember = async (index: number, direction: -1 | 1) => {
    const otherIndex = index + direction;
    if (!session || otherIndex < 0 || otherIndex >= teamMembers.length) return;
    const next = [...teamMembers];
    [next[index], next[otherIndex]] = [next[otherIndex], next[index]];
    setTeamMembers(next);
    try {
      await Promise.all(
        [next[index], next[otherIndex]].map((member, orderIndex) =>
          fetch(`/api/team-members/${member.id}`, {
            method: "PATCH",
            headers: { ...authHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({
              sort_order: orderIndex === 0 ? index : otherIndex,
            }),
          }).then(async (response) => {
            if (!response.ok) throw new Error((await readApiJson<{ error?: string }>(response)).error);
          }),
        ),
      );
      setPreviewVersion((value) => value + 1);
    } catch {
      setTeamMembers(teamMembers);
      toast.error(t("dashboard.team.reorderError"));
    }
  };

  const loadTeamPhoto = async (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return toast.error(t("dashboard.teamPhoto.type"));
    if (file.size > 1_500_000) return toast.error(t("dashboard.teamPhoto.tooLarge"));
    if (!activeSite) return;
    try {
      const uploaded = await uploadImage(file, activeSite.id, "team");
      setTeamDraft((current) => ({ ...current, photo_url: uploaded.url }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("dashboard.teamPhoto.invalid"));
    }
  };

  const saveThemeSettings = async () => {
    if (!siteDraft) return;
    const saved = await patchSite(
      {
        primary_color: siteDraft.primary_color,
        accent_color: siteDraft.accent_color,
        buttonColorSource: siteDraft.buttonColorSource,
        buttonColorCustom: siteDraft.buttonColorCustom,
        heading_font: siteDraft.heading_font,
        heading_weight: siteDraft.heading_weight,
        heading_italic: siteDraft.heading_italic,
        body_font: siteDraft.body_font,
        body_weight: siteDraft.body_weight,
        body_italic: siteDraft.body_italic,
      },
      t("dashboard.theme.saved"),
    );
    if (saved) setPreviewVersion((value) => value + 1);
  };

  const switchTemplate = async (templateId: SwitchableTemplateId) => {
    const saved = await patchSite({ template_id: templateId }, t("dashboard.templateSwitch.saved"));
    if (saved) setPreviewVersion((value) => value + 1);
    return saved;
  };
  const undoTemplateSwitch = async () => {
    const saved = await patchSite({ restore_previous_template: true }, t("dashboard.templateSwitch.saved"));
    if (saved) setPreviewVersion((value) => value + 1);
  };

  const saveContent = async () => {
    const saved = await patchSite({ content: contentDraft }, t("dashboard.content.saved"));
    if (saved) {
      setPersistedContent(structuredClone(contentDraft));
      setPreviewVersion((value) => value + 1);
    }
  };

  const translateMissingContent = async () => {
    if (!session || !activeSite || translatingContent) return;
    setTranslatingContent(true);
    try {
      const saveResponse = await fetch(`/api/sites/${activeSite.id}`, {
        method: "PATCH",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ content: contentDraft }),
      });
      const savedPayload = await readApiJson<{
        error?: string;
        site?: DashboardSite;
      }>(saveResponse);
      if (!saveResponse.ok || !savedPayload.site) throw new Error(savedPayload.error || t("dashboard.site.saveError"));
      let translatedContent: ContentRecord | undefined;
      for (let attempt = 0; attempt < 30; attempt += 1) {
        const response = await fetch(`/api/sites/${activeSite.id}/content-backfill`, { method: "POST", headers: authHeaders });
        const payload = await readApiJson<{
          error?: string;
          theme_config?: DashboardSite["theme_config"];
        }>(response);
        if (response.ok && payload.theme_config?.content) {
          translatedContent = payload.theme_config.content;
          break;
        }
        if (response.status !== 202) throw new Error(payload.error || t("dashboard.content.translateError"));
        await new Promise((resolve) => window.setTimeout(resolve, 500));
      }
      if (!translatedContent) throw new Error(t("dashboard.content.translateTimeout"));
      const nextContent = structuredClone(translatedContent);
      setContentDraft(nextContent);
      setPersistedContent(nextContent);
      setSites((current) =>
        current.map((site) =>
          site.id === activeSite.id
            ? {
                ...site,
                theme_config: { ...site.theme_config, content: nextContent },
              }
            : site,
        ),
      );
      setPreviewVersion((value) => value + 1);
      toast.success(t("dashboard.content.translateSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("dashboard.content.translateError"));
    } finally {
      setTranslatingContent(false);
    }
  };

  const saveMedia = async () => {
    const saved = await patchSite({ media: mediaDraft }, t("dashboard.images.saved"));
    if (saved) {
      setPersistedMedia(structuredClone(mediaDraft));
      setPreviewVersion((value) => value + 1);
    }
  };

  const resetThemeSettings = () => {
    if (!siteDraft || !persistedSiteDraft) return;
    const next = { ...siteDraft };
    themeFields.forEach((field) => {
      next[field] = persistedSiteDraft[field] as never;
    });
    setSiteDraft(next);
  };

  const updateFont = (kind: "heading" | "body", change: { family?: string; weight?: number; italic?: boolean }) => {
    if (!siteDraft) return;
    const familyKey = `${kind}_font` as "heading_font" | "body_font";
    const weightKey = `${kind}_weight` as "heading_weight" | "body_weight";
    const italicKey = `${kind}_italic` as "heading_italic" | "body_italic";
    const next = { ...siteDraft };
    if (change.family !== undefined) next[familyKey] = change.family;
    if (change.weight !== undefined) next[weightKey] = change.weight;
    if (change.italic !== undefined) next[italicKey] = change.italic;
    setSiteDraft(next);
  };

  const refineSite = async (undo = false) => {
    if (!session || !activeSite || (!undo && refineRequest.trim().length < 3)) return;
    setRefining(true);
    setRefineNote(null);
    try {
      const response = await fetch(`/api/sites/${activeSite.id}/refine`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(undo ? { action: "undo" } : { request: refineRequest.trim() }),
      });
      const payload = await readApiJson<{
        error?: string;
        site?: DashboardSite;
        unsupported_note?: string | null;
        applied_fields?: string[];
      }>(response);
      if (!response.ok || !payload.site) throw new Error(payload.error || t("dashboard.refine.error"));
      setSites((current) => current.map((site) => (site.id === payload.site!.id ? payload.site! : site)));
      setSiteDraft(siteDraftFrom(payload.site));
      setRefineNote(payload.unsupported_note || null);
      setRefineFields(payload.applied_fields || []);
      setPreviewVersion((value) => value + 1);
      if (!undo && payload.applied_fields?.length) setRefineRequest("");
      toast.success(t(undo ? "dashboard.refine.undone" : payload.applied_fields?.length ? "dashboard.refine.applied" : "dashboard.refine.noChange"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("dashboard.refine.error"));
    } finally {
      setRefining(false);
    }
  };

  const saleCount = listings.filter((listing) => listing.listing_type === "sale").length;
  const rentCount = listings.filter((listing) => listing.listing_type === "rent").length;
  const settingsLocale = i18n.resolvedLanguage === "en" ? "en" : "tr";
  const selectSettingsSection = (section: SettingsSection) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("settings", section);
      return next;
    }, { replace: true });
    window.requestAnimationFrame(() => document.getElementById(`settings-${section}`)?.focus());
  };

  return (
    <Shell
      businessName={activeSite?.business_name || ""}
      activeSection={activeTab}
      onSectionChange={setActiveTab}
      leadCount={siteLeads.length}
      isAdmin={isAdmin}
      actions={
        <div className="flex items-center gap-2">
          {activeSite ? (
            <Button variant="outline" asChild className="rounded-full border-[#173f32]/10 bg-white">
              <a href={`/site/${activeSite.slug}`} target="_blank" rel="noreferrer">
                <Globe className="mr-2 h-4 w-4" />
                {t("dashboard.header.openSite")}
              </a>
            </Button>
          ) : null}
          <Button variant="outline" size="icon" title={t("dashboard.header.refresh")} onClick={() => void loadLeads()} className="rounded-full border-[#173f32]/10 bg-white">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      }
    >
      {siteDraft ? (
        <GoogleFontStylesheet
          fonts={{
            heading: siteDraft.heading_font,
            body: siteDraft.body_font,
            headingWeight: siteDraft.heading_weight,
            headingItalic: siteDraft.heading_italic,
            bodyWeight: siteDraft.body_weight,
            bodyItalic: siteDraft.body_italic,
          }}
        />
      ) : null}
      {activeSite ? (
        <div role="status" aria-live="polite" className="text-right text-xs text-[#69756e]">
          {savingSite || draftSaveState === "saving" ? t("common.saving") : draftSaveState === "saved" ? t("dashboard.content.savedState") : null}
        </div>
      ) : null}
      <div className="space-y-7">
        {activeSite && activeTab === "analytics" ? <AnalyticsPanel siteId={activeSite.id} authHeaders={authHeaders} listings={listings} /> : null}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm text-[#78827c]">{activeSite ? `${activeSite.business_name} · ${t(activeSite.status === "published" ? "common.published" : "common.draft")}` : loading ? t("dashboard.header.loadingSites") : t("dashboard.header.noSite")}</div>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              {t("dashboard.header.hello")}
              {user?.email ? `, ${user.email.split("@")[0]}` : ""}.
            </h1>
            <p className="mt-2 text-sm text-[#69756e]">{t("dashboard.header.subtitle")}</p>
          </div>
          {activeSite ? (
            <div className="flex gap-2">
              <Select value={activeSite.id} onValueChange={selectSite}>
                <SelectTrigger className="w-[220px] rounded-full bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.business_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={startNewListing} className="rounded-full bg-[#d86f45] text-white">
                <Plus className="mr-2 h-4 w-4" />
                {t("dashboard.header.newListing")}
              </Button>
            </div>
          ) : null}
        </div>

        {!activeSite && !loading ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-[#69756e]">{t("dashboard.empty.body")}</CardContent>
          </Card>
        ) : null}
        {activeSite && activeTab === "leads" ? <LeadMiniCrm leads={siteLeads} listingTitles={new Map(listings.map((listing) => [listing.id, listing.title]))} loading={leadsQuery.isLoading} onUpdate={updateLeadCrm} onMerge={mergeLeads} /> : null}

        {activeSite && activeTab === "overview" ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label={t("dashboard.overview.listings")} value={String(listings.length)} />
              <Metric label={t("common.sale")} value={String(saleCount)} />
              <Metric label={t("common.rent")} value={String(rentCount)} />
              <Metric label={t("dashboard.overview.leads")} value={String(siteLeads.length)} />
            </div>
            <OverviewChecklist site={activeSite} listings={listings} leads={siteLeads} imageKeys={imageSchema.map((slot) => slot.key)} loading={listingsQuery.isLoading || leadsQuery.isLoading || teamQuery.isLoading} error={Boolean(listingsQuery.error || leadsQuery.error || teamQuery.error)} onNavigate={setActiveTab} />
            <div className="grid gap-6 xl:grid-cols-[1.4fr_.6fr]">
              <Card className="rounded-[2rem] border-[#173f32]/10 bg-[#fbfaf7] shadow-none">
                <CardHeader className="flex-row items-center justify-between">
                  <div>
                    <CardTitle>{t("dashboard.overview.recent")}</CardTitle>
                    <CardDescription>{t("dashboard.overview.recentBody")}</CardDescription>
                  </div>
                  <Button variant="ghost" onClick={() => setActiveTab("listings")}>
                    {t("dashboard.overview.all")} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  {listings.slice(0, 3).map((listing) => (
                    <button
                      key={listing.id}
                      onClick={() => {
                        setDraft({ ...listing });
                        setActiveTab("listings");
                      }}
                      className="overflow-hidden rounded-2xl border bg-white text-left"
                    >
                      <img src={getListingImage(listing)} alt={listing.title} className="aspect-[4/3] w-full object-cover" />
                      <div className="p-4">
                        <div className="truncate font-semibold">{listing.title}</div>
                        <div className="mt-1 text-xs text-[#7a857e]">
                          {formatListingLocation(listing)} · {listing.room_count} · {listing.m2} m²
                        </div>
                        <div className="mt-3 font-semibold">{formatListingPrice(listing)}</div>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
              <Card className="rounded-[2rem] border-0 bg-[#173f32] text-white">
                <CardContent className="p-7">
                  <Badge className="bg-white/15 text-white">{t(activeSite.status === "published" ? "common.published" : "common.draft")}</Badge>
                  <h2 className="mt-8 text-3xl font-semibold">{activeSite.business_name}</h2>
                  <p className="mt-3 text-sm text-white/60">/site/{activeSite.slug}</p>
                  <Button onClick={togglePublication} disabled={savingSite} className="mt-7 w-full rounded-full bg-white text-[#173f32]">
                    {t(activeSite.status === "published" ? "dashboard.site.unpublish" : "dashboard.site.publish")}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}

        {activeSite && activeTab === "listings" ? (
          <div className="grid gap-6 xl:grid-cols-[1fr_.9fr]">
            <Card className="rounded-[2rem] border-[#173f32]/10 bg-[#fbfaf7] shadow-none">
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>{t("dashboard.listings.title")}</CardTitle>
                  <CardDescription>
                    {t("dashboard.listings.description", {
                      count: listings.length,
                    })}
                  </CardDescription>
                </div>
                <Button onClick={startNewListing} disabled={openingPaywall} className="rounded-full">
                  <Plus className="mr-2 h-4 w-4" />
                  {t("dashboard.listings.new")}
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {listings.map((listing) => (
                  <ListingManagementRow key={listing.id} listing={listing} selected={draft.id === listing.id} updating={updatingListingStatusId === listing.id} onSelect={() => setDraft({ ...listing })} onToggle={() => void toggleListingAvailability(listing)} />
                ))}
              </CardContent>
            </Card>
            <ListingForm siteId={activeSite.id} draft={draft} onDraftChange={(patch) => setDraft((current) => ({ ...current, ...patch }))} onSave={() => void saveListing()} isSaving={savingListing} onGenerate={generateListingCopy} onLoadSocialKit={loadSocialKit} onReset={() => setDraft(blankListing(activeSite.id))} onDelete={() => void removeListing()} />
          </div>
        ) : null}

        {activeSite && activeTab === "leads" ? <LeadNotificationSettings userId={userId} authHeaders={authHeaders} leads={siteLeads} /> : null}

        {activeSite && activeTab === "content" ? <ContentEditor schema={contentSchema} content={contentDraft} previewUrl={`/site/${activeSite.slug}?previewSiteId=${activeSite.id}`} previewVersion={previewVersion} onChange={setContentDraft} onSave={() => void saveContent()} onTranslateMissing={() => void translateMissingContent()} saving={savingSite} translating={translatingContent} dirty={contentDirty} /> : null}

        {activeSite && activeTab === "images" ? <ImageEditor siteId={activeSite.id} schema={imageSchema} media={mediaDraft} previewUrl={`/site/${activeSite.slug}?previewSiteId=${activeSite.id}`} previewVersion={previewVersion} onChange={setMediaDraft} onSave={() => void saveMedia()} saving={savingSite} dirty={mediaDirty} /> : null}

        {activeSite && activeTab === "site" && siteDraft ? (
          <div className="grid gap-6 xl:grid-cols-2">
            <nav aria-label={t("dashboard.settings.sectionsLabel")} className="sticky top-2 z-20 -mx-1 flex gap-2 overflow-x-auto rounded-2xl border bg-white/95 p-2 shadow-sm backdrop-blur xl:col-span-2">
              {settingsSections.map((section) => <Button key={section} type="button" size="sm" variant={activeSettingsSection === section ? "default" : "ghost"} className="shrink-0 rounded-full" aria-current={activeSettingsSection === section ? "page" : undefined} onClick={() => selectSettingsSection(section)}>{settingsSectionLabels[settingsLocale][section]}</Button>)}
            </nav>
            <TemplateSwitcher siteId={activeSite.id} slug={activeSite.slug} currentTemplateId={activeTemplateId} selectionContext={activeSite.theme_config.selection_context} canUndo={activeSite.can_undo} saving={savingSite || refining} onApply={switchTemplate} onUndo={undoTemplateSwitch} />
            <Card className="rounded-[2rem] border-[#173f32]/10 bg-[#fbfaf7]">
              <CardHeader>
                <CardTitle>{t("dashboard.site.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <section id="settings-general" tabIndex={-1} aria-labelledby="settings-general-title" className="space-y-4 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#173f32]">
                  <h3 id="settings-general-title" className="text-lg font-semibold text-[#173f32]">{settingsSectionLabels[settingsLocale].general}</h3>
                <div>
                  <Label>{t("dashboard.site.businessName")}</Label>
                  <Input
                    value={siteDraft.business_name}
                    onChange={(e) =>
                      setSiteDraft({
                        ...siteDraft,
                        business_name: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>{t("dashboard.site.headline")}</Label>
                  <Input value={siteDraft.headline} onChange={(e) => setSiteDraft({ ...siteDraft, headline: e.target.value })} />
                </div>
                <div>
                  <Label>{t("dashboard.site.shortDescription")}</Label>
                  <Textarea value={siteDraft.tone} onChange={(e) => setSiteDraft({ ...siteDraft, tone: e.target.value })} />
                </div>
                </section>
                <section id="settings-contact" tabIndex={-1} aria-labelledby="settings-contact-title" className="space-y-4 rounded-2xl border-t pt-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#173f32]">
                  <h3 id="settings-contact-title" className="text-lg font-semibold text-[#173f32]">{settingsSectionLabels[settingsLocale].contact}</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>{t("dashboard.site.phone")}</Label>
                    <Input value={siteDraft.phone} onChange={(e) => setSiteDraft({ ...siteDraft, phone: e.target.value })} />
                  </div>
                  <div>
                    <Label>{t("dashboard.site.email")}</Label>
                    <Input type="email" value={siteDraft.email} onChange={(e) => setSiteDraft({ ...siteDraft, email: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>{t("dashboard.site.address")}</Label>
                  <Input value={siteDraft.address} onChange={(e) => setSiteDraft({ ...siteDraft, address: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="site-map-url">{t("dashboard.site.mapUrl")}</Label>
                  <Input id="site-map-url" type="url" inputMode="url" placeholder="https://maps.app.goo.gl/..." value={siteDraft.map_url} onChange={(e) => setSiteDraft({ ...siteDraft, map_url: e.target.value })} />
                  <p className="mt-1 text-xs text-[#69756e]">{t("dashboard.site.mapUrlHelp")}</p>
                </div>
                <div>
                  <Label>{t("dashboard.site.region")}</Label>
                  <p className="mt-1 text-xs text-[#69756e]">{t("dashboard.site.regionHelp")}</p>
                </div>
                <LocationHierarchyFields
                  idPrefix="site-region"
                  value={siteDraft}
                  onChange={(selection, names) =>
                    setSiteDraft({
                      ...siteDraft,
                      ...selection,
                      region_focus: [names.neighborhood, names.district, names.province].filter(Boolean).join(", "),
                    })
                  }
                />
                </section>
                <section id="settings-language-seo" tabIndex={-1} aria-labelledby="settings-language-seo-title" className="space-y-3 rounded-2xl border bg-white p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#173f32]">
                  <h3 id="settings-language-seo-title" className="text-lg font-semibold text-[#173f32]">{settingsSectionLabels[settingsLocale]["language-seo"]}</h3>
                  <div className="font-semibold">{t("dashboard.seo.siteTitle")}</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>{t("dashboard.seo.titleTr")}</Label>
                      <Input
                        maxLength={70}
                        value={siteDraft.seo.title?.tr || ""}
                        onChange={(event) =>
                          setSiteDraft({
                            ...siteDraft,
                            seo: {
                              ...siteDraft.seo,
                              title: {
                                ...siteDraft.seo.title,
                                tr: event.target.value,
                              },
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>{t("dashboard.seo.titleEn")}</Label>
                      <Input
                        maxLength={70}
                        value={siteDraft.seo.title?.en || ""}
                        onChange={(event) =>
                          setSiteDraft({
                            ...siteDraft,
                            seo: {
                              ...siteDraft.seo,
                              title: {
                                ...siteDraft.seo.title,
                                en: event.target.value,
                              },
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>{t("dashboard.seo.descriptionTr")}</Label>
                      <Textarea
                        maxLength={170}
                        value={siteDraft.seo.description?.tr || ""}
                        onChange={(event) =>
                          setSiteDraft({
                            ...siteDraft,
                            seo: {
                              ...siteDraft.seo,
                              description: {
                                ...siteDraft.seo.description,
                                tr: event.target.value,
                              },
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>{t("dashboard.seo.descriptionEn")}</Label>
                      <Textarea
                        maxLength={170}
                        value={siteDraft.seo.description?.en || ""}
                        onChange={(event) =>
                          setSiteDraft({
                            ...siteDraft,
                            seo: {
                              ...siteDraft.seo,
                              description: {
                                ...siteDraft.seo.description,
                                en: event.target.value,
                              },
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label>{t("dashboard.seo.ogImage")}</Label>
                    <Input
                      type="url"
                      value={siteDraft.seo.og_image || ""}
                      onChange={(event) =>
                        setSiteDraft({
                          ...siteDraft,
                          seo: {
                            ...siteDraft.seo,
                            og_image: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>{t("dashboard.seo.favicon")}</Label>
                    <Input
                      type="url"
                      value={siteDraft.seo.favicon || ""}
                      onChange={(event) =>
                        setSiteDraft({
                          ...siteDraft,
                          seo: {
                            ...siteDraft.seo,
                            favicon: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>{t("dashboard.seo.canonical")}</Label>
                    <Input
                      type="url"
                      value={siteDraft.seo.canonical_url || ""}
                      onChange={(event) =>
                        setSiteDraft({
                          ...siteDraft,
                          seo: {
                            ...siteDraft.seo,
                            canonical_url: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={siteDraft.seo.robots_index !== false}
                      onChange={(event) =>
                        setSiteDraft({
                          ...siteDraft,
                          seo: {
                            ...siteDraft.seo,
                            robots_index: event.target.checked,
                          },
                        })
                      }
                    />
                    {t("dashboard.seo.index")}
                  </label>
                </section>
                <section id="settings-publishing" tabIndex={-1} aria-labelledby="settings-publishing-title" className="space-y-4 rounded-2xl border-t pt-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#173f32]">
                  <h3 id="settings-publishing-title" className="text-lg font-semibold text-[#173f32]">{settingsSectionLabels[settingsLocale].publishing}</h3>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={saveIdentity} disabled={savingSite}>
                    {t("dashboard.site.save")}
                  </Button>
                  <Button variant="outline" onClick={togglePublication} disabled={savingSite}>
                    {t(activeSite.status === "published" ? "dashboard.site.unpublish" : "dashboard.site.publish")}
                  </Button>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-2xl border bg-white p-4">
                  <div>
                    <div className="font-semibold">{t("dashboard.site.showClosedListings")}</div>
                    <p className="mt-1 text-xs text-slate-500">{t("dashboard.site.showClosedListingsDescription")}</p>
                  </div>
                  <button type="button" role="switch" aria-checked={activeSite.show_closed_listings} aria-label={t("dashboard.site.showClosedListings")} disabled={savingSite} onClick={() => void toggleClosedListings()} className={cn("h-7 w-12 shrink-0 rounded-full p-1 transition", activeSite.show_closed_listings ? "bg-[#173f32]" : "bg-slate-200")}>
                    <span className={cn("block h-5 w-5 rounded-full bg-white shadow transition-transform", activeSite.show_closed_listings && "translate-x-5")} />
                  </button>
                </div>
                <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border bg-white p-4">
                  <div>
                    <div className="flex items-center gap-2 font-semibold">
                      {t("dashboard.site.branding")} {plan === "free" ? <Lock className="h-3.5 w-3.5 text-slate-400" /> : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{t("dashboard.site.brandingDescription")}</p>
                  </div>
                  {plan === "free" ? (
                    <Button variant="outline" disabled={openingPaywall} onClick={() => void openPaywall("branding_removal")} className="shrink-0 rounded-full">
                      {t("dashboard.site.brandingFree")}
                    </Button>
                  ) : (
                    <button type="button" role="switch" aria-checked="false" aria-label={t("dashboard.site.branding")} className="h-7 w-12 rounded-full bg-slate-200 p-1">
                      <span className="block h-5 w-5 rounded-full bg-white shadow" />
                    </button>
                  )}
                </div>
                </section>
              </CardContent>
            </Card>
            <Card id="settings-team" tabIndex={-1} className="rounded-[2rem] border-[#173f32]/10 bg-[#fbfaf7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#173f32]">
              <CardHeader>
                <CardTitle>{t("dashboard.team.title")}</CardTitle>
                <CardDescription>{t("dashboard.team.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between gap-4 rounded-2xl border bg-white p-4">
                  <div>
                    <div className="font-semibold">{t("dashboard.team.show")}</div>
                    <p className="mt-1 text-xs text-slate-500">{t("dashboard.team.showDescription")}</p>
                  </div>
                  <button type="button" role="switch" aria-checked={activeSite.show_team_section} disabled={savingSite} onClick={() => void toggleTeamSection()} className={cn("h-7 w-12 shrink-0 rounded-full p-1 transition", activeSite.show_team_section ? "bg-[#173f32]" : "bg-slate-200")}>
                    <span className={cn("block h-5 w-5 rounded-full bg-white shadow transition-transform", activeSite.show_team_section && "translate-x-5")} />
                  </button>
                </div>
                <div>
                  <Label>{t("dashboard.team.label")}</Label>
                  <div className="mt-2 flex gap-2">
                    <Input value={teamLabel} onChange={(event) => setTeamLabel(event.target.value)} placeholder={t("dashboard.team.labelPlaceholder")} />
                    <Button variant="outline" onClick={() => void saveTeamLabel()} disabled={savingSite}>
                      {t("common.save")}
                    </Button>
                  </div>
                </div>
                <div className="space-y-3">
                  {teamMembers.map((member, index) => (
                    <div key={member.id} className="flex items-center gap-3 rounded-2xl border bg-white p-3">
                      <img src={getAgentImage(`${activeSite.id}-${member.id}`, member.photo_url)} alt={member.name} className="h-14 w-14 rounded-xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{member.name}</div>
                        <div className="truncate text-xs text-slate-500">{member.role}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button type="button" variant="ghost" size="icon" disabled={index === 0} onClick={() => void moveTeamMember(index, -1)} aria-label={t("dashboard.team.up")}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" disabled={index === teamMembers.length - 1} onClick={() => void moveTeamMember(index, 1)} aria-label={t("dashboard.team.down")}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setTeamDraft({
                              id: member.id,
                              name: member.name,
                              role: member.role,
                              bio: member.bio || "",
                              photo_url: member.photo_url || "",
                            })
                          }
                          aria-label={t("common.edit")}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={() => void deleteTeamMember(member)} aria-label={t("common.delete")}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-3 rounded-2xl border bg-white p-4">
                  <div className="font-semibold">{t(teamDraft.id ? "dashboard.team.editTitle" : "dashboard.team.addTitle")}</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>{t("dashboard.team.name")}</Label>
                      <Input
                        value={teamDraft.name}
                        onChange={(event) =>
                          setTeamDraft({
                            ...teamDraft,
                            name: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>{t("dashboard.team.role")}</Label>
                      <Input
                        value={teamDraft.role}
                        onChange={(event) =>
                          setTeamDraft({
                            ...teamDraft,
                            role: event.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label>{t("dashboard.team.bio")}</Label>
                    <Textarea value={teamDraft.bio} onChange={(event) => setTeamDraft({ ...teamDraft, bio: event.target.value })} />
                  </div>
                  <div>
                    <Label>{t("dashboard.team.photo")}</Label>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{t("dashboard.teamPhoto.help")}</p>
                    <Input type="file" accept="image/jpeg,image/png,image/webp" className="mt-2" onChange={(event) => loadTeamPhoto(event.target.files?.[0])} />
                  </div>
                  {teamDraft.photo_url ? <img src={teamDraft.photo_url} alt="" className="h-28 w-28 rounded-2xl object-cover" /> : null}
                  <div className="flex gap-2">
                    <Button onClick={() => void saveTeamMember()} disabled={savingTeam || !teamDraft.name.trim() || !teamDraft.role.trim()}>
                      {t(teamDraft.id ? "dashboard.team.save" : "dashboard.team.add")}
                    </Button>
                    {teamDraft.id ? (
                      <Button variant="outline" onClick={() => setTeamDraft(blankTeamMember())}>
                        {t("common.cancel")}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
            {import.meta.env.VITE_WORKSPACE_COLLABORATION_ENABLED === "true" && activeSite.workspace_id ? <WorkspaceMembers workspaceId={activeSite.workspace_id} authHeaders={authHeaders} /> : null}
            <Card id="settings-design" tabIndex={-1} className="rounded-[2rem] border-[#173f32]/10 bg-[#fbfaf7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#173f32]">
              <CardHeader>
                <CardTitle>{t("dashboard.theme.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("dashboard.theme.primary")}</Label>
                    <Input
                      type="color"
                      className="h-12 p-1"
                      value={siteDraft.primary_color}
                      onChange={(event) =>
                        setSiteDraft({
                          ...siteDraft,
                          primary_color: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>{t("dashboard.theme.accent")}</Label>
                    <Input
                      type="color"
                      className="h-12 p-1"
                      value={siteDraft.accent_color}
                      onChange={(event) =>
                        setSiteDraft({
                          ...siteDraft,
                          accent_color: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>{t("dashboard.theme.buttonColor")}</Label>
                  <Select value={siteDraft.buttonColorSource} onValueChange={(value: "accent" | "primary" | "custom") => setSiteDraft({ ...siteDraft, buttonColorSource: value })}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="accent">{t("dashboard.theme.buttonAccent")}</SelectItem>
                      <SelectItem value="primary">{t("dashboard.theme.buttonPrimary")}</SelectItem>
                      <SelectItem value="custom">{t("dashboard.theme.buttonCustom")}</SelectItem>
                    </SelectContent>
                  </Select>
                  {siteDraft.buttonColorSource === "custom" ? (
                    <div className="mt-3">
                      <Label>{t("dashboard.theme.customColor")}</Label>
                      <Input
                        type="color"
                        className="mt-2 h-12 p-1"
                        value={siteDraft.buttonColorCustom}
                        onChange={(event) =>
                          setSiteDraft({
                            ...siteDraft,
                            buttonColorCustom: event.target.value,
                          })
                        }
                      />
                    </div>
                  ) : null}
                </div>
                {fontsError ? (
                  <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    {fontsError}
                  </div>
                ) : null}
                {fontsLoading ? <p className="text-sm text-[#69756e]">{t("dashboard.theme.fontsLoading")}</p> : null}
                <FontControl id="heading" label={t("dashboard.theme.headingFont")} fonts={fonts} family={siteDraft.heading_font} weight={siteDraft.heading_weight} italic={siteDraft.heading_italic} disabled={fontsLoading || Boolean(fontsError)} onChange={(change) => updateFont("heading", change)} />
                <FontControl id="body" label={t("dashboard.theme.bodyFont")} fonts={fonts} family={siteDraft.body_font} weight={siteDraft.body_weight} italic={siteDraft.body_italic} disabled={fontsLoading || Boolean(fontsError)} onChange={(change) => updateFont("body", change)} />
                <div
                  className="rounded-2xl p-7 text-white"
                  style={{
                    background: `linear-gradient(135deg, ${siteDraft.primary_color}, ${siteDraft.accent_color})`,
                    fontFamily: siteDraft.body_font,
                    fontWeight: siteDraft.body_weight,
                    fontStyle: siteDraft.body_italic ? "italic" : "normal",
                  }}
                >
                  <div className="text-xs opacity-70">{t("dashboard.theme.preview")}</div>
                  <h3
                    className="mt-8 text-4xl"
                    style={{
                      fontFamily: siteDraft.heading_font,
                      fontWeight: siteDraft.heading_weight,
                      fontStyle: siteDraft.heading_italic ? "italic" : "normal",
                    }}
                  >
                    {siteDraft.headline}
                  </h3>
                  <span
                    className="mt-6 inline-flex rounded-lg px-4 py-2 text-xs font-semibold"
                    style={{
                      backgroundColor: siteDraft.buttonColorSource === "primary" ? siteDraft.primary_color : siteDraft.buttonColorSource === "custom" ? siteDraft.buttonColorCustom : siteDraft.accent_color,
                    }}
                  >
                    {t("dashboard.theme.sampleButton")}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={() => void saveThemeSettings()} disabled={savingSite || !themeDirty}>
                    {t(savingSite ? "common.saving" : "dashboard.theme.save")}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetThemeSettings} disabled={savingSite || !themeDirty}>
                    {t("dashboard.theme.cancel")}
                  </Button>
                  {themeDirty ? <span className="text-xs text-amber-700">{t("dashboard.theme.unsaved")}</span> : null}
                </div>
              </CardContent>
            </Card>
            <Card id="settings-advanced" tabIndex={-1} className="rounded-[2rem] border-[#173f32]/10 bg-[#fbfaf7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#173f32] xl:col-span-2">
              <CardHeader>
                <CardTitle>{t("dashboard.refine.title")}</CardTitle>
                <CardDescription>{t("dashboard.refine.description")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fine-tune-request">{t("dashboard.refine.requestLabel")}</Label>
                    <Textarea id="fine-tune-request" value={refineRequest} onChange={(event) => setRefineRequest(event.target.value)} maxLength={500} rows={5} placeholder={t("dashboard.refine.placeholder")} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void refineSite(false)} disabled={refining || refineRequest.trim().length < 3}>
                      {t(refining ? "dashboard.refine.applying" : "dashboard.refine.apply")}
                    </Button>
                    <Button variant="outline" onClick={() => void refineSite(true)} disabled={refining || !activeSite.can_undo}>
                      {t("dashboard.refine.undo")}
                    </Button>
                  </div>
                  {refineFields.length ? (
                    <div className="flex flex-wrap gap-2">
                      {refineFields.map((field) => (
                        <Badge key={field} variant="secondary">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  {refineNote ? (
                    <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                      <strong>{t("dashboard.refine.unsupported")}:</strong> {refineNote}
                    </div>
                  ) : null}
                  <p className="text-xs leading-5 text-[#69756e]">{t("dashboard.refine.undoHelp")}</p>
                </div>
                <div className="overflow-hidden rounded-2xl border bg-white">
                  <div className="border-b px-4 py-3 text-xs font-semibold text-[#69756e]">{t("dashboard.refine.preview")}</div>
                  <iframe key={`${activeSite.id}-${previewVersion}`} title={t("dashboard.refine.preview")} src={`/site/${activeSite.slug}?previewSiteId=${activeSite.id}`} className="h-[520px] w-full bg-white" />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
        {activeSite && siteDraft ? (
          <PublishQualityDialog
            open={publishQualityOpen}
            site={{
              ...activeSite,
              business_name: siteDraft.business_name,
              headline: siteDraft.headline,
              theme_config: {
                ...activeSite.theme_config,
                content: {
                  ...contentDraft,
                  phone: siteDraft.phone,
                  email: siteDraft.email,
                  address: siteDraft.address,
                  mapUrl: siteDraft.map_url,
                },
                media: mediaDraft,
                seo: siteDraft.seo,
              },
            }}
            listings={listings}
            imageKeys={imageSchema.map((slot) => slot.key)}
            unsaved={contentDirty || mediaDirty || themeDirty || draftSaveState === "saving"}
            publishing={savingSite}
            onClose={() => setPublishQualityOpen(false)}
            onNavigate={setActiveTab}
            onPublish={() => {
              setPublishQualityOpen(false);
              void publishSite();
            }}
          />
        ) : null}
        <HelpCenter siteId={activeSite?.id} activeSection={activeTab} authHeaders={authHeaders} />
      </div>
    </Shell>
  );
}
