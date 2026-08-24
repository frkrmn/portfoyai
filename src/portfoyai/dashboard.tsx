import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Download, Globe, Home, Lock, Plus, RefreshCw, Users } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { getListingImage } from "@/templates/mediaFallbacks";
import { GoogleFontStylesheet } from "@/templates/GoogleFontStylesheet";
import { useAuth } from "./auth";
import { formatDateTR, formatTRY } from "./mock";
import type { Listing, ListingDraft } from "./types";
import { ListingForm, Shell } from "./views";

type DashboardTab = "overview" | "site" | "listings" | "leads";

type DashboardSite = {
  id: string;
  slug: string;
  business_name: string;
  tone: string;
  primary_color: string;
  accent_color: string;
  headline: string;
  theme_config: {
    template_id?: string;
    colors?: { background?: string; primary?: string; accent?: string; text?: string; buttonColorSource?: "accent" | "primary" | "custom"; buttonColorCustom?: string };
    fonts?: { heading?: string; body?: string; headingWeight?: number; headingItalic?: boolean; bodyWeight?: number; bodyItalic?: boolean };
    content?: { businessName?: string; headline?: string; bio?: string; phone?: string; email?: string; address?: string };
    layout?: Record<string, unknown>;
    layout_fine_tune?: {
      buttonStyle?: "solid" | "outline" | "pill" | "sharp";
      navAlignment?: "left" | "center" | "split";
      spacingDensity?: "compact" | "comfortable" | "spacious";
      cardStyle?: "flat" | "shadow" | "bordered";
      headingScale?: "modest" | "bold";
    };
  };
  can_undo: boolean;
  status: "draft" | "published";
  created_at: string;
};

type DashboardLead = {
  id: string;
  site_id: string;
  name: string;
  phone: string;
  message: string | null;
  created_at: string;
};

type SiteDraft = {
  business_name: string;
  headline: string;
  tone: string;
  phone: string;
  email: string;
  address: string;
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
};

type GoogleFont = { family: string; variants: string[] };

const variantWeight = (variant: string) => Number.parseInt(variant, 10) || 400;
const weightsFor = (font: GoogleFont | undefined, italic: boolean) => {
  if (!font) return [400];
  const weights = font.variants
    .filter((variant) => italic ? variant === "italic" || variant.endsWith("italic") : variant === "regular" || /^\d+$/.test(variant))
    .map(variantWeight);
  return [...new Set(weights)].sort((a, b) => a - b);
};
const closestWeight = (weights: number[], target: number) => weights.reduce((best, weight) => Math.abs(weight - target) < Math.abs(best - target) ? weight : best, weights[0] || 400);
const semanticWeightOptions = (weights: number[]) => [
  { label: "Normal", value: closestWeight(weights, 400) },
  { label: "Medium", value: closestWeight(weights, 500) },
  { label: "Bold", value: closestWeight(weights, 700) },
];

function FontControl({ id, label, fonts, family, weight, italic, disabled, onChange }: {
  id: string;
  label: string;
  fonts: GoogleFont[];
  family: string;
  weight: number;
  italic: boolean;
  disabled: boolean;
  onChange: (change: { family?: string; weight?: number; italic?: boolean }) => void;
}) {
  const selected = fonts.find((font) => font.family === family);
  const availableWeights = weightsFor(selected, italic);
  const weightOptions = semanticWeightOptions(availableWeights);
  const italicWeights = weightsFor(selected, true);
  const canItalic = Boolean(selected && selected.variants.some((variant) => variant.includes("italic")));
  return <div className="rounded-xl border bg-white p-4">
    <Label htmlFor={`${id}-family`}>{label}</Label>
    <Input id={`${id}-family`} list={`${id}-font-list`} value={family} disabled={disabled} onChange={(event) => {
      const nextFamily = event.target.value;
      const font = fonts.find((item) => item.family === nextFamily);
      if (!font) return onChange({ family: nextFamily });
      const nextItalic = italic && font.variants.some((variant) => variant.includes("italic"));
      const nextWeights = weightsFor(font, nextItalic);
      onChange({ family: nextFamily, italic: nextItalic, weight: closestWeight(nextWeights, weight) });
    }} placeholder="Font ara..." className="mt-2" />
    <datalist id={`${id}-font-list`}>{fonts.map((font) => <option key={font.family} value={font.family} />)}</datalist>
    <div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-3">
      <div><Label htmlFor={`${id}-weight`}>Kalınlık</Label><select id={`${id}-weight`} disabled={disabled || !selected} value={weightOptions.some((option) => option.value === weight) ? weight : closestWeight(weightOptions.map((option) => option.value), weight)} onChange={(event) => onChange({ weight: Number(event.target.value) })} className="mt-2 h-10 w-full rounded-md border bg-white px-3 text-sm">{weightOptions.map((option) => <option key={option.label} value={option.value}>{option.label} ({option.value})</option>)}</select></div>
      <label className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm"><input type="checkbox" checked={italic && canItalic} disabled={disabled || !canItalic} onChange={(event) => { const nextItalic = event.target.checked; const nextWeights = nextItalic ? italicWeights : weightsFor(selected, false); onChange({ italic: nextItalic, weight: closestWeight(nextWeights, weight) }); }} /> İtalik</label>
    </div>
  </div>;
}

