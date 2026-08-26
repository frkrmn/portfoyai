import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Download,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  MapPin,
  Palette,
  Phone,
  Plus,
  Save,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  Users,
  Waves,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatListingPrice, LISTING_CURRENCIES } from "@/lib/listing-price";
import { clearPendingPrompt, getPendingPrompt, savePendingPrompt } from "@/lib/pending-prompt";
import { readApiJson } from "@/lib/api";
import { usePageMeta } from "@/lib/page-meta";
import { toast } from "sonner";
import { formatDateTR, generateThemeFromPrompt } from "./mock";
import { usePortfoyAI } from "./store";
import { useAuth } from "./auth";
import type { GeneratedSiteConfig, Listing, ListingDraft, ThemeConfig } from "./types";
import { formatListingLocation } from "./listing-location";
import { getListingImage } from "@/templates/mediaFallbacks";
import { LocationHierarchyFields } from "./location-fields";
import { useTranslation } from "react-i18next";
import { LanguageToggle } from "@/components/LanguageToggle";

const getThemeStyles = (theme: Pick<ThemeConfig, "primary" | "accent" | "fontPairing">) =>
  ({
    "--theme-primary": theme.primary,
    "--theme-accent": theme.accent,
    fontFamily: theme.fontPairing.body,
  }) as CSSProperties;

