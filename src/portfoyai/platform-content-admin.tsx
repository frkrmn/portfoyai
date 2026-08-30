import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, ImagePlus, List, MousePointer2, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "./auth";
import { mergePlatformContent, platformTextFields, setPlatformField, type PlatformContent } from "./platform-content";
import { ContentEditor, type ContentRecord } from "./content-editor";

const sectionLabels: Record<string, string> = { meta: "SEO", nav: "Navigasyon", hero: "Hero", preview: "Canlı site demosu", steps: "Üç adım", value: "Değer önerileri", management: "Yönetim demosu", personal: "Kişiselleştirme", cta: "Son çağrı", faq: "SSS", footer: "Footer" };
const fieldLabel = (path: string) => path.split(".").at(-1)!.replace(/([A-Z])/g, " $1").replace(/^(.)/, (letter) => letter.toUpperCase());

export function PlatformContentAdminPage() {
  const { i18n } = useTranslation();
  const { session } = useAuth();
  const accessToken = session?.access_token || "";
  const [locale, setLocale] = useState<"tr" | "en">("tr");
  const [content, setContent] = useState<PlatformContent | null>(null);
  const [persistedContent, setPersistedContent] = useState<PlatformContent | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"visual" | "fields">("visual");
  const [previewVersion, setPreviewVersion] = useState(0);
  const defaults = useMemo(() => ({ ...(i18n.getResourceBundle(locale, "common")?.landing || {}), heroImageUrl: "/images/agents/neighborhood-street-hero.png" }), [i18n, locale]);

  useEffect(() => {
    if (!accessToken) return;
    window.localStorage.setItem("portfoyai_language", locale);
    document.cookie = `portfoyai_language=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    const controller = new AbortController();
    setContent(null);
    fetch(`/api/admin/platform-content?locale=${locale}`, { headers: { Authorization: `Bearer ${accessToken}` }, signal: controller.signal })
      .then(async (response) => {
        if (response.status === 403) { setAllowed(false); return null; }
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "İçerik yüklenemedi.");
        setAllowed(true);
        return body;
      })
      .then((body) => { if (!body) return; const merged = mergePlatformContent(defaults, body.content); setContent(merged); setPersistedContent(structuredClone(merged)); })
      .catch((error) => { if (error.name !== "AbortError") toast.error(error.message); });
    return () => controller.abort();
  }, [accessToken, defaults, locale]);

  if (allowed === false) return <Navigate to="/dashboard" replace />;
  const grouped = content ? Object.entries(Object.groupBy(platformTextFields(content), (field) => field.path.split(".")[0])) : [];
  const uploadHero = (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 1_500_000) return toast.error("JPG, PNG veya WebP biçiminde, en fazla 1.5 MB görsel yükleyin.");
    const reader = new FileReader(); reader.onload = () => setContent((current) => current ? setPlatformField(current, "heroImageUrl", String(reader.result || "")) : current); reader.readAsDataURL(file);
  };
  const save = async () => {
    if (!accessToken || !content) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/platform-content?locale=${locale}`, { method: "PATCH", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "İçerik kaydedilemedi.");
      setPersistedContent(structuredClone(content));
      setPreviewVersion((value) => value + 1);
      toast.success(`${locale.toUpperCase()} landing içeriği güncellendi.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "İçerik kaydedilemedi."); }
    finally { setSaving(false); }
  };

  const dirty = Boolean(content && persistedContent && JSON.stringify(content) !== JSON.stringify(persistedContent));
  const selectLocale = (item: "tr" | "en") => { window.localStorage.setItem("portfoyai_language", item); document.cookie = `portfoyai_language=${item}; Path=/; Max-Age=31536000; SameSite=Lax`; setLocale(item); setPreviewVersion((value) => value + 1); };
  return <div className="min-h-screen bg-[#f2efe8] px-4 py-8 text-[#17231e] sm:px-8"><div className="mx-auto max-w-[1600px]">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><Button asChild variant="ghost" className="-ml-4"><Link to="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Dashboard</Link></Button><h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">Platform landing içeriği</h1><p className="mt-2 text-sm text-slate-600">Ön izlemede değiştirmek istediğiniz metne çift tıklayın.</p></div><div className="flex flex-wrap gap-2"><Button variant={view === "visual" ? "default" : "outline"} onClick={() => setView("visual")}><MousePointer2 className="mr-2 h-4 w-4" />Görsel düzenleme</Button><Button variant={view === "fields" ? "default" : "outline"} onClick={() => setView("fields")}><List className="mr-2 h-4 w-4" />Tüm alanlar</Button>{(["tr", "en"] as const).map((item) => <Button key={item} variant={locale === item ? "default" : "outline"} onClick={() => selectLocale(item)}>{item.toUpperCase()}</Button>)}</div></div>
    {!content ? <div className="mt-10 text-sm text-slate-500">İçerik yükleniyor...</div> : <div className="mt-8 space-y-6">
      {view === "visual" ? <><div className="grid gap-4 lg:grid-cols-[1fr_280px]"><ContentEditor schema={[]} content={content as ContentRecord} previewUrl="/" previewVersion={previewVersion} onChange={(next) => setContent(next as PlatformContent)} onSave={() => void save()} saving={saving} dirty={dirty} /><Card className="h-fit"><CardHeader><CardTitle>Hero görseli</CardTitle><CardDescription>1600x1000 · en fazla 1.5 MB</CardDescription></CardHeader><CardContent><img src={String(content.heroImageUrl || defaults.heroImageUrl)} alt="Hero" className="aspect-[16/9] w-full rounded-2xl object-cover" /><Label className="mt-4 flex cursor-pointer items-center justify-center rounded-xl border border-dashed p-4 text-sm"><ImagePlus className="mr-2 h-4 w-4" />Değiştir<Input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => uploadHero(event.target.files?.[0])} /></Label></CardContent></Card></div></> : <>{grouped.map(([section, fields]) => <Card key={section}><CardHeader><CardTitle>{sectionLabels[section] || section}</CardTitle></CardHeader><CardContent className="grid gap-5 md:grid-cols-2">{fields!.map((field) => <div key={field.path} className={field.value.length > 90 ? "md:col-span-2" : ""}><Label>{fieldLabel(field.path)}</Label>{field.value.length > 90 ? <Textarea data-platform-field={field.path} className="mt-2 min-h-28" value={field.value} onChange={(event) => setContent(setPlatformField(content, field.path, event.target.value))} /> : <Input data-platform-field={field.path} className="mt-2" value={field.value} onChange={(event) => setContent(setPlatformField(content, field.path, event.target.value))} />}</div>)}</CardContent></Card>)}<div className="sticky bottom-5 flex justify-end"><Button data-platform-save disabled={saving || !dirty} onClick={() => void save()} className="h-12 rounded-full bg-[#173f32] px-6"><Save className="mr-2 h-4 w-4" />{saving ? "Kaydediliyor..." : `${locale.toUpperCase()} içeriğini kaydet`}</Button></div></>}
    </div>}
  </div></div>;
}