const blankListing = (siteId: string, district = "İstanbul"): ListingDraft & { id?: string } => ({
  site_id: siteId,
  title: "",
  description: "",
  price: 0,
  currency: "TRY",
  m2: 0,
  room_count: "2+1",
  listing_type: "sale",
  district,
  lat: 41,
  lng: 29,
  media: [],
  status: "active",
  features: [],
});

const siteDraftFrom = (site: DashboardSite): SiteDraft => ({
  business_name: site.business_name,
  headline: site.headline,
  tone: site.tone || "",
  phone: site.theme_config?.content?.phone || "",
  email: site.theme_config?.content?.email || "",
  address: site.theme_config?.content?.address || "",
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
});

function Metric({ label, value }: { label: string; value: string }) {
  return <Card className="rounded-[1.5rem] border-[#173f32]/10 bg-[#fbfaf7] shadow-none"><CardContent className="p-5"><div className="text-xs text-[#7a857e]">{label}</div><div className="mt-2 text-2xl font-semibold">{value}</div></CardContent></Card>;
}

export function DashboardPage() {
  const { session, user, claimResult, claimError, isClaiming, retryClaim } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sites, setSites] = useState<DashboardSite[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [leads, setLeads] = useState<DashboardLead[]>([]);
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [selectedSiteId, setSelectedSiteId] = useState(searchParams.get("site") || "");
  const [draft, setDraft] = useState<ListingDraft & { id?: string }>(() => blankListing(""));
  const [siteDraft, setSiteDraft] = useState<SiteDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingListing, setSavingListing] = useState(false);
  const [savingSite, setSavingSite] = useState(false);
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [openingPaywall, setOpeningPaywall] = useState(false);
  const [refineRequest, setRefineRequest] = useState("");
  const [refining, setRefining] = useState(false);
  const [refineNote, setRefineNote] = useState<string | null>(null);
  const [refineFields, setRefineFields] = useState<string[]>([]);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [fonts, setFonts] = useState<GoogleFont[]>([]);
  const [fontsLoading, setFontsLoading] = useState(false);
  const [fontsError, setFontsError] = useState("");
  const themePatchQueue = useRef<Promise<void>>(Promise.resolve());
  const themePatchVersion = useRef(0);
  const navigate = useNavigate();

  const authHeaders = useMemo(() => session ? { Authorization: `Bearer ${session.access_token}` } : {}, [session]);
  const activeSite = sites.find((site) => site.id === selectedSiteId) || sites[0] || null;
  const siteLeads = leads.filter((lead) => lead.site_id === activeSite?.id);

  const loadLeads = useCallback(async (signal?: AbortSignal) => {
    if (!session) return;
    const response = await fetch("/api/leads", { headers: authHeaders, signal });
    const payload = await readApiJson<{ error?: string; leads?: DashboardLead[] }>(response);
    if (!response.ok) throw new Error(payload.error || "Talepler yüklenemedi.");
    setLeads(payload.leads || []);
  }, [authHeaders, session]);

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/sites", { headers: authHeaders, signal: controller.signal });
        const payload = await readApiJson<{ error?: string; sites?: DashboardSite[]; plan?: "free" | "pro" }>(response);
        if (!response.ok) throw new Error(payload.error || "Siteler yüklenemedi.");
        const nextSites: DashboardSite[] = payload.sites || [];
        setPlan(payload.plan === "pro" ? "pro" : "free");
        setSites(nextSites);
        const requested = searchParams.get("site");
        const nextId = nextSites.some((site) => site.id === requested) ? requested! : nextSites[0]?.id || "";
        setSelectedSiteId(nextId);
        await loadLeads(controller.signal);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) toast.error(error instanceof Error ? error.message : "Dashboard yüklenemedi.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [authHeaders, claimResult, loadLeads, searchParams, session]);

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    setFontsLoading(true);
    setFontsError("");
    fetch("/api/fonts", { headers: authHeaders, signal: controller.signal })
      .then(async (response) => {
        const payload = await readApiJson<{ error?: string; fonts?: GoogleFont[] }>(response);
        if (!response.ok) throw new Error(payload.error || "Google Fonts kataloğu yüklenemedi.");
        setFonts(payload.fonts || []);
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setFontsError(error instanceof Error ? error.message : "Google Fonts kataloğu yüklenemedi.");
      })
      .finally(() => { if (!controller.signal.aborted) setFontsLoading(false); });
    return () => controller.abort();
  }, [authHeaders, session]);

  useEffect(() => {
    if (!activeSite || !session) {
      setListings([]);
      return;
    }
    const controller = new AbortController();
    const loadListings = async () => {
      try {
        const response = await fetch(`/api/sites/${activeSite.id}/listings`, { headers: authHeaders, signal: controller.signal });
        const payload = await readApiJson<{ error?: string; listings?: Listing[] }>(response);
        if (!response.ok) throw new Error(payload.error || "İlanlar yüklenemedi.");
        setListings(payload.listings || []);
        setDraft(blankListing(activeSite.id, activeSite.theme_config?.content?.address || "İstanbul"));
        setSiteDraft(siteDraftFrom(activeSite));
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) toast.error(error instanceof Error ? error.message : "İlanlar yüklenemedi.");
      }
    };
    void loadListings();
    return () => controller.abort();
  }, [activeSite, authHeaders, session]);

  useEffect(() => {
    if (!session) return;
    const refresh = () => void loadLeads().catch((error) => toast.error(error.message));
    const timer = window.setInterval(refresh, 3000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [loadLeads, session]);

  const selectSite = (siteId: string) => {
    setSelectedSiteId(siteId);
    setSearchParams({ site: siteId });
  };

  const openPaywall = async (context: "listing_limit" | "branding_removal" | "lead_export") => {
    if (!session || openingPaywall) return;
    setOpeningPaywall(true);
    try {
      await trackExperimentEvent(session.access_token, "paywall_view", context);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Paywall görüntüleme olayı kaydedilemedi.");
    } finally {
      navigate(`/pricing?context=${context}`);
      setOpeningPaywall(false);
    }
  };

  const startNewListing = () => {
    if (!activeSite) return;
    const activeCount = listings.filter((listing) => listing.status === "active").length;
    if (plan === "free" && activeCount >= 5) {
      void openPaywall("listing_limit");
      return;
    }
    setDraft(blankListing(activeSite.id, siteDraft?.address || "İstanbul"));
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
      const payload = await readApiJson<{ error?: string; code?: string; listing: Listing }>(response);
      if (!response.ok && payload.code === "FREE_LISTING_LIMIT") {
        await openPaywall("listing_limit");
        return;
      }
      if (!response.ok) throw new Error(payload.error || "İlan kaydedilemedi.");
      setListings((current) => editing ? current.map((item) => item.id === payload.listing.id ? payload.listing : item) : [payload.listing, ...current]);
      setDraft({ ...payload.listing });
      toast.success(editing ? "İlan güncellendi; canlı siteye yansıdı." : "Yeni ilan oluşturuldu.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "İlan kaydedilemedi.");
    } finally {
      setSavingListing(false);
    }
  };

  const generateListingCopy = async () => {
    if (!session) throw new Error("Metin oluşturmak için giriş yapmalısınız.");
    const response = await fetch("/api/listings/generate-copy", {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const payload = await readApiJson<{ error?: string; platform_style?: string; seo_style?: string }>(response);
    if (!response.ok) throw new Error(payload.error || "İlan metinleri oluşturulamadı.");
    if (!payload.platform_style || !payload.seo_style) throw new Error("API iki metin varyantını döndürmedi.");
    return { platform_style: payload.platform_style, seo_style: payload.seo_style };
  };

  const loadSocialKit = async (format: "post" | "story") => {
    if (!session || !draft.id) throw new Error("Sosyal medya kiti için önce ilanı kaydedin.");
    const response = await fetch(`/api/listings/${draft.id}/social-kit?format=${format}`, { headers: authHeaders });
    if (!response.ok) {
      const payload = await readApiJson<{ error?: string }>(response);
      throw new Error(payload.error || "Sosyal medya görseli oluşturulamadı.");
    }
    if (!(response.headers.get("content-type") || "").includes("image/png")) throw new Error("API geçerli bir PNG görseli döndürmedi.");
    return response.blob();
  };

  const removeListing = async () => {
    if (!session || !activeSite || !draft.id || !window.confirm("Bu ilanı kalıcı olarak silmek istediğinize emin misiniz?")) return;
    try {
      const response = await fetch(`/api/listings/${draft.id}`, { method: "DELETE", headers: authHeaders });
      const payload = await readApiJson<{ error?: string; deleted?: boolean }>(response);
      if (!response.ok) throw new Error(payload.error || "İlan silinemedi.");
      setListings((current) => current.filter((item) => item.id !== draft.id));
      setDraft(blankListing(activeSite.id, siteDraft?.address || "İstanbul"));
      toast.success("İlan silindi; canlı siteden kaldırıldı.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "İlan silinemedi.");
    }
  };

  const patchSite = async (changes: Record<string, unknown>, success: string) => {
    if (!session || !activeSite) return;
    setSavingSite(true);
    try {
      const response = await fetch(`/api/sites/${activeSite.id}`, { method: "PATCH", headers: { ...authHeaders, "Content-Type": "application/json" }, body: JSON.stringify(changes) });
      const payload = await readApiJson<{ error?: string; site: DashboardSite }>(response);
      if (!response.ok) throw new Error(payload.error || "Site güncellenemedi.");
      setSites((current) => current.map((site) => site.id === payload.site.id ? payload.site : site));
      setSiteDraft(siteDraftFrom(payload.site));
      toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Site güncellenemedi.");
    } finally {
      setSavingSite(false);
    }
  };

  const saveIdentity = () => siteDraft && patchSite({ business_name: siteDraft.business_name, headline: siteDraft.headline, tone: siteDraft.tone, phone: siteDraft.phone, email: siteDraft.email, address: siteDraft.address }, "Site ve iletişim bilgileri güncellendi.");
  const togglePublication = () => activeSite && patchSite({ status: activeSite.status === "published" ? "draft" : "published" }, activeSite.status === "published" ? "Site taslağa alındı." : "Site yayınlandı.");

  const applyThemeSettings = (changes: Record<string, unknown>, nextDraft: SiteDraft) => {
    if (!session || !activeSite) return Promise.resolve();
    const version = ++themePatchVersion.current;
    const siteAtRequest = activeSite;
    setSiteDraft(nextDraft);
    setSavingSite(true);
    const execute = async () => {
      try {
        const response = await fetch(`/api/sites/${siteAtRequest.id}`, { method: "PATCH", headers: { ...authHeaders, "Content-Type": "application/json" }, body: JSON.stringify(changes) });
        const payload = await readApiJson<{ error?: string; site?: DashboardSite }>(response);
        if (!response.ok || !payload.site) throw new Error(payload.error || "Tema ayarı kaydedilemedi.");
        setSites((current) => current.map((site) => site.id === payload.site!.id ? payload.site! : site));
        if (version === themePatchVersion.current) setSiteDraft(siteDraftFrom(payload.site));
        setPreviewVersion((value) => value + 1);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Tema ayarı kaydedilemedi.");
        if (version === themePatchVersion.current) setSiteDraft(siteDraftFrom(siteAtRequest));
      } finally {
        if (version === themePatchVersion.current) setSavingSite(false);
      }
    };
    const task = themePatchQueue.current.then(execute, execute);
    themePatchQueue.current = task;
    return task;
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
    if (change.family !== undefined && !fonts.some((font) => font.family === change.family)) return;
    void applyThemeSettings({ [familyKey]: next[familyKey], [weightKey]: next[weightKey], [italicKey]: next[italicKey] }, next);
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
      const payload = await readApiJson<{ error?: string; site?: DashboardSite; unsupported_note?: string | null; applied_fields?: string[] }>(response);
      if (!response.ok || !payload.site) throw new Error(payload.error || "İnce ayar uygulanamadı.");
      setSites((current) => current.map((site) => site.id === payload.site!.id ? payload.site! : site));
      setSiteDraft(siteDraftFrom(payload.site));
      setRefineNote(payload.unsupported_note || null);
      setRefineFields(payload.applied_fields || []);
      setPreviewVersion((value) => value + 1);
      if (!undo && payload.applied_fields?.length) setRefineRequest("");
      toast.success(undo ? "Son ince ayar geri alındı." : payload.applied_fields?.length ? "İnce ayar canlı siteye uygulandı." : "İstek değerlendirildi; uygulanabilir değişiklik bulunamadı.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "İnce ayar uygulanamadı.");
    } finally {
      setRefining(false);
    }
  };

  const saleCount = listings.filter((listing) => listing.listing_type === "sale").length;
  const rentCount = listings.filter((listing) => listing.listing_type === "rent").length;

  return <Shell businessName={activeSite?.business_name || ""} activeSection={activeTab} onSectionChange={setActiveTab} leadCount={siteLeads.length} actions={<div className="flex items-center gap-2">{activeSite ? <Button variant="outline" asChild className="rounded-full border-[#173f32]/10 bg-white"><a href={`/site/${activeSite.slug}`} target="_blank" rel="noreferrer"><Globe className="mr-2 h-4 w-4" />Siteyi aç</a></Button> : null}<Button variant="outline" size="icon" title="Verileri yenile" onClick={() => void loadLeads()} className="rounded-full border-[#173f32]/10 bg-white"><RefreshCw className="h-4 w-4" /></Button></div>}>
    {siteDraft ? <GoogleFontStylesheet fonts={{ heading: siteDraft.heading_font, body: siteDraft.body_font, headingWeight: siteDraft.heading_weight, headingItalic: siteDraft.heading_italic, bodyWeight: siteDraft.body_weight, bodyItalic: siteDraft.body_italic }} /> : null}
    <div className="space-y-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><div className="text-sm text-[#78827c]">{activeSite ? `${activeSite.business_name} · ${activeSite.status === "published" ? "Yayında" : "Taslak"}` : loading ? "Siteleriniz yükleniyor..." : "Hesabınıza bağlı site bulunamadı"}</div><h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Merhaba{user?.email ? `, ${user.email.split("@")[0]}` : ""}.</h1><p className="mt-2 text-sm text-[#69756e]">Sitenizi, ilanlarınızı ve taleplerinizi gerçek zamanlı yönetin.</p></div>{activeSite ? <div className="flex gap-2"><Select value={activeSite.id} onValueChange={selectSite}><SelectTrigger className="w-[220px] rounded-full bg-white"><SelectValue /></SelectTrigger><SelectContent>{sites.map((site) => <SelectItem key={site.id} value={site.id}>{site.business_name}</SelectItem>)}</SelectContent></Select><Button onClick={startNewListing} className="rounded-full bg-[#d86f45] text-white"><Plus className="mr-2 h-4 w-4" />Yeni ilan</Button></div> : null}</div>

      {claimError ? <Card className="border-red-200 bg-red-50 shadow-none"><CardContent className="flex items-center justify-between gap-3 p-4 text-sm text-red-800"><span>Misafir siteniz bağlanamadı: {claimError}</span><Button variant="outline" disabled={isClaiming} onClick={() => void retryClaim()}>{isClaiming ? "Deneniyor..." : "Tekrar dene"}</Button></CardContent></Card> : null}

      <div className="flex gap-2 overflow-x-auto">{(["overview", "listings", "leads", "site"] as const).map((tab) => <Button key={tab} variant="ghost" onClick={() => setActiveTab(tab)} className={cn("rounded-full px-5", activeTab === tab ? "bg-[#173f32] text-white hover:bg-[#173f32] hover:text-white" : "bg-white/60")}>{tab === "overview" ? "Genel bakış" : tab === "listings" ? "Portföyler" : tab === "leads" ? "Gelen Talepler" : "Site ayarları"}</Button>)}</div>

      {!activeSite && !loading ? <Card><CardContent className="p-8 text-center text-sm text-[#69756e]">Önce onboarding akışından bir site oluşturun veya misafir sitenizi bu hesaba bağlayın.</CardContent></Card> : null}

      {activeSite && activeTab === "overview" ? <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Toplam portföy" value={String(listings.length)} /><Metric label="Satılık" value={String(saleCount)} /><Metric label="Kiralık" value={String(rentCount)} /><Metric label="Gelen talep" value={String(siteLeads.length)} /></div><div className="grid gap-6 xl:grid-cols-[1.4fr_.6fr]"><Card className="rounded-[2rem] border-[#173f32]/10 bg-[#fbfaf7] shadow-none"><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Son portföyler</CardTitle><CardDescription>Supabase listings tablosundaki güncel kayıtlar</CardDescription></div><Button variant="ghost" onClick={() => setActiveTab("listings")}>Tümü <ArrowRight className="ml-2 h-4 w-4" /></Button></CardHeader><CardContent className="grid gap-4 md:grid-cols-3">{listings.slice(0, 3).map((listing) => <button key={listing.id} onClick={() => { setDraft({ ...listing }); setActiveTab("listings"); }} className="overflow-hidden rounded-2xl border bg-white text-left"><img src={getListingImage(listing)} alt={listing.title} className="aspect-[4/3] w-full object-cover" /><div className="p-4"><div className="truncate font-semibold">{listing.title}</div><div className="mt-1 text-xs text-[#7a857e]">{listing.district} · {listing.room_count} · {listing.m2} m²</div><div className="mt-3 font-semibold">{formatTRY(listing.price)}</div></div></button>)}</CardContent></Card><Card className="rounded-[2rem] border-0 bg-[#173f32] text-white"><CardContent className="p-7"><Badge className="bg-white/15 text-white">{activeSite.status === "published" ? "Yayında" : "Taslak"}</Badge><h2 className="mt-8 text-3xl font-semibold">{activeSite.business_name}</h2><p className="mt-3 text-sm text-white/60">/site/{activeSite.slug}</p><Button onClick={togglePublication} disabled={savingSite} className="mt-7 w-full rounded-full bg-white text-[#173f32]">{activeSite.status === "published" ? "Yayından kaldır" : "Yayınla"}</Button></CardContent></Card></div></> : null}

      {activeSite && activeTab === "listings" ? <div className="grid gap-6 xl:grid-cols-[1fr_.9fr]"><Card className="rounded-[2rem] border-[#173f32]/10 bg-[#fbfaf7] shadow-none"><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Portföyler</CardTitle><CardDescription>{listings.length} gerçek DB kaydı · ücretsiz planda en fazla 5 aktif ilan</CardDescription></div><Button onClick={startNewListing} disabled={openingPaywall} className="rounded-full"><Plus className="mr-2 h-4 w-4" />Yeni</Button></CardHeader><CardContent className="space-y-3">{listings.map((listing) => <button key={listing.id} onClick={() => setDraft({ ...listing })} className={cn("grid w-full grid-cols-[72px_1fr_auto] items-center gap-4 rounded-2xl border p-3 text-left", draft.id === listing.id ? "border-[#173f32] bg-[#edf1eb]" : "bg-white")}><img src={getListingImage(listing)} alt="" className="h-16 w-[72px] rounded-xl object-cover" /><div className="min-w-0"><div className="truncate font-semibold">{listing.title}</div><div className="mt-1 text-xs text-[#7a857e]">{listing.district} · {listing.room_count} · {listing.m2} m²</div><div className="mt-2 text-sm font-semibold">{formatTRY(listing.price)}</div></div><Badge>{listing.listing_type === "sale" ? "Satılık" : "Kiralık"}</Badge></button>)}</CardContent></Card><ListingForm siteId={activeSite.id} draft={draft} onDraftChange={(patch) => setDraft((current) => ({ ...current, ...patch }))} onSave={() => void saveListing()} isSaving={savingListing} onGenerate={generateListingCopy} onLoadSocialKit={loadSocialKit} onReset={() => setDraft(blankListing(activeSite.id, siteDraft?.address || "İstanbul"))} onDelete={() => void removeListing()} /></div> : null}

      {activeSite && activeTab === "leads" ? <Card className="rounded-[2rem] border-[#173f32]/10 bg-[#fbfaf7] shadow-none"><CardHeader className="flex-row items-center justify-between gap-4"><div><CardTitle>Gelen Talepler</CardTitle><CardDescription>Bu siteye gelen talepler; 3 saniyede bir ve pencere odaklandığında yenilenir.</CardDescription></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void loadLeads()}><RefreshCw className="mr-2 h-4 w-4" />Yenile</Button><Button variant="outline" disabled={openingPaywall} onClick={() => plan === "free" ? void openPaywall("lead_export") : toast.info("Dışa aktarma hazırlanıyor.")}><Download className="mr-2 h-4 w-4" />Talepleri dışa aktar{plan === "free" ? <Lock className="ml-2 h-3.5 w-3.5" /> : null}</Button></div></CardHeader><CardContent>{siteLeads.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="border-y text-xs text-[#7a857e]"><tr><th className="py-4">Ad</th><th>Telefon</th><th>Mesaj</th><th>Tarih</th></tr></thead><tbody>{siteLeads.map((lead) => <tr key={lead.id} className="border-b"><td className="py-5 font-semibold">{lead.name}</td><td><a href={`tel:${lead.phone}`}>{lead.phone}</a></td><td className="max-w-sm text-sm">{lead.message || "—"}</td><td className="text-xs text-[#7a857e]">{formatDateTR(lead.created_at)}</td></tr>)}</tbody></table></div> : <p className="p-5 text-sm text-[#69756e]">Henüz talep yok.</p>}</CardContent></Card> : null}

      {activeSite && activeTab === "site" && siteDraft ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="rounded-[2rem] border-[#173f32]/10 bg-[#fbfaf7]">
            <CardHeader><CardTitle>Site ve iletişim bilgileri</CardTitle><CardDescription>Değerler sites tablosundaki theme_config içeriğine ve ilgili ana kolonlara kaydedilir.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>İşletme adı</Label><Input value={siteDraft.business_name} onChange={(e) => setSiteDraft({ ...siteDraft, business_name: e.target.value })} /></div>
              <div><Label>Başlık</Label><Input value={siteDraft.headline} onChange={(e) => setSiteDraft({ ...siteDraft, headline: e.target.value })} /></div>
              <div><Label>Kısa açıklama</Label><Textarea value={siteDraft.tone} onChange={(e) => setSiteDraft({ ...siteDraft, tone: e.target.value })} /></div>
              <div className="grid gap-4 sm:grid-cols-2"><div><Label>Telefon</Label><Input value={siteDraft.phone} onChange={(e) => setSiteDraft({ ...siteDraft, phone: e.target.value })} /></div><div><Label>E-posta</Label><Input type="email" value={siteDraft.email} onChange={(e) => setSiteDraft({ ...siteDraft, email: e.target.value })} /></div></div>
              <div><Label>Adres</Label><Input value={siteDraft.address} onChange={(e) => setSiteDraft({ ...siteDraft, address: e.target.value })} /></div>
              <div className="flex flex-wrap gap-2"><Button onClick={saveIdentity} disabled={savingSite}>Bilgileri kaydet</Button><Button variant="outline" onClick={togglePublication} disabled={savingSite}>{activeSite.status === "published" ? "Yayından kaldır" : "Yayınla"}</Button></div>
              <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border bg-white p-4">
                <div><div className="flex items-center gap-2 font-semibold">Branding'i kaldır {plan === "free" ? <Lock className="h-3.5 w-3.5 text-slate-400" /> : null}</div><p className="mt-1 text-xs text-slate-500">PortföyAI ibaresini yayınlanan siteden kaldırır.</p></div>
                {plan === "free" ? <Button variant="outline" disabled={openingPaywall} onClick={() => void openPaywall("branding_removal")} className="shrink-0 rounded-full">Pro ile kaldır</Button> : <button type="button" role="switch" aria-checked="false" className="h-7 w-12 rounded-full bg-slate-200 p-1"><span className="block h-5 w-5 rounded-full bg-white shadow" /></button>}
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-[2rem] border-[#173f32]/10 bg-[#fbfaf7]">
            <CardHeader><CardTitle>Tema ayarları</CardTitle><CardDescription>Mevcut theme_config yalnızca seçtiğiniz alanlarda PATCH edilir; Gemini yeniden çağrılmaz.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4"><div><Label>Ana renk</Label><Input type="color" className="h-12 p-1" value={siteDraft.primary_color} onChange={(event) => { const next = { ...siteDraft, primary_color: event.target.value }; void applyThemeSettings({ primary_color: event.target.value }, next); }} /></div><div><Label>Vurgu rengi</Label><Input type="color" className="h-12 p-1" value={siteDraft.accent_color} onChange={(event) => { const next = { ...siteDraft, accent_color: event.target.value }; void applyThemeSettings({ accent_color: event.target.value }, next); }} /></div></div>
              <div><Label>Buton Rengi</Label><Select value={siteDraft.buttonColorSource} onValueChange={(value: "accent" | "primary" | "custom") => { const next = { ...siteDraft, buttonColorSource: value }; void applyThemeSettings({ buttonColorSource: value }, next); }}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="accent">Vurgu rengiyle aynı</SelectItem><SelectItem value="primary">Ana renkle aynı</SelectItem><SelectItem value="custom">Özel renk seç</SelectItem></SelectContent></Select>{siteDraft.buttonColorSource === "custom" ? <div className="mt-3"><Label>Özel buton rengi</Label><Input type="color" className="mt-2 h-12 p-1" value={siteDraft.buttonColorCustom} onChange={(event) => { const next = { ...siteDraft, buttonColorCustom: event.target.value }; void applyThemeSettings({ buttonColorSource: "custom", buttonColorCustom: event.target.value }, next); }} /></div> : null}</div>
              {fontsError ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{fontsError}</div> : null}
              <FontControl id="heading" label="Başlık fontu" fonts={fonts} family={siteDraft.heading_font} weight={siteDraft.heading_weight} italic={siteDraft.heading_italic} disabled={fontsLoading || Boolean(fontsError)} onChange={(change) => updateFont("heading", change)} />
              <FontControl id="body" label="Gövde fontu" fonts={fonts} family={siteDraft.body_font} weight={siteDraft.body_weight} italic={siteDraft.body_italic} disabled={fontsLoading || Boolean(fontsError)} onChange={(change) => updateFont("body", change)} />
              <div className="rounded-2xl p-7 text-white" style={{ background: `linear-gradient(135deg, ${siteDraft.primary_color}, ${siteDraft.accent_color})`, fontFamily: siteDraft.body_font, fontWeight: siteDraft.body_weight, fontStyle: siteDraft.body_italic ? "italic" : "normal" }}><div className="text-xs opacity-70">Canlı tema önizlemesi</div><h3 className="mt-8 text-4xl" style={{ fontFamily: siteDraft.heading_font, fontWeight: siteDraft.heading_weight, fontStyle: siteDraft.heading_italic ? "italic" : "normal" }}>{siteDraft.headline}</h3><span className="mt-6 inline-flex rounded-lg px-4 py-2 text-xs font-semibold" style={{ backgroundColor: siteDraft.buttonColorSource === "primary" ? siteDraft.primary_color : siteDraft.buttonColorSource === "custom" ? siteDraft.buttonColorCustom : siteDraft.accent_color }}>Örnek buton</span></div>
              <p className="text-xs text-[#69756e]">{savingSite ? "Kaydediliyor ve canlı önizleme yenileniyor..." : `${fonts.length ? `${fonts.length} Google Font` : "Font kataloğu"} · Değişiklikler otomatik kaydedilir.`}</p>
            </CardContent>
          </Card>
          <Card className="rounded-[2rem] border-[#173f32]/10 bg-[#fbfaf7] xl:col-span-2">
            <CardHeader><CardTitle>İnce Ayar</CardTitle><CardDescription>Serbest metin isteğiniz yalnızca desteklenen renk, font, buton, menü hizası, aralık, kart ve başlık seçeneklerine eşlenir. Kod veya serbest CSS üretilmez.</CardDescription></CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
              <div className="space-y-4">
                <div><Label htmlFor="fine-tune-request">Mikro değişiklik isteği</Label><Textarea id="fine-tune-request" value={refineRequest} onChange={(event) => setRefineRequest(event.target.value)} maxLength={500} rows={5} placeholder="Örn. butonları daha yuvarlak yap ve menüyü ortala" /></div>
                <div className="flex flex-wrap gap-2"><Button onClick={() => void refineSite(false)} disabled={refining || refineRequest.trim().length < 3}>{refining ? "Uygulanıyor..." : "İnce ayarı uygula"}</Button><Button variant="outline" onClick={() => void refineSite(true)} disabled={refining || !activeSite.can_undo}>Son Değişikliği Geri Al</Button></div>
                {refineFields.length ? <div className="flex flex-wrap gap-2">{refineFields.map((field) => <Badge key={field} variant="secondary">{field}</Badge>)}</div> : null}
                {refineNote ? <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><strong>Desteklenmeyen bölüm:</strong> {refineNote}</div> : null}
                <p className="text-xs leading-5 text-[#69756e]">Geri alma yalnızca son başarılı ince ayarı saklar. Tamamen desteklenmeyen bir istek yeni geri alma kaydı oluşturmaz.</p>
              </div>
              <div className="overflow-hidden rounded-2xl border bg-white"><div className="border-b px-4 py-3 text-xs font-semibold text-[#69756e]">Canlı site önizlemesi</div><iframe key={`${activeSite.id}-${previewVersion}`} title="Canlı site önizlemesi" src={`/site/${activeSite.slug}`} className="h-[520px] w-full bg-white" /></div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  </Shell>;
}