export function Shell({ children, actions, businessName, activeSection, onSectionChange, leadCount }: { children: ReactNode; actions?: ReactNode; businessName: string; activeSection: "overview" | "site" | "listings" | "leads"; onSectionChange: (section: "overview" | "site" | "listings" | "leads") => void; leadCount: number }) {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const identity = businessName || user?.email || t("common.brand");
  const navigation = [
    { id: "overview" as const, icon: LayoutDashboard, label: t("dashboard.shell.overview") },
    { id: "listings" as const, icon: Home, label: t("dashboard.shell.listings") },
    { id: "leads" as const, icon: Users, label: t("dashboard.shell.leads") },
    { id: "site" as const, icon: Palette, label: t("dashboard.shell.siteSettings") },
  ];
  return (
    <div className="min-h-screen bg-[#f2efe8] text-[#17231e]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col bg-[#173f32] px-5 py-6 text-white lg:flex">
        <Link to="/" className="flex items-center gap-3 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#173f32]"><Home className="h-[18px] w-[18px]" /></div>
          <span className="text-lg font-bold tracking-[-0.03em]">{t("common.brand")}</span>
        </Link>
        <div className="mt-10 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">{t("dashboard.shell.workspace")}</div>
        <nav className="mt-3 space-y-1.5">
          {navigation.map(({ id, icon: Icon, label }) => (
            <button type="button" key={label} onClick={() => onSectionChange(id)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm", activeSection === id ? "bg-white text-[#173f32] shadow-sm" : "text-white/65 hover:bg-white/8 hover:text-white")}>
              <Icon className="h-[18px] w-[18px]" /><span>{label}</span>{id === "leads" && leadCount > 0 ? <span className="ml-auto rounded-full bg-[#d86f45] px-2 py-0.5 text-[10px] text-white">{leadCount}</span> : null}
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-[#dbe5d2] font-semibold text-[#173f32]">{identity.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div><div className="min-w-0"><div className="truncate text-sm font-semibold">{identity}</div><div className="truncate text-xs text-white/45">{user?.email}</div></div></div>
        </div>
      </aside>
      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-20 border-b border-[#173f32]/10 bg-[#f2efe8]/90 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-3 lg:hidden"><div className="grid h-9 w-9 place-items-center rounded-full bg-[#173f32] text-white"><Home className="h-4 w-4" /></div><span className="font-bold">{t("common.brand")}</span></Link>
            <div className="hidden lg:block"><div className="text-xs text-[#78827c]">{businessName || t("dashboard.shell.noSite")}</div><div className="mt-0.5 text-sm font-semibold">{t("dashboard.shell.adminPanel")}</div></div>
            <div className="flex items-center gap-2">{actions}<LanguageToggle />{user ? <Button variant="outline" size="icon" title={t("dashboard.shell.logout")} onClick={() => void signOut().catch((error) => toast.error(error.message))} className="rounded-full border-[#173f32]/10 bg-white text-[#173f32]"><LogOut className="h-4 w-4" /></Button> : null}</div>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

function LeadForm({ siteId, listingId, source, compact }: { siteId: string; listingId: string; source: string; compact?: boolean }) {
  const { addLead } = usePortfoyAI();
  const [form, setForm] = useState({ name: "", phone: "", message: "" });

  return (
    <form
      className={cn("space-y-3", compact && "space-y-2")}
      onSubmit={(e) => {
        e.preventDefault();
        addLead({ site_id: siteId, listing_id: listingId, ...form, source });
        toast.success("Talep kaydedildi. Bildirim kuyruğu stub olarak loglandı.");
        setForm({ name: "", phone: "", message: "" });
      }}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          placeholder="Ad Soyad"
          value={form.name}
          onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
          required
        />
        <Input
          placeholder="Telefon"
          value={form.phone}
          onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))}
          required
        />
      </div>
      <Textarea
        placeholder="Mesajınız"
        value={form.message}
        onChange={(e) => setForm((current) => ({ ...current, message: e.target.value }))}
        required
      />
      <Button type="submit" className="w-full gap-2 bg-[linear-gradient(135deg,var(--theme-primary),var(--theme-accent))] text-white hover:opacity-95">
        <Send className="h-4 w-4" />
        Mesaj gönder
      </Button>
    </form>
  );
}

function PublicContactForm({ siteId }: { siteId: string }) {
  const [form, setForm] = useState({ name: "", phone: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  if (isSubmitted) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900" role="status">
        <div className="flex items-start gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-white"><Check className="h-4 w-4" /></div><div><div className="font-semibold">Talebiniz alındı</div><p className="mt-1 text-sm leading-6 text-emerald-800">En kısa sürede sizinle iletişime geçilecek.</p></div></div>
        <Button type="button" variant="outline" onClick={() => setIsSubmitted(false)} className="mt-4 rounded-full border-emerald-300 bg-white text-emerald-900">Yeni mesaj gönder</Button>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={async (event) => {
      event.preventDefault();
      setIsSubmitting(true);
      setSubmitError("");
      try {
        const response = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ site_id: siteId, ...form }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Talebiniz gönderilemedi.");
        setForm({ name: "", phone: "", message: "" });
        setIsSubmitted(true);
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : "Talebiniz gönderilemedi.");
      } finally {
        setIsSubmitting(false);
      }
    }}>
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="contact-name">Adınız</Label><Input id="contact-name" autoComplete="name" maxLength={120} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required /></div><div className="space-y-2"><Label htmlFor="contact-phone">Telefon</Label><Input id="contact-phone" type="tel" autoComplete="tel" minLength={5} maxLength={40} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} required /></div></div>
      <div className="space-y-2"><Label htmlFor="contact-message">Mesajınız <span className="font-normal text-slate-500">(isteğe bağlı)</span></Label><Textarea id="contact-message" maxLength={2000} value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} placeholder="Aradığınız evi veya ilgilendiğiniz portföyü kısaca anlatabilirsiniz." /></div>
      {submitError ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{submitError}</p> : null}
      <Button type="submit" disabled={isSubmitting} className="w-full gap-2 rounded-full bg-[#173f32] text-white"><Send className="h-4 w-4" />{isSubmitting ? "Gönderiliyor..." : "Talebimi gönder"}</Button>
    </form>
  );
}

export function ListingForm({
  siteId,
  draft,
  onDraftChange,
  onSave,
  onGenerate,
  onLoadSocialKit,
  onReset,
  onDelete,
  isSaving = false,
}: {
  siteId: string;
  draft: ListingDraft & { id?: string };
  onDraftChange: (patch: Partial<ListingDraft & { id?: string }>) => void;
  onSave: () => void;
  onGenerate: () => Promise<{ platform_style: string; seo_style: string }>;
  onLoadSocialKit: (format: "post" | "story") => Promise<Blob>;
  onReset: () => void;
  onDelete: () => void;
  isSaving?: boolean;
}) {
  const { t } = useTranslation();
  const [generatedCopy, setGeneratedCopy] = useState<{ platform_style: string; seo_style: string } | null>(null);
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [socialKitOpen, setSocialKitOpen] = useState(false);
  const [socialKitLoading, setSocialKitLoading] = useState(false);
  const [socialKitError, setSocialKitError] = useState("");
  const [socialKitUrls, setSocialKitUrls] = useState<{ post: string; story: string } | null>(null);
  const [featureInput, setFeatureInput] = useState("");
  const copyFactsSignature = JSON.stringify([draft.id, draft.title, draft.price, draft.currency, draft.m2, draft.room_count, draft.listing_type, draft.property_category, draft.property_subtype, draft.district, draft.features, draft.address, draft.category, draft.bedroom_count, draft.bathroom_count, draft.rental_yield_percent, draft.roi_notes, draft.urgent_sale, draft.price_reduced_from]);

  useEffect(() => {
    setGeneratedCopy(null);
    setCopyError("");
  }, [copyFactsSignature]);

  useEffect(() => {
    setSocialKitOpen(false);
    setSocialKitError("");
    setSocialKitUrls((current) => {
      if (current) { URL.revokeObjectURL(current.post); URL.revokeObjectURL(current.story); }
      return null;
    });
  }, [draft.id]);

  useEffect(() => () => {
    if (socialKitUrls) { URL.revokeObjectURL(socialKitUrls.post); URL.revokeObjectURL(socialKitUrls.story); }
  }, [socialKitUrls]);

  const handleGenerateCopy = async () => {
    setIsGeneratingCopy(true);
    setCopyError("");
    try {
      setGeneratedCopy(await onGenerate());
    } catch (error) {
      const message = error instanceof Error ? error.message : t("dashboard.listingForm.copyError");
      setCopyError(message);
      toast.error(message);
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  const handleSocialKit = async () => {
    if (socialKitOpen) { setSocialKitOpen(false); return; }
    setSocialKitOpen(true);
    if (!draft.id) return;
    if (socialKitUrls) {
      URL.revokeObjectURL(socialKitUrls.post);
      URL.revokeObjectURL(socialKitUrls.story);
      setSocialKitUrls(null);
    }
    setSocialKitLoading(true);
    setSocialKitError("");
    try {
      const [post, story] = await Promise.all([onLoadSocialKit("post"), onLoadSocialKit("story")]);
      setSocialKitUrls({ post: URL.createObjectURL(post), story: URL.createObjectURL(story) });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("dashboard.listingForm.socialError");
      setSocialKitError(message);
      toast.error(message);
    } finally {
      setSocialKitLoading(false);
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files).slice(0, Math.max(0, 10 - draft.media.length));
    if (selected.some((file) => file.size > 1_500_000)) {
      toast.error(t("dashboard.listingForm.photoTooLarge"));
      return;
    }
    const next = await Promise.all(
      selected.map(
        (file) =>
          new Promise<{ url: string; thumbUrl: string; alt: string; id: string }>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const url = String(reader.result);
              resolve({ url, thumbUrl: url, alt: file.name, id: `media_${Math.random().toString(36).slice(2, 9)}` });
            };
            reader.readAsDataURL(file);
          }),
      ),
    );
    onDraftChange({ media: [...draft.media, ...next] });
  };

  return (
    <Card className="rounded-[2rem] border-[#173f32]/10 bg-[#fbfaf7] shadow-none">
      <CardHeader>
        <CardTitle className="text-2xl">{t(draft.id ? "dashboard.listingForm.editTitle" : "dashboard.listingForm.newTitle")}</CardTitle>
        <CardDescription>{t("dashboard.listingForm.descriptionPlaceholder")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>{t("dashboard.listingForm.title")}</Label>
            <Input placeholder={t("dashboard.listingForm.titlePlaceholder")} value={draft.title} onChange={(e) => onDraftChange({ title: e.target.value })} />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
            <div className="space-y-2">
              <Label>{t("dashboard.listingForm.price")}</Label>
              <Input type="number" min="0" value={draft.price} onChange={(e) => onDraftChange({ price: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>{t("dashboard.listingForm.currency")}</Label>
              <Select value={draft.currency || "TRY"} onValueChange={(value) => onDraftChange({ currency: value as Listing["currency"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LISTING_CURRENCIES.map((currency) => <SelectItem key={currency} value={currency}>{currency}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard.listingForm.area")}</Label>
            <Input value={draft.m2} onChange={(e) => onDraftChange({ m2: Number(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard.listingForm.rooms")}</Label>
            <Input value={draft.room_count} onChange={(e) => onDraftChange({ room_count: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard.listingForm.type")}</Label>
            <Select value={draft.listing_type} onValueChange={(value) => onDraftChange({ listing_type: value as "sale" | "rent" })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sale">{t("dashboard.listingForm.sale")}</SelectItem>
                <SelectItem value="rent">{t("dashboard.listingForm.rent")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard.listingForm.propertyCategory")}</Label>
            <Select value={draft.property_category || "konut"} onValueChange={(value) => onDraftChange({ property_category: value as Listing["property_category"], property_subtype: value === "konut" ? "daire" : value === "arsa" ? "konut_imarli" : null })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="konut">{t("dashboard.listingForm.residential")}</SelectItem>
                <SelectItem value="arsa">{t("dashboard.listingForm.land")}</SelectItem>
                <SelectItem value="isyeri">{t("dashboard.listingForm.commercial")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {draft.property_category === "konut" || draft.property_category === "arsa" ? <div className="space-y-2" data-property-subtype-field>
            <Label>{t(draft.property_category === "arsa" ? "dashboard.listingTaxonomy.landSubtype" : "dashboard.listingTaxonomy.residentialSubtype")}</Label>
            <Select value={draft.property_subtype || (draft.property_category === "arsa" ? "konut_imarli" : "daire")} onValueChange={(value) => onDraftChange({ property_subtype: value as NonNullable<Listing["property_subtype"]> })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {draft.property_category === "konut" ? <>
                  <SelectItem value="daire">{t("dashboard.listingForm.apartment")}</SelectItem>
                  <SelectItem value="mustakil_ev">{t("dashboard.listingForm.detachedHouse")}</SelectItem>
                  <SelectItem value="villa">{t("dashboard.listingForm.villa")}</SelectItem>
                  <SelectItem value="rezidans">{t("dashboard.listingForm.residence")}</SelectItem>
                </> : <>
                  <SelectItem value="konut_imarli">{t("dashboard.listingTaxonomy.residentialZoned")}</SelectItem>
                  <SelectItem value="ticari_imarli">{t("dashboard.listingTaxonomy.commercialZoned")}</SelectItem>
                  <SelectItem value="tarla_tarimsal">{t("dashboard.listingTaxonomy.agriculturalField")}</SelectItem>
                  <SelectItem value="villa_imarli">{t("dashboard.listingTaxonomy.villaZoned")}</SelectItem>
                  <SelectItem value="kentsel_donusum">{t("dashboard.listingTaxonomy.urbanRenewal")}</SelectItem>
                </>}
              </SelectContent>
            </Select>
          </div> : null}
          <LocationHierarchyFields idPrefix="listing-location" value={draft} legacyDistrict={draft.district} onChange={(selection, names) => onDraftChange({ ...selection, district: names.district })} />
          <div className="space-y-2 md:col-span-2">
            <Label>{t("dashboard.listingForm.features")}</Label>
            <div className="flex flex-wrap gap-2">{draft.features.map((feature) => <span key={feature} className="inline-flex items-center gap-2 rounded-full bg-[#173f32]/8 px-3 py-1.5 text-xs font-medium text-[#173f32]">{feature}<button type="button" aria-label={`${feature} ${t("dashboard.listingForm.removePhoto")}`} onClick={() => onDraftChange({ features: draft.features.filter((item) => item !== feature) })}><X className="h-3 w-3" /></button></span>)}</div>
            <Input value={featureInput} onChange={(event) => setFeatureInput(event.target.value)} onKeyDown={(event) => { if (event.key !== "Enter" && event.key !== ",") return; event.preventDefault(); const feature = featureInput.trim().replace(/,$/, ""); if (feature && !draft.features.includes(feature)) onDraftChange({ features: [...draft.features, feature] }); setFeatureInput(""); }} placeholder={t("dashboard.listingTaxonomy.featureHint")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>{t("dashboard.listingForm.photo")}</Label>
            <Input type="file" accept="image/*" multiple onChange={(e) => void handleFiles(e.target.files)} />
            <div className="flex flex-wrap gap-2">
              {draft.media.map((item) => (
                <div key={item.id} className="relative"><img src={item.thumbUrl} alt={item.alt} className="h-16 w-24 rounded-xl object-cover ring-1 ring-slate-200" /><button type="button" aria-label={t("dashboard.listingForm.removePhoto")} onClick={() => onDraftChange({ media: draft.media.filter((media) => media.id !== item.id) })} className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-[#173f32] text-white"><X className="h-3 w-3" /></button></div>
              ))}
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between gap-3"><Label>{t("dashboard.listingForm.description")}</Label><Button type="button" size="sm" onClick={() => void handleGenerateCopy()} disabled={isGeneratingCopy} variant="secondary" className="gap-2"><Sparkles className="h-4 w-4" />{t(isGeneratingCopy ? "dashboard.listingForm.generatingCopy" : "dashboard.listingForm.generateCopy")}</Button></div>
            <Textarea rows={6} value={draft.description} onChange={(e) => onDraftChange({ description: e.target.value })} />
            {copyError ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{copyError}</p> : null}
          </div>
        </div>
        {generatedCopy ? <div className="grid gap-4 md:grid-cols-2"><div className="flex flex-col rounded-2xl border border-[#173f32]/10 bg-white p-4"><div className="text-sm font-semibold">{t("dashboard.listingForm.platformStyle")}</div><p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#5f6c65]">{generatedCopy.platform_style}</p><Button type="button" variant="outline" onClick={() => onDraftChange({ description: generatedCopy.platform_style })} className="mt-4 self-start">{t("dashboard.listingForm.use")}</Button></div><div className="flex flex-col rounded-2xl border border-[#173f32]/10 bg-white p-4"><div className="text-sm font-semibold">{t("dashboard.listingForm.seoStyle")}</div><p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#5f6c65]">{generatedCopy.seo_style}</p><Button type="button" variant="outline" onClick={() => onDraftChange({ description: generatedCopy.seo_style })} className="mt-4 self-start">{t("dashboard.listingForm.use")}</Button></div></div> : null}
        {socialKitOpen ? <div className="rounded-2xl border border-[#173f32]/10 bg-white p-4"><div className="flex items-center justify-between"><div><div className="font-semibold">{t("dashboard.listingForm.socialTitle")}</div><p className="mt-1 text-xs text-slate-500">{t("dashboard.listingForm.socialBody")}</p></div>{socialKitLoading ? <span className="text-xs text-slate-500">{t("common.loading")}</span> : null}</div>{socialKitError ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{socialKitError}</p> : null}{socialKitUrls ? <div className="mt-4 grid gap-5 md:grid-cols-2"><div><div className="text-sm font-medium">{t("dashboard.listingForm.post")} · 1080×1080</div><img src={socialKitUrls.post} alt={t("dashboard.listingForm.previewAlt", { format: t("dashboard.listingForm.post") })} className="mt-2 aspect-square w-full rounded-xl bg-slate-100 object-contain" /><Button asChild variant="outline" className="mt-3 w-full gap-2"><a href={socialKitUrls.post} download={`${draft.id}-post.png`}><Download className="h-4 w-4" />{t("dashboard.listingForm.download")}</a></Button></div><div><div className="text-sm font-medium">{t("dashboard.listingForm.story")} · 1080×1920</div><div className="mt-2 flex justify-center rounded-xl bg-slate-100 p-3"><img src={socialKitUrls.story} alt={t("dashboard.listingForm.previewAlt", { format: t("dashboard.listingForm.story") })} className="aspect-[9/16] max-h-[430px] w-auto rounded-lg object-contain" /></div><Button asChild variant="outline" className="mt-3 w-full gap-2"><a href={socialKitUrls.story} download={`${draft.id}-story.png`}><Download className="h-4 w-4" />{t("dashboard.listingForm.download")}</a></Button></div></div> : null}</div> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onSave} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {t(isSaving ? "dashboard.listingForm.saving" : "dashboard.listingForm.save")}
          </Button>
          <Button type="button" variant="outline" onClick={onReset}>
            {t("dashboard.listings.new")}
          </Button>
          {draft.id ? <Button type="button" variant="outline" onClick={() => void handleSocialKit()} disabled={socialKitLoading} className="gap-2"><Sparkles className="h-4 w-4" />{t("dashboard.listingForm.socialKit")}</Button> : null}
          {draft.id ? (
            <Button type="button" variant="destructive" onClick={onDelete} className="gap-2">
              <Trash2 className="h-4 w-4" />
              {t("common.delete")}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function LandingPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state, setPrompt } = usePortfoyAI();
  usePageMeta(t("landing.meta.title"), t("landing.meta.description"));
  const prompt = state.onboardingPrompt;
  const { theme } = useMemo(() => generateThemeFromPrompt(prompt), [prompt]);
  const previewListings = state.listings.slice(0, 3).map((listing, index) => ({
    ...listing,
    title: t(`landing.preview.listing${index + 1}`),
    province_name: t("landing.preview.locationProvince"),
    district_name: t("landing.preview.locationDistrict"),
    neighborhood_name: t(`landing.preview.location${index + 1}`),
  }));
  const previewBusinessName = t("landing.preview.businessName");
  const previewRegion = t("landing.preview.region");
  const demoSubdomain = state.sites[0]?.subdomain || "kaya-gayrimenkul";

  useEffect(() => {
    const translatedExamples = [
      i18n.getFixedT("tr")("landing.hero.examplePrompt"),
      i18n.getFixedT("en")("landing.hero.examplePrompt"),
      "Kadıköy'de lüks daire satan modern ve güvenilir bir emlakçıyım",
    ];
    const nextExample = t("landing.hero.examplePrompt");
    if (!prompt.trim() || translatedExamples.includes(prompt)) setPrompt(nextExample);
  }, [i18n, i18n.resolvedLanguage, prompt, setPrompt, t]);

  const continueWithDesign = () => {
    const normalizedPrompt = prompt.trim();
    if (normalizedPrompt.length < 10) {
      toast.error(t("landing.hero.promptTooShort"));
      return;
    }
    savePendingPrompt(normalizedPrompt);
    if (user) {
      navigate("/auth");
      return;
    }
    toast.info(t("landing.hero.authNotice"));
    navigate("/signup", { state: { from: "/auth" } });
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#f4f1ea] text-[#17231e]">
      <header className="relative z-30 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Link to="/" className="flex items-center gap-3" aria-label={t("landing.nav.homeLabel")}>
          <div className="grid h-10 w-10 place-items-center rounded-full bg-[#173f32] text-white shadow-[0_8px_20px_rgba(23,63,50,0.16)]">
            <Home className="h-[18px] w-[18px]" />
          </div>
          <span className="text-lg font-bold tracking-[-0.03em]">{t("common.brand")}</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-[#48564f] md:flex">
          <a href="#nasil-calisir" className="transition-colors hover:text-[#173f32]">{t("landing.nav.how")}</a>
          <a href="#ozellikler" className="transition-colors hover:text-[#173f32]">{t("landing.nav.features")}</a>
          <a href="#size-ozel" className="transition-colors hover:text-[#173f32]">{t("landing.nav.personal")}</a>
          <Link to="/pricing" className="transition-colors hover:text-[#173f32]">{t("landing.nav.pricing")}</Link>
          <a href="#sss" className="transition-colors hover:text-[#173f32]">{t("landing.nav.faq")}</a>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Button variant="ghost" onClick={() => navigate("/login")} className="hidden rounded-full text-[#25372f] sm:inline-flex">
            {t("landing.nav.login")}
          </Button>
          <Button onClick={() => document.getElementById("site-olustur")?.scrollIntoView()} className="rounded-full bg-[#173f32] px-5 text-white shadow-sm hover:bg-[#0f3025]">
            {t("landing.hero.create")}
          </Button>
        </div>
      </header>

      <main>
        <section id="site-olustur" className="relative mx-auto max-w-7xl px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:px-10 lg:pb-28">
          <div className="absolute -right-64 -top-40 h-[620px] w-[620px] rounded-full bg-[#d8e4cf]/70 blur-3xl" />
          <div className="relative grid items-center gap-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
            <div>
              <Badge className="mb-7 rounded-full border border-[#173f32]/10 bg-white/70 px-4 py-2 text-[#173f32] shadow-sm hover:bg-white/70">
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                {t("landing.hero.badge")}
              </Badge>
              <h1 className="max-w-3xl text-[3.55rem] font-semibold leading-[0.96] tracking-[-0.055em] text-[#13231c] sm:text-[4.8rem] lg:text-[5.4rem]">
                {t("landing.hero.headline")} <span className="italic text-[#a35f3d]">{t("landing.hero.headlineAccent")}</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-[#5b675f]">
                {t("landing.hero.intro")}
              </p>

              <Card className="mt-9 max-w-xl rounded-[1.75rem] border-[#173f32]/10 bg-white/90 shadow-[0_24px_70px_rgba(47,58,51,0.10)] backdrop-blur">
                <CardContent className="p-3">
                  <Label htmlFor="business-prompt" className="sr-only">{t("landing.hero.promptLabel")}</Label>
                  <Textarea
                    id="business-prompt"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    className="min-h-[108px] resize-none border-0 bg-transparent px-4 py-3 text-base leading-7 text-[#1d2f27] shadow-none placeholder:text-[#849087] focus-visible:ring-0"
                    placeholder={t("landing.hero.examplePrompt")}
                  />
                  <div className="flex flex-col gap-3 border-t border-[#173f32]/10 px-1 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="px-3 text-xs leading-5 text-[#758078]">{t("landing.hero.promptHelp")}</div>
                    <Button onClick={continueWithDesign} className="h-12 rounded-full bg-[#d86f45] px-5 text-white shadow-[0_10px_24px_rgba(216,111,69,0.24)] hover:bg-[#c55f38]">
                      {t("landing.hero.create")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#647069]">
                {[t("landing.hero.benefits.custom"), t("landing.hero.benefits.ready"), t("landing.hero.benefits.editable")].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#3b725d]" />{item}</span>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[680px]">
              <div className="absolute -inset-5 rotate-2 rounded-[2.5rem] bg-[#d7cbbd]" />
              <div className="relative overflow-hidden rounded-[2.1rem] border border-white/80 bg-white shadow-[0_35px_100px_rgba(40,55,47,0.20)]">
                <div className="flex items-center justify-between border-b border-[#19372d]/10 bg-[#fbfaf7] px-5 py-3">
                  <div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#e9a58b]" /><span className="h-2.5 w-2.5 rounded-full bg-[#e6cf86]" /><span className="h-2.5 w-2.5 rounded-full bg-[#9dc4a9]" /></div>
                  <div className="rounded-full bg-[#eef0eb] px-4 py-1.5 text-[10px] font-medium text-[#69756e]">portfoyai.vercel.app/site/{previewBusinessName.toLocaleLowerCase(i18n.resolvedLanguage).replace(/[^a-z0-9ğüşöçıİ\s-]/gi, "").replace(/\s+/g, "-")}</div>
                  <Badge className="rounded-full bg-[#e4f0e9] px-2.5 text-[10px] text-[#326049] hover:bg-[#e4f0e9]">{t("landing.management.live")}</Badge>
                </div>
                <div className="bg-[#f6efe6] p-3 sm:p-4" style={getThemeStyles(theme)}>
                  <div className="relative min-h-[285px] overflow-hidden rounded-[1.6rem] bg-[#243b32] text-white">
                    <img src="/images/agents/neighborhood-street-hero.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#17231e]/90 via-[#17231e]/45 to-transparent" />
                    <div className="relative flex items-center justify-between px-5 py-4 text-[10px] sm:px-7">
                      <span className="font-semibold tracking-[0.18em]">{previewBusinessName.toUpperCase()}</span>
                      <div className="hidden items-center gap-4 text-white/80 sm:flex"><span>{t("landing.preview.navListings")}</span><span>{t("landing.preview.navAbout")}</span><span>{t("landing.preview.navContact")}</span></div>
                    </div>
                    <div className="relative max-w-md px-5 pb-24 pt-7 sm:px-7 sm:pt-10">
                      <div className="text-[9px] uppercase tracking-[0.22em] text-white/70">{previewRegion}</div>
                      <div className="mt-3 text-3xl font-semibold leading-[1.02] sm:text-4xl" style={{ fontFamily: theme.fontPairing.heading }}>{t("landing.preview.headline")}</div>
                      <p className="mt-3 max-w-sm text-xs leading-5 text-white/80">{t("landing.preview.body")}</p>
                    </div>
                    <div className="absolute inset-x-4 bottom-4 grid grid-cols-[1fr_1fr_auto] gap-2 rounded-2xl bg-[#fffaf3]/95 p-2.5 text-[#17231e] shadow-xl backdrop-blur sm:inset-x-7">
                      <div className="rounded-xl bg-white px-3 py-2"><div className="text-[8px] uppercase tracking-[0.14em] text-[#8b776b]">{t("landing.preview.neighborhood")}</div><div className="mt-1 text-[10px] font-semibold">{t("landing.preview.neighborhoodValue")}</div></div>
                      <div className="rounded-xl bg-white px-3 py-2"><div className="text-[8px] uppercase tracking-[0.14em] text-[#8b776b]">{t("landing.preview.feeling")}</div><div className="mt-1 text-[10px] font-semibold">{t("landing.preview.feelingValue")}</div></div>
                      <div className="grid place-items-center rounded-xl bg-[#d86f45] px-4 text-[10px] font-semibold text-white">{t("landing.preview.match")}</div>
                    </div>
                  </div>

                  <div className="px-1 pb-2 pt-5">
                    <div className="mb-3 flex items-end justify-between">
                      <div><div className="text-[9px] uppercase tracking-[0.18em] text-[#a35f3d]">{t("landing.preview.matchEyebrow")}</div><div className="mt-1 text-lg font-semibold text-[#17231e]">{t("landing.preview.matchTitle")}</div></div>
                      <span className="text-[10px] font-medium text-[#5d6962]">{t("landing.preview.viewAll")} →</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                      {previewListings.map((listing) => (
                        <div key={listing.id} className="overflow-hidden rounded-xl border border-[#17231e]/10 bg-white">
                          <img src={listing.media[0]?.thumbUrl} alt={listing.title} className="aspect-[4/3] w-full object-cover" />
                          <div className="p-2.5">
                            <div className="truncate text-[10px] font-semibold text-[#18251f]">{listing.title}</div>
                            <div className="mt-1 text-[9px] text-[#78837c]">{formatListingLocation(listing)} · {listing.room_count}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-7 -left-5 hidden rounded-2xl border border-white bg-white/95 p-4 shadow-[0_18px_45px_rgba(39,55,47,0.18)] backdrop-blur sm:block">
                <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-[#e7efe8] text-[#315d4b]"><Sparkles className="h-4 w-4" /></div><div><div className="text-xs font-semibold">{t("landing.preview.ready")}</div><div className="mt-0.5 text-[10px] text-[#758078]">{t("landing.preview.tailored")} · {previewRegion}</div></div></div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#173f32]/10 bg-white/60">
          <div className="mx-auto grid max-w-7xl divide-y divide-[#173f32]/10 px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8 lg:px-10">
            {[{ value: "01", title: t("landing.steps.oneTitle"), text: t("landing.steps.oneBody") }, { value: "02", title: t("landing.steps.twoTitle"), text: t("landing.steps.twoBody") }, { value: "03", title: t("landing.steps.threeTitle"), text: t("landing.steps.threeBody") }].map((item) => (
              <div key={item.value} className="flex gap-5 py-8 sm:px-7 sm:first:pl-0 sm:last:pr-0">
                <span className="font-serif text-2xl italic text-[#b46a48]">{item.value}</span><div><div className="font-semibold text-[#1b2a23]">{item.title}</div><p className="mt-1 text-sm leading-6 text-[#68746d]">{item.text}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section id="nasil-calisir" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
          <div className="grid gap-14 lg:grid-cols-[0.72fr_1.28fr] lg:gap-24">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a35f3d]">{t("landing.value.eyebrow")}</div>
              <h2 className="mt-5 text-5xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl">{t("landing.value.title")}</h2>
              <p className="mt-6 text-base leading-7 text-[#66726b]">{t("landing.value.intro")}</p>
              <Button variant="outline" onClick={() => navigate(`/site/${demoSubdomain}`)} className="mt-8 rounded-full border-[#173f32]/20 bg-transparent px-5 text-[#173f32] hover:bg-white">
                {t("landing.value.demo")} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {[{ icon: Sparkles, title: t("landing.value.siteTitle"), text: t("landing.value.siteBody"), tone: "bg-[#e5eee6] text-[#315d4b]" }, { icon: Home, title: t("landing.value.listingTitle"), text: t("landing.value.listingBody"), tone: "bg-[#f4e4dc] text-[#a35f3d]" }, { icon: FileText, title: t("landing.value.copyTitle"), text: t("landing.value.copyBody"), tone: "bg-[#ece7d8] text-[#766328]" }, { icon: Users, title: t("landing.value.leadTitle"), text: t("landing.value.leadBody"), tone: "bg-[#e6e9ef] text-[#415477]" }].map(({ icon: Icon, title, text, tone }) => (
                <Card key={title} className="rounded-[2rem] border-[#173f32]/10 bg-[#fbfaf7] shadow-none transition-transform duration-300 hover:-translate-y-1">
                  <CardContent className="p-7 sm:p-8"><div className={cn("grid h-12 w-12 place-items-center rounded-2xl", tone)}><Icon className="h-5 w-5" /></div><h3 className="mt-8 text-2xl font-semibold leading-tight">{title}</h3><p className="mt-3 text-sm leading-6 text-[#68746d]">{text}</p></CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="ozellikler" className="bg-[#173f32] py-24 text-white lg:py-32">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-3xl text-center"><Badge className="rounded-full border-white/15 bg-white/10 px-4 py-2 text-white hover:bg-white/10">{t("landing.management.eyebrow")}</Badge><h2 className="mt-6 text-5xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl">{t("landing.management.title")}</h2><p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/65">{t("landing.management.body")}</p></div>
            <div className="mt-16 grid gap-6 lg:grid-cols-[1.18fr_0.82fr]">
              <div className="overflow-hidden rounded-[2.25rem] border border-white/10 bg-[#f7f4ee] p-3 text-[#17231e] shadow-[0_30px_90px_rgba(0,0,0,0.22)] sm:p-5">
                <div className="rounded-[1.65rem] border border-[#173f32]/10 bg-white p-4 sm:p-6">
                  <div className="flex items-center justify-between"><div><div className="text-xs text-[#7a857e]">{t("landing.management.listings")}</div><div className="mt-1 text-xl font-semibold">{t("landing.management.activeListings")}</div></div><Button size="sm" className="rounded-full bg-[#173f32] text-white hover:bg-[#173f32]"> <Plus className="mr-1 h-3.5 w-3.5" /> {t("landing.management.newListing")}</Button></div>
                  <div className="mt-5 space-y-2.5">{previewListings.map((listing) => <div key={listing.id} className="grid grid-cols-[52px_1fr_auto] items-center gap-3 rounded-2xl border border-[#173f32]/8 bg-[#fbfaf7] p-2.5"><img src={listing.media[0]?.thumbUrl} alt="" className="h-12 w-12 rounded-xl object-cover" /><div className="min-w-0"><div className="truncate text-sm font-semibold">{listing.title}</div><div className="mt-1 text-[11px] text-[#7a857e]">{formatListingLocation(listing)} · {listing.m2} m² · {listing.room_count}</div></div><div className="text-right"><div className="text-xs font-semibold">{formatListingPrice(listing)}</div><Badge className="mt-1 bg-[#e4f0e9] text-[9px] text-[#326049] hover:bg-[#e4f0e9]">{t("landing.management.published")}</Badge></div></div>)}</div>
                </div>
              </div>
              <div className="grid gap-6">
                <Card className="rounded-[2.25rem] border-white/10 bg-white/10 text-white shadow-none"><CardContent className="p-8"><div className="flex items-start justify-between"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#d86f45]"><FileText className="h-5 w-5" /></div><Sparkles className="h-5 w-5 text-white/40" /></div><h3 className="mt-10 text-3xl font-semibold">{t("landing.management.copyReady")}</h3><p className="mt-3 leading-7 text-white/65">{t("landing.management.copyBody")}</p></CardContent></Card>
                <Card className="rounded-[2.25rem] border-white/10 bg-[#dbe5d2] text-[#173f32] shadow-none"><CardContent className="p-8"><div className="flex items-center justify-between"><div><div className="text-xs uppercase tracking-[0.18em] text-[#66786e]">{t("landing.management.newLead")}</div><div className="mt-2 text-xl font-semibold">{t("landing.management.sampleName")}</div></div><div className="grid h-11 w-11 place-items-center rounded-full bg-white"><Phone className="h-4 w-4" /></div></div><p className="mt-8 rounded-2xl bg-white/60 p-4 text-sm leading-6">{t("landing.management.sampleMessage")}</p></CardContent></Card>
              </div>
            </div>
          </div>
        </section>

        <section id="size-ozel" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
          <div className="overflow-hidden rounded-[2.75rem] border border-[#173f32]/10 bg-[#ebe7de] p-7 sm:p-10 lg:p-14">
            <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
              <div><div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a35f3d]">{t("landing.personal.eyebrow")}</div><h2 className="mt-5 text-5xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl">{t("landing.personal.title")}</h2><p className="mt-6 max-w-xl text-base leading-7 text-[#66726b]">{t("landing.personal.body")}</p><Button onClick={() => document.getElementById("site-olustur")?.scrollIntoView({ behavior: "smooth" })} className="mt-8 h-12 rounded-full bg-[#173f32] px-6 text-white hover:bg-[#0f3025]">{t("landing.personal.start")} <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                {[{ icon: MapPin, title: t("landing.personal.regionTitle"), text: t("landing.personal.regionBody") }, { icon: Sparkles, title: t("landing.personal.toneTitle"), text: t("landing.personal.toneBody") }, { icon: FileText, title: t("landing.personal.contentTitle"), text: t("landing.personal.contentBody") }].map(({ icon: Icon, title, text }) => <Card key={title} className="rounded-[1.5rem] border-[#173f32]/10 bg-white/70 shadow-none"><CardContent className="flex gap-4 p-5"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#dbe5d2] text-[#315d4b]"><Icon className="h-5 w-5" /></div><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm leading-6 text-[#68746d]">{text}</p></div></CardContent></Card>)}
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 pb-24 sm:px-8 lg:px-10 lg:pb-32">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.75rem] bg-[#d86f45] px-6 py-16 text-center text-white shadow-[0_28px_80px_rgba(216,111,69,0.22)] sm:px-12 lg:py-20">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/15"><Sparkles className="h-5 w-5" /></div><h2 className="mx-auto mt-7 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl">{t("landing.cta.title")}</h2><p className="mx-auto mt-5 max-w-xl text-base leading-7 text-white/80">{t("landing.cta.body")}</p><Button onClick={() => document.getElementById("site-olustur")?.scrollIntoView()} className="mt-8 h-12 rounded-full bg-white px-6 text-[#9e4e30] hover:bg-[#fff8f4]">{t("landing.cta.button")} <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
        </section>

        <section id="sss" className="border-t border-[#173f32]/10 bg-[#ebe7de]">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.7fr_1.3fr] lg:px-10 lg:py-24">
            <div><div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a35f3d]">{t("landing.faq.eyebrow")}</div><h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em]">{t("landing.faq.title")}</h2></div>
            <div className="divide-y divide-[#173f32]/12 border-y border-[#173f32]/12">{[1, 2, 3, 4].map((number) => ({ q: t(`landing.faq.q${number}`), a: t(`landing.faq.a${number}`) })).map((item) => <details key={item.q} className="group py-6"><summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-semibold"><span>{item.q}</span><Plus className="h-5 w-5 shrink-0 transition-transform group-open:rotate-45" /></summary><p className="max-w-2xl pt-4 text-sm leading-7 text-[#66726b]">{item.a}</p></details>)}</div>
          </div>
        </section>
      </main>

      <footer className="bg-[#13271f] text-white">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-10"><div className="flex flex-col gap-10 border-b border-white/10 pb-10 md:flex-row md:items-start md:justify-between"><div><Link to="/" className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#173f32]"><Home className="h-[18px] w-[18px]" /></div><span className="text-lg font-bold">{t("common.brand")}</span></Link><p className="mt-4 max-w-sm text-sm leading-6 text-white/55">{t("landing.footer.tagline")}</p></div><div className="grid grid-cols-2 gap-x-16 gap-y-3 text-sm text-white/65"><a href="#nasil-calisir" className="hover:text-white">{t("landing.nav.how")}</a><a href="#ozellikler" className="hover:text-white">{t("landing.nav.features")}</a><a href="#size-ozel" className="hover:text-white">{t("landing.nav.personal")}</a><a href="#sss" className="hover:text-white">{t("landing.nav.faq")}</a><Link to="/pricing" className="hover:text-white">{t("landing.nav.pricing")}</Link><button onClick={() => navigate("/login")} className="text-left hover:text-white">{t("landing.nav.login")}</button><button onClick={() => navigate(`/site/${demoSubdomain}`)} className="text-left hover:text-white">{t("landing.footer.demo")}</button></div></div><div className="flex flex-col gap-3 pt-8 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between"><span>{t("landing.footer.copyright", { year: new Date().getFullYear() })}</span><span>{t("landing.footer.market")}</span></div></div>
      </footer>
    </div>
  );
}

export function AuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPrompt = getPendingPrompt() || searchParams.get("prompt") || "";
  const { state } = usePortfoyAI();
  const { session } = useAuth();
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const generationStarted = useRef(false);

  usePageMeta(t("auth.resume.metaTitle"), t("auth.resume.metaDescription"));
  const preview = useMemo(() => generateThemeFromPrompt(prompt), [prompt]);
  const previewListings = state.listings.filter((listing) => listing.site_id === "site_demo").slice(0, 3);
  const displayConfig = {
    business_name: preview.profile.business_name,
    tone: preview.profile.tone,
    primary_color: preview.theme.primary,
    accent_color: preview.theme.accent,
    headline: t("landing.preview.headline"),
  };

  const handleGenerateSite = useCallback(async () => {
    if (!session || generationStarted.current || prompt.trim().length < 10) return;
    generationStarted.current = true;
    setIsGenerating(true);
    setGenerationError("");
    try {
      const response = await fetch("/api/generate-theme", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ prompt }),
      });
      const payload = await readApiJson<{ error?: string; code?: string; site_id?: string; slug?: string; public_path?: string; redirect_path?: string }>(response);
      if (response.status === 409 && payload.code === "SITE_LIMIT_REACHED") {
        toast.info(payload.error || t("auth.resume.siteLimit"));
        navigate(payload.redirect_path || "/dashboard", { replace: true });
        return;
      }
      if (!response.ok) throw new Error(payload.error || t("auth.resume.generationError"));
      if (!payload.site_id) throw new Error(t("auth.resume.missingId"));
      if (!payload.slug || !payload.public_path) throw new Error(t("auth.resume.missingUrl"));

      clearPendingPrompt();
      toast.success(t("auth.resume.readyToast", { path: payload.public_path }));
      navigate(payload.public_path);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("auth.resume.unexpectedError");
      console.error("[onboarding] generate-theme request failed", error);
      setGenerationError(message);
      toast.error(message);
      generationStarted.current = false;
    } finally {
      setIsGenerating(false);
    }
  }, [navigate, prompt, session, t]);

  useEffect(() => {
    void handleGenerateSite();
  }, [handleGenerateSite]);

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[#17231e]">
      <header className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Link to="/" className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-[#173f32] text-white"><Home className="h-[18px] w-[18px]" /></div><span className="text-lg font-bold tracking-[-0.03em]">{t("common.brand")}</span></Link>
        <div className="flex items-center gap-2"><LanguageToggle /><Link to="/" className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-[#66726b] transition hover:bg-white"><ArrowLeft className="h-4 w-4" />{t("auth.resume.backHome")}</Link></div>
      </header>

      <main className="mx-auto grid max-w-[1440px] gap-10 px-5 pb-12 pt-6 sm:px-8 lg:min-h-[calc(100vh-90px)] lg:grid-cols-[0.78fr_1.22fr] lg:items-center lg:px-10 lg:pb-16">
        <div className="mx-auto w-full max-w-xl">
          <div className="mb-8 flex items-center gap-2">{[{ no: "01", label: t("auth.resume.design"), done: true }, { no: "02", label: t("auth.resume.details"), done: false }, { no: "03", label: t("auth.resume.publish"), done: false }].map((step, index) => <div key={step.no} className="flex items-center gap-2"><div className={cn("grid h-8 w-8 place-items-center rounded-full text-[10px] font-semibold", step.done || index === 1 ? "bg-[#173f32] text-white" : "border border-[#173f32]/15 bg-white/50 text-[#7b857f]")}>{step.done ? <Check className="h-3.5 w-3.5" /> : step.no}</div><span className={cn("hidden text-xs sm:block", index === 1 ? "font-semibold text-[#173f32]" : "text-[#8a948e]")}>{step.label}</span>{index < 2 ? <div className="mx-1 h-px w-5 bg-[#173f32]/15 sm:w-8" /> : null}</div>)}</div>

          <Badge className="rounded-full border border-[#173f32]/10 bg-white/65 px-4 py-2 text-[#173f32] shadow-sm hover:bg-white/65"><Sparkles className="mr-2 h-3.5 w-3.5" />{t("auth.resume.title")}</Badge>
          <h1 className="mt-6 text-5xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-6xl">{t("auth.resume.subtitle")}</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-[#66726b]">{t("auth.resume.body")}</p>

          <Card className="mt-8 rounded-[2rem] border-[#173f32]/10 bg-[#fbfaf7] shadow-[0_22px_65px_rgba(39,52,45,0.10)]">
            <CardContent className="space-y-5 p-6 sm:p-7">
              <div className="space-y-2"><Label htmlFor="auth-prompt">{t("auth.resume.promptLabel")}</Label><Textarea id="auth-prompt" value={prompt} readOnly className="min-h-28 resize-none rounded-xl border-[#173f32]/10 bg-white leading-6" /></div>
              {generationError ? <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">{generationError}</div> : null}
              <Button className="h-12 w-full rounded-full bg-[#d86f45] text-white shadow-[0_10px_24px_rgba(216,111,69,0.22)] hover:bg-[#c76039]" onClick={() => { generationStarted.current = false; void handleGenerateSite(); }} disabled={isGenerating || prompt.trim().length < 10}><Sparkles className={cn("mr-2 h-4 w-4", isGenerating && "animate-spin")} />{isGenerating ? t("auth.resume.generating") : generationError ? t("auth.resume.retry") : t("auth.resume.generate")}</Button>
              <div className="flex items-center justify-center gap-2 text-[11px] text-[#7d8781]"><Check className="h-3.5 w-3.5 text-[#3b725d]" />{t("auth.resume.cacheNote")}</div>
            </CardContent>
          </Card>
        </div>

        <div className="relative mx-auto w-full max-w-[760px] lg:pl-6">
          <div className="absolute -inset-8 rounded-full bg-[#d9e4d1]/65 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2.35rem] border-[9px] border-[#222a26] bg-white shadow-[0_35px_100px_rgba(38,53,45,0.20)]">
            <div className="flex items-center justify-between border-b border-[#173f32]/10 bg-[#f7f5f0] px-5 py-3"><div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#e9a58b]"/><span className="h-2.5 w-2.5 rounded-full bg-[#e6cf86]"/><span className="h-2.5 w-2.5 rounded-full bg-[#9dc4a9]"/></div><div className="rounded-full bg-white px-4 py-1.5 text-[10px] text-[#748079]">{t("auth.resume.preview")}</div><Badge className="rounded-full bg-[#e0eee5] px-2.5 text-[9px] text-[#326049] hover:bg-[#e0eee5]">{t("auth.resume.ready")}</Badge></div>
            <div className="p-4 sm:p-5" style={getThemeStyles(preview.theme)}>
              <div className="overflow-hidden rounded-[1.8rem] text-white" style={{ background: `linear-gradient(145deg, ${displayConfig.primary_color}, ${displayConfig.accent_color})` }}><div className="flex items-center justify-between px-6 py-4 text-[9px] font-semibold uppercase tracking-[0.18em]"><span>{displayConfig.business_name}</span><div className="hidden gap-4 font-normal tracking-normal text-white/70 sm:flex"><span>{t("landing.preview.navListings")}</span><span>{t("landing.preview.navAbout")}</span><span>{t("landing.preview.navContact")}</span></div></div><div className="grid items-end gap-6 px-6 pb-8 pt-12 sm:grid-cols-[1fr_0.7fr] sm:px-8 sm:pb-10 sm:pt-16"><div><div className="text-[9px] uppercase tracking-[0.2em] text-white/55">{preview.profile.region_focus}</div><h2 className="mt-3 text-4xl font-semibold leading-none" style={{ fontFamily: preview.theme.fontPairing.heading }}>{displayConfig.headline}</h2><p className="mt-3 text-xs leading-5 text-white/70">{t("landing.preview.body")}</p></div><div className="hidden rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur sm:block"><div className="text-[8px] uppercase tracking-[0.16em] text-white/50">{t("auth.resume.brandTone")}</div><div className="mt-2 text-sm font-semibold">{displayConfig.tone}</div><div className="mt-1 text-[10px] text-white/60">{t("auth.resume.generatedBy")}</div></div></div></div>
              <div className="px-1 pb-2 pt-6"><div className="mb-4 flex items-end justify-between"><div><div className="text-[9px] uppercase tracking-[0.18em] text-[#839087]">{t("landing.preview.currentListings")}</div><div className="mt-1 text-xl font-semibold">{t("landing.preview.discover")}</div></div><span className="text-[10px] text-[#748079]">{t("landing.preview.viewAll")} →</span></div><div className="grid grid-cols-3 gap-3">{previewListings.map((listing) => <div key={listing.id} className="overflow-hidden rounded-xl border border-[#173f32]/10 bg-white"><img src={listing.media[0]?.thumbUrl} alt={listing.title} className="aspect-[4/3] w-full object-cover"/><div className="p-2.5"><div className="truncate text-[10px] font-semibold">{listing.title}</div><div className="mt-1 text-[9px] text-[#7a857e]">{formatListingLocation(listing)} · {listing.room_count}</div></div></div>)}</div></div>
            </div>
          </div>
          <div className="relative mx-auto mt-5 flex max-w-lg items-center justify-center gap-5 text-xs text-[#6f7a73]"><span className="inline-flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" />{t("auth.resume.tailored")}</span><span className="h-3 w-px bg-[#173f32]/15"/><span className="inline-flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{preview.profile.region_focus}</span></div>
        </div>
      </main>
    </div>
  );
}

export function GeneratedSitePreviewPage() {
  const { siteId = "" } = useParams();
  const { state } = usePortfoyAI();
  const { session, user } = useAuth();
  const [config, setConfig] = useState<GeneratedSiteConfig | null>(null);
  const [loadError, setLoadError] = useState("");
  const previewListings = state.listings.filter((listing) => listing.site_id === "site_demo").slice(0, 3);

  usePageMeta(
    config ? `${config.business_name} - Site Önizlemesi` : "Site önizlemesi yükleniyor",
    config?.headline || "Kaydedilmiş Fastate AI site önizlemesi.",
  );

  useEffect(() => {
    const controller = new AbortController();
    const loadSite = async () => {
      try {
        setLoadError("");
        const response = await fetch(`/api/sites/${encodeURIComponent(siteId)}`, {
          headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Site configuration could not be loaded.");
        setConfig(payload.config);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoadError(error instanceof Error ? error.message : "Unexpected site loading error");
      }
    };
    void loadSite();
    return () => controller.abort();
  }, [siteId, session]);

  if (loadError) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f4f1ea] px-5 text-[#17231e]">
        <Card className="w-full max-w-lg rounded-[2rem] border-[#173f32]/10 bg-white text-center shadow-sm">
          <CardContent className="p-8">
            <h1 className="text-2xl font-semibold">Site yüklenemedi</h1>
            <p className="mt-3 text-sm leading-6 text-[#66726b]">{loadError}</p>
            <Button asChild className="mt-6 rounded-full bg-[#173f32] text-white"><Link to="/">Ana sayfaya dön</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!config) {
    return <div className="grid min-h-screen place-items-center bg-[#f4f1ea] text-sm text-[#66726b]">Kaydedilmiş site yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f5f2eb] text-[#17231e]">
      <header className="border-b border-[#173f32]/10 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <Link to="/" className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-full text-white" style={{ backgroundColor: config.primary_color }}><Home className="h-[18px] w-[18px]" /></div><span className="font-semibold">{config.business_name}</span></Link>
          <div className="flex items-center gap-2"><Badge className="rounded-full bg-[#e0eee5] px-3 text-[#326049] hover:bg-[#e0eee5]">Kaydedilmiş taslak</Badge>{user ? <Button asChild className="rounded-full bg-[#173f32]"><Link to="/dashboard">Panele git</Link></Button> : <><Button asChild variant="outline" className="rounded-full"><Link to="/login">Giriş yap</Link></Button><Button asChild className="rounded-full bg-[#d86f45]"><Link to="/signup">Kaydol ve sahiplen</Link></Button></>}</div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10 lg:py-16">
          <div className="overflow-hidden rounded-[2.5rem] px-6 py-16 text-white shadow-[0_30px_90px_rgba(30,45,38,0.18)] sm:px-12 lg:px-16 lg:py-24" style={{ background: `linear-gradient(135deg, ${config.primary_color}, ${config.accent_color})` }}>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/65">{config.tone}</div>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">{config.headline}</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/75">Seçkin portföyler ve güvene dayalı kişisel gayrimenkul danışmanlığı.</p>
            <Button className="mt-8 rounded-full bg-white px-6 text-[#173f32] hover:bg-white/90">Portföyleri keşfedin <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:px-10">
          <div className="mb-7 flex items-end justify-between"><div><div className="text-xs uppercase tracking-[0.2em] text-[#78847d]">Güncel portföyler</div><h2 className="mt-2 text-3xl font-semibold">Öne çıkan yaşam alanları</h2></div></div>
          <div className="grid gap-5 sm:grid-cols-3">
            {previewListings.map((listing) => (
              <Card key={listing.id} className="overflow-hidden rounded-[1.5rem] border-[#173f32]/10 bg-white shadow-none">
                <img src={listing.media[0]?.url} alt={listing.title} className="aspect-[4/3] w-full object-cover" />
                <CardContent className="p-5"><h3 className="font-semibold">{listing.title}</h3><p className="mt-2 text-sm text-[#78837c]">{formatListingLocation(listing)} · {listing.room_count}</p><div className="mt-4 font-semibold" style={{ color: config.primary_color }}>{formatListingPrice(listing)}</div></CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export function PublicSitePage() {
  const { slug = "" } = useParams();
  const { state } = usePortfoyAI();
  const navigate = useNavigate();
  const [publicSite, setPublicSite] = useState<{
    id: string;
    slug: string;
    config: GeneratedSiteConfig;
  } | null>(null);
  const [isLoadingSite, setIsLoadingSite] = useState(true);
  const [siteLoadError, setSiteLoadError] = useState("");
  const [filters, setFilters] = useState({ query: "", district: "", type: "all", maxPrice: "" });

  useEffect(() => {
    const controller = new AbortController();
    const loadSite = async () => {
      try {
        setIsLoadingSite(true);
        setSiteLoadError("");
        const response = await fetch(`/api/public-sites/${encodeURIComponent(slug)}`, { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Site could not be loaded.");
        setPublicSite(payload);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setPublicSite(null);
        setSiteLoadError(error instanceof Error ? error.message : "Unexpected site loading error");
      } finally {
        if (!controller.signal.aborted) setIsLoadingSite(false);
      }
    };
    void loadSite();
    return () => controller.abort();
  }, [slug]);

  const site = publicSite ? {
    id: publicSite.id,
    subdomain: publicSite.slug,
    heroTitle: publicSite.config.headline,
    heroSubtitle: "Seçkin portföyler ve güvene dayalı kişisel gayrimenkul danışmanlığı.",
    theme_config: {
      primary: publicSite.config.primary_color,
      accent: publicSite.config.accent_color,
      fontPairing: { heading: "Cormorant Garamond, serif", body: "Inter, sans-serif" },
    },
  } : null;
  const agent = publicSite ? {
    businessName: publicSite.config.business_name,
    name: publicSite.config.business_name,
    region: "Türkiye",
    phone: "",
    bio: `${publicSite.config.tone} marka yaklaşımıyla çalışan bir gayrimenkul danışmanlığı markası.`,
  } : null;
  const listings = state.listings.filter((listing) => listing.site_id === "site_demo" && listing.status !== "passive");

  usePageMeta(
    site ? `${agent?.businessName || "Fastate AI"} - ${site.heroTitle}` : "Fastate AI - Site bulunamadı",
    site?.heroSubtitle || "Fastate AI public site",
  );

  const filteredListings = useMemo(
    () =>
      listings.filter((listing) => {
        if (filters.district && !formatListingLocation(listing).toLocaleLowerCase("tr-TR").includes(filters.district.toLocaleLowerCase("tr-TR"))) return false;
        if (filters.type !== "all" && listing.listing_type !== filters.type) return false;
        if (filters.query && !`${listing.title} ${listing.description}`.toLowerCase().includes(filters.query.toLowerCase())) return false;
        if (filters.maxPrice && listing.price > Number(filters.maxPrice)) return false;
        return true;
      }),
    [filters, listings],
  );

  if (isLoadingSite) {
    return <div className="grid min-h-screen place-items-center bg-[#f5f2ec] text-sm text-[#66726b]">Site yükleniyor...</div>;
  }

  if (!site || !agent) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
        <Card className="max-w-lg border-white/10 bg-white/5 text-white">
          <CardContent className="space-y-4 p-6 text-center">
            <div className="text-2xl font-semibold">Site bulunamadı</div>
            <p className="text-white/70">{siteLoadError || "Bu adres için tanımlı bir site yok."}</p>
            <Button onClick={() => navigate("/")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Ana sayfaya dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const featured = listings[0];

  return (
    <div className="min-h-screen bg-[#f5f2ec] text-[#18251f]" style={getThemeStyles(site.theme_config)}>
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
        <Link to={`/site/${site.subdomain}`} className="text-sm font-bold uppercase tracking-[0.2em]" style={{ color: site.theme_config.primary }}>{agent.businessName}</Link>
        <nav className="hidden items-center gap-8 text-sm text-[#66726b] md:flex"><a href="#portfoyler">Portföyler</a><a href="#hakkimda">Hakkımda</a><a href="#iletisim">İletişim</a></nav>
        <div className="flex items-center gap-3"><Badge variant="outline" className="hidden rounded-full border-[#173f32]/10 bg-white/70 text-[#66726b] sm:inline-flex">/site/{site.subdomain}</Badge><Button asChild className="rounded-full px-5 text-white" style={{ backgroundColor: site.theme_config.primary }}><a href="#iletisim"><Phone className="mr-2 h-4 w-4" />İletişim</a></Button></div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-5 pb-20 pt-8 sm:px-8 lg:px-10 lg:pb-28 lg:pt-14">
          <div className="grid items-stretch gap-6 lg:grid-cols-[0.88fr_1.12fr]">
            <div className="flex flex-col justify-between rounded-[2.5rem] p-8 text-white sm:p-12" style={{ background: `linear-gradient(145deg, ${site.theme_config.primary}, ${site.theme_config.accent})` }}>
              <div><div className="text-xs uppercase tracking-[0.24em] text-white/60">{agent.region} · Gayrimenkul danışmanlığı</div><h1 className="mt-8 text-5xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-6xl" style={{ fontFamily: site.theme_config.fontPairing.heading }}>{site.heroTitle}</h1><p className="mt-6 max-w-xl text-base leading-7 text-white/72">{site.heroSubtitle}</p></div>
              <div className="mt-14 flex flex-wrap items-center gap-4"><Button asChild className="rounded-full bg-white px-6 text-[#173f32] hover:bg-white/90"><a href="#portfoyler">Portföyleri keşfedin <ArrowRight className="ml-2 h-4 w-4" /></a></Button><div className="text-xs text-white/55">Yerel uzmanlık · Kişisel danışmanlık</div></div>
            </div>
            {featured ? <Link to={`/site/${site.subdomain}/listings/${featured.id}`} className="group relative min-h-[480px] overflow-hidden rounded-[2.5rem] lg:min-h-[620px]"><img src={featured.media[0]?.url} alt={featured.title} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" /><div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" /><div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-9"><Badge className="rounded-full border-white/20 bg-white/15 text-white backdrop-blur hover:bg-white/15">Öne çıkan portföy</Badge><div className="mt-4 flex items-end justify-between gap-4"><div><h2 className="text-3xl font-semibold sm:text-4xl" style={{ fontFamily: site.theme_config.fontPairing.heading }}>{featured.title}</h2><div className="mt-2 text-sm text-white/70">{featured.district} · {featured.room_count} · {featured.m2} m²</div></div><div className="shrink-0 text-xl font-semibold sm:text-2xl">{formatListingPrice(featured)}</div></div></div></Link> : null}
          </div>
        </section>

        <section id="portfoyler" className="border-y border-[#173f32]/10 bg-[#eeebe4] py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><div className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: site.theme_config.accent }}>Seçkin portföyler</div><h2 className="mt-4 text-5xl font-semibold tracking-[-0.045em] sm:text-6xl" style={{ fontFamily: site.theme_config.fontPairing.heading }}>Size uygun yaşam alanını bulun.</h2></div><p className="max-w-md text-sm leading-6 text-[#69756e]">Her portföyü yerinde inceliyor, doğru bilgi ve şeffaf iletişimle sunuyoruz.</p></div>

            <div className="mt-10 grid gap-3 rounded-[1.6rem] border border-[#173f32]/10 bg-white p-3 shadow-sm md:grid-cols-[1.25fr_0.8fr_0.8fr_0.8fr_auto]">
              <div className="relative"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a948e]" /><Input placeholder="Portföy ara" value={filters.query} onChange={(e) => setFilters((current) => ({ ...current, query: e.target.value }))} className="h-12 rounded-xl border-0 bg-[#f5f3ee] pl-11 shadow-none" /></div>
              <Input placeholder="Bölge" value={filters.district} onChange={(e) => setFilters((current) => ({ ...current, district: e.target.value }))} className="h-12 rounded-xl border-0 bg-[#f5f3ee] shadow-none" />
              <Select value={filters.type} onValueChange={(value) => setFilters((current) => ({ ...current, type: value }))}><SelectTrigger className="h-12 rounded-xl border-0 bg-[#f5f3ee] shadow-none"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tüm ilanlar</SelectItem><SelectItem value="sale">Satılık</SelectItem><SelectItem value="rent">Kiralık</SelectItem></SelectContent></Select>
              <Input placeholder="Maks. fiyat" type="number" value={filters.maxPrice} onChange={(e) => setFilters((current) => ({ ...current, maxPrice: e.target.value }))} className="h-12 rounded-xl border-0 bg-[#f5f3ee] shadow-none" />
              <div className="grid h-12 place-items-center rounded-xl px-5 text-sm text-white" style={{ backgroundColor: site.theme_config.primary }}>{filteredListings.length} portföy</div>
            </div>

            <div className="mt-10 grid gap-x-5 gap-y-10 md:grid-cols-2 lg:grid-cols-3">{filteredListings.map((listing) => <Link to={`/site/${site.subdomain}/listings/${listing.id}`} key={listing.id} className="group"><div className="relative overflow-hidden rounded-[2rem]"><img src={listing.media[0]?.thumbUrl} alt={listing.title} className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-105" /><div className="absolute left-4 top-4 flex gap-2"><Badge className="rounded-full bg-white/90 text-[#173f32] backdrop-blur hover:bg-white">{listing.listing_type === "sale" ? "Satılık" : "Kiralık"}</Badge><Badge className="rounded-full bg-black/35 text-white backdrop-blur hover:bg-black/35">{formatListingLocation(listing)}</Badge></div><div className="absolute bottom-4 right-4 grid h-11 w-11 place-items-center rounded-full bg-white text-[#173f32] transition-transform group-hover:translate-x-1"><ArrowRight className="h-4 w-4" /></div></div><div className="px-1 pt-5"><div className="flex items-start justify-between gap-4"><h3 className="text-2xl font-semibold leading-tight" style={{ fontFamily: site.theme_config.fontPairing.heading }}>{listing.title}</h3><div className="shrink-0 font-semibold">{formatListingPrice(listing)}</div></div><div className="mt-3 flex items-center gap-4 text-xs text-[#738078]"><span>{listing.room_count} oda</span><span>{listing.m2} m²</span><span>{listing.features[0]}</span></div></div></Link>)}</div>
          </div>
        </section>

        <section id="hakkimda" className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:px-10 lg:py-32">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-[2.5rem]" style={{ background: `linear-gradient(145deg, ${site.theme_config.primary}22, ${site.theme_config.accent}88)` }}><div className="absolute inset-8 flex flex-col justify-end rounded-[1.8rem] border border-white/40 bg-white/30 p-7 backdrop-blur-sm"><div className="grid h-20 w-20 place-items-center rounded-full bg-white text-2xl font-semibold" style={{ color: site.theme_config.primary }}>{agent.name.split(" ").map((part) => part[0]).join("")}</div><div className="mt-6 text-3xl font-semibold" style={{ fontFamily: site.theme_config.fontPairing.heading }}>{agent.name}</div><div className="mt-2 text-sm text-[#5f7067]">Gayrimenkul danışmanı · {agent.region}</div></div></div>
          <div><div className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: site.theme_config.accent }}>Tanışalım</div><h2 className="mt-5 max-w-2xl text-5xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl" style={{ fontFamily: site.theme_config.fontPairing.heading }}>Doğru karar, güvenilir bir danışmanlıkla başlar.</h2><p className="mt-7 max-w-xl text-base leading-8 text-[#657169]">{agent.bio} Her portföyde ihtiyaçlarınızı dinleyen, bölge bilgisini veriye dayalı değerlendirmelerle birleştiren kişisel bir yaklaşım sunuyorum.</p><div className="mt-8 flex flex-wrap gap-3"><Button asChild className="rounded-full px-6 text-white" style={{ backgroundColor: site.theme_config.primary }}><a href={`tel:${agent.phone}`}><Phone className="mr-2 h-4 w-4" />{agent.phone}</a></Button><Button variant="outline" className="rounded-full border-[#173f32]/15 bg-transparent px-6"><MapPin className="mr-2 h-4 w-4" />{agent.region}</Button></div></div>
        </section>

        <section id="iletisim" className="px-5 pb-20 sm:px-8 lg:px-10"><div className="mx-auto grid max-w-7xl gap-8 overflow-hidden rounded-[2.75rem] p-8 text-white sm:p-12 lg:grid-cols-[0.9fr_1.1fr] lg:p-16" style={{ backgroundColor: site.theme_config.primary }}><div><div className="text-xs uppercase tracking-[0.22em] text-white/55">İletişim</div><h2 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl" style={{ fontFamily: site.theme_config.fontPairing.heading }}>Yeni evinizi birlikte bulalım.</h2><p className="mt-4 max-w-md text-sm leading-7 text-white/65">Aradığınız portföyü tarif edin; size en kısa sürede kişisel olarak dönüş yapayım.</p></div><Card className="rounded-[2rem] border-0 bg-white text-[#17231e] shadow-none"><CardContent className="p-6 sm:p-7"><PublicContactForm siteId={site.id} /></CardContent></Card></div></section>
      </main>

      <footer className="border-t border-[#173f32]/10 bg-[#ece8df]"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-10 text-sm text-[#69756e] sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10"><div><div className="font-bold uppercase tracking-[0.18em]" style={{ color: site.theme_config.primary }}>{agent.businessName}</div><div className="mt-2 text-xs">{agent.region} gayrimenkul danışmanlığı</div></div><div className="flex gap-6"><a href="#portfoyler">Portföyler</a><a href="#hakkimda">Hakkımda</a><a href="#iletisim">İletişim</a></div><div className="text-xs">Fastate AI ile hazırlandı</div></div></footer>
    </div>
  );
}

export function ListingDetailPage() {
  const { subdomain, listingId } = useParams();
  const { state } = usePortfoyAI();
  const navigate = useNavigate();
  const site = state.sites.find((item) => item.subdomain === subdomain);
  const listing = state.listings.find((item) => item.id === listingId);
  const agent = state.agents.find((item) => item.id === site?.agent_id);

  usePageMeta(
    listing ? `${listing.title} - Fastate AI` : "Fastate AI - İlan",
    listing?.description || "İlan detay sayfası",
  );

  if (!site || !listing || !agent) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
        <Card className="max-w-lg">
          <CardContent className="space-y-4 p-6 text-center">
            <div className="text-2xl font-semibold">İlan bulunamadı</div>
            <Button onClick={() => navigate(`/site/${subdomain}`)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Siteye dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f2ec] text-[#18251f]" style={getThemeStyles(site.theme_config)}>
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10"><Link to={`/site/${site.subdomain}`} className="text-sm font-bold uppercase tracking-[0.2em]" style={{ color: site.theme_config.primary }}>{agent.businessName}</Link><Button variant="ghost" onClick={() => navigate(`/site/${site.subdomain}`)} className="rounded-full text-[#536159]"><ArrowLeft className="mr-2 h-4 w-4" />Tüm portföyler</Button></header>

      <main className="mx-auto max-w-7xl px-5 pb-24 sm:px-8 lg:px-10">
        <div className="mb-10 mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex flex-wrap gap-2"><Badge className="rounded-full px-3 py-1 text-white" style={{ backgroundColor: site.theme_config.primary }}>{listing.listing_type === "sale" ? "Satılık" : "Kiralık"}</Badge><Badge variant="outline" className="rounded-full border-[#173f32]/15 bg-white/50">{formatListingLocation(listing)}</Badge></div><h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl" style={{ fontFamily: site.theme_config.fontPairing.heading }}>{listing.title}</h1></div><div className="text-left lg:text-right"><div className="text-sm text-[#77827b]">Satış fiyatı</div><div className="mt-1 text-3xl font-semibold">{formatListingPrice(listing)}</div></div></div>

        <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]"><img src={listing.media[0]?.url} alt={listing.title} className="aspect-[16/10] h-full w-full rounded-[2.5rem] object-cover" /><div className="grid grid-cols-2 gap-4 lg:grid-cols-1">{listing.media.slice(1,3).map((item) => <img key={item.id} src={item.url} alt={item.alt} className="h-full min-h-0 w-full rounded-[2rem] object-cover" />)}<div className="flex min-h-[150px] flex-col justify-end rounded-[2rem] p-6 text-white" style={{ background: `linear-gradient(145deg, ${site.theme_config.primary}, ${site.theme_config.accent})` }}><div className="text-xs uppercase tracking-[0.18em] text-white/55">Konum</div><div className="mt-2 flex items-center gap-2 text-xl font-semibold"><MapPin className="h-5 w-5" />{formatListingLocation(listing)}, İstanbul</div></div></div></div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
          <div>
            <div className="grid grid-cols-3 divide-x divide-[#173f32]/12 rounded-[1.8rem] border border-[#173f32]/10 bg-white/60 py-6 text-center"><div><div className="text-xs text-[#7b857f]">Oda sayısı</div><div className="mt-2 text-2xl font-semibold">{listing.room_count}</div></div><div><div className="text-xs text-[#7b857f]">Brüt alan</div><div className="mt-2 text-2xl font-semibold">{listing.m2} m²</div></div><div><div className="text-xs text-[#7b857f]">İlan tipi</div><div className="mt-2 text-2xl font-semibold">{listing.listing_type === "sale" ? "Satılık" : "Kiralık"}</div></div></div>
            <section className="border-b border-[#173f32]/10 py-10"><div className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: site.theme_config.accent }}>Portföy hakkında</div><h2 className="mt-4 text-3xl font-semibold" style={{ fontFamily: site.theme_config.fontPairing.heading }}>Yaşam alanının detayları</h2><p className="mt-5 max-w-3xl text-base leading-8 text-[#606d65]">{listing.description}</p></section>
            <section className="border-b border-[#173f32]/10 py-10"><h2 className="text-3xl font-semibold" style={{ fontFamily: site.theme_config.fontPairing.heading }}>Öne çıkan özellikler</h2><div className="mt-6 grid gap-3 sm:grid-cols-2">{listing.features.map((feature) => <div key={feature} className="flex items-center gap-3 rounded-2xl bg-[#ebece5] px-4 py-4 text-sm"><div className="grid h-7 w-7 place-items-center rounded-full bg-white"><Check className="h-3.5 w-3.5" style={{ color: site.theme_config.primary }} /></div>{feature}</div>)}</div></section>
            <section className="py-10"><h2 className="text-3xl font-semibold" style={{ fontFamily: site.theme_config.fontPairing.heading }}>Konum</h2><div className="mt-6 grid aspect-[16/7] place-items-center overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#dde6dc,#e8dfd4)]"><div className="text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white shadow-sm"><MapPin className="h-6 w-6" style={{ color: site.theme_config.primary }} /></div><div className="mt-4 font-semibold">{formatListingLocation(listing)}, İstanbul</div><div className="mt-1 text-xs text-[#718077]">Harita görünümü yakında</div></div></div></section>
          </div>

          <Card className="sticky top-6 rounded-[2rem] border-[#173f32]/10 bg-white shadow-[0_24px_70px_rgba(36,50,43,0.10)]"><CardHeader><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-full bg-[#dbe5d2] font-semibold" style={{ color: site.theme_config.primary }}>{agent.name.split(" ").map((part) => part[0]).join("")}</div><div><CardTitle className="text-lg">{agent.name}</CardTitle><CardDescription>{agent.region} bölge uzmanı</CardDescription></div></div><div className="pt-3"><CardTitle className="text-2xl" style={{ fontFamily: site.theme_config.fontPairing.heading }}>Bu portföyle ilgileniyorum</CardTitle><CardDescription className="mt-2 leading-6">Bilgilerinizi bırakın, size kısa süre içinde dönüş yapalım.</CardDescription></div></CardHeader><CardContent><LeadForm siteId={site.id} listingId={listing.id} source="listing-detail" /><Button variant="outline" asChild className="mt-3 w-full rounded-xl border-[#173f32]/12"><a href={`tel:${agent.phone}`}><Phone className="mr-2 h-4 w-4" />{agent.phone}</a></Button></CardContent></Card>
        </div>
      </main>

      <footer className="border-t border-[#173f32]/10 bg-[#ece8df]"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-8 text-xs text-[#6f7b73] sm:px-8 lg:px-10"><span>{agent.businessName}</span><span>Fastate AI ile hazırlandı</span></div></footer>
    </div>
  );
}

export function NotFoundPage() {
  usePageMeta("Fastate AI - Sayfa bulunamadı", "İstediğiniz sayfa bulunamadı.");
  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
      <Card className="max-w-lg border-white/10 bg-white/5 text-white">
        <CardContent className="space-y-4 p-6 text-center">
          <div className="text-2xl font-semibold">Sayfa bulunamadı</div>
          <p className="text-white/70">Aradığınız rota mevcut değil.</p>
          <Button asChild>
            <Link to="/">Ana sayfaya dön</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
