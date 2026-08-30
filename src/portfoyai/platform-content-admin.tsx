import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, ImagePlus, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "./auth";
import { mergePlatformContent, platformTextFields, setPlatformField, type PlatformContent } from "./platform-content";

const sectionLabels: Record<string, string> = { meta: "SEO", nav: "Navigasyon", hero: "Hero", preview: "Canlı site demosu", steps: "Üç adım", value: "Değer önerileri", management: "Yönetim demosu", personal: "Kişiselleştirme", cta: "Son çağrı", faq: "SSS", footer: "Footer" };
const fieldLabel = (path: string) => path.split(".").at(-1)!.replace(/([A-Z])/g, " $1").replace(/^(.)/, (letter) => letter.toUpperCase());

export function PlatformContentAdminPage() {
  const { i18n } = useTranslation();
  const { session } = useAuth();
  const [locale, setLocale] = useState<"tr" | "en">("tr");
  const [content, setContent] = useState<PlatformContent | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const defaults = useMemo(() => ({ ...(i18n.getResourceBundle(locale, "common")?.landing || {}), heroImageUrl: "/images/agents/neighborhood-street-hero.png" }), [i18n, locale]);

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    setContent(null);
    fetch(`/api/admin/platform-content?locale=${locale}`, { headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal })
      .then(async (response) => {
        if (response.status === 403) { setAllowed(false); return null; }
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "İçerik yüklenemedi.");
        setAllowed(true);
        return body;
      })
      .then((body) => body && setContent(mergePlatformContent(defaults, body.content)))
      .catch((error) => { if (error.name !== "AbortError") toast.error(error.message); });
    return () => controller.abort();
  }, [defaults, locale, session]);

  if (allowed === false) return <Navigate to="/dashboard" replace />;
  const grouped = content ? Object.entries(Object.groupBy(platformTextFields(content), (field) => field.path.split(".")[0])) : [];
  const uploadHero = (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 1_500_000) return toast.error("JPG, PNG veya WebP biçiminde, en fazla 1.5 MB görsel yükleyin.");
    const reader = new FileReader(); reader.onload = () => setContent((current) => current ? setPlatformField(current, "heroImageUrl", String(reader.result || "")) : current); reader.readAsDataURL(file);
  };
  const save = async () => {
    if (!session || !content) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/platform-content?locale=${locale}`, { method: "PATCH", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "İçerik kaydedilemedi.");
      toast.success(`${locale.toUpperCase()} landing içeriği güncellendi.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "İçerik kaydedilemedi."); }
    finally { setSaving(false); }
  };

  return <div className="min-h-screen bg-[#f2efe8] px-4 py-8 text-[#17231e] sm:px-8"><div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><Button asChild variant="ghost" className="-ml-4"><Link to="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Dashboard</Link></Button><h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">Platform landing içeriği</h1><p className="mt-2 text-sm text-slate-600">Fastate AI ana sayfasını agent sitelerinden bağımsız yönetin.</p></div><div className="flex gap-2">{(["tr", "en"] as const).map((item) => <Button key={item} variant={locale === item ? "default" : "outline"} onClick={() => setLocale(item)}>{item.toUpperCase()}</Button>)}</div></div>
    {!content ? <div className="mt-10 text-sm text-slate-500">İçerik yükleniyor...</div> : <div className="mt-8 space-y-6">
      <Card><CardHeader><CardTitle>Hero görseli</CardTitle><CardDescription>Önerilen ölçü: 1600x1000 · JPG, PNG veya WebP · en fazla 1.5 MB</CardDescription></CardHeader><CardContent><img src={String(content.heroImageUrl || defaults.heroImageUrl)} alt="Hero" className="aspect-[16/9] max-h-72 w-full rounded-2xl object-cover" /><Label className="mt-4 flex cursor-pointer items-center justify-center rounded-xl border border-dashed p-4"><ImagePlus className="mr-2 h-4 w-4" />Görseli değiştir<Input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => uploadHero(event.target.files?.[0])} /></Label></CardContent></Card>
      {grouped.map(([section, fields]) => <Card key={section}><CardHeader><CardTitle>{sectionLabels[section] || section}</CardTitle></CardHeader><CardContent className="grid gap-5 md:grid-cols-2">{fields!.map((field) => <div key={field.path} className={field.value.length > 90 ? "md:col-span-2" : ""}><Label>{fieldLabel(field.path)}</Label>{field.value.length > 90 ? <Textarea data-platform-field={field.path} className="mt-2 min-h-28" value={field.value} onChange={(event) => setContent(setPlatformField(content, field.path, event.target.value))} /> : <Input data-platform-field={field.path} className="mt-2" value={field.value} onChange={(event) => setContent(setPlatformField(content, field.path, event.target.value))} />}</div>)}</CardContent></Card>)}
      <div className="sticky bottom-5 flex justify-end"><Button data-platform-save disabled={saving} onClick={() => void save()} className="h-12 rounded-full bg-[#173f32] px-6"><Save className="mr-2 h-4 w-4" />{saving ? "Kaydediliyor..." : `${locale.toUpperCase()} içeriğini kaydet`}</Button></div>
    </div>}
  </div></div>;
}
