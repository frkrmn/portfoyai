import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ImageSlotDescriptor } from "@/templates/image-schema";
import { useTranslation } from "react-i18next";

export type SiteMedia = Record<string, string | string[]>;
const slotName = (key: string) => key.replace(/^media\./, "");

export function ImageEditor({ schema, media, previewUrl, previewVersion, saving, dirty, onChange, onSave }: { schema: ImageSlotDescriptor[]; media: SiteMedia; previewUrl: string; previewVersion: number; saving: boolean; dirty: boolean; onChange: (media: SiteMedia) => void; onSave: () => void }) {
  const { t } = useTranslation();
  const readFiles = async (files: FileList | null, max: number) => {
    if (!files?.length) return [];
    const selected = Array.from(files).slice(0, max);
    if (selected.some((file) => file.size > 1_500_000 || !["image/jpeg", "image/png", "image/webp"].includes(file.type))) throw new Error(t("dashboard.images.invalid"));
    return Promise.all(selected.map((file) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || "")); reader.onerror = reject; reader.readAsDataURL(file); })));
  };
  const set = (slot: ImageSlotDescriptor, value: string | string[]) => onChange({ ...media, [slotName(slot.key)]: value });
  const upload = async (slot: ImageSlotDescriptor, files: FileList | null) => {
    try {
      const current = slot.type === "gallery" && Array.isArray(media[slotName(slot.key)]) ? media[slotName(slot.key)] as string[] : [];
      const urls = await readFiles(files, slot.type === "gallery" ? Math.max(0, (slot.maxImages || 1) - current.length) : 1);
      if (!urls.length) return;
      set(slot, slot.type === "gallery" ? [...current, ...urls] : urls[0]);
    } catch (error) { window.alert(error instanceof Error ? error.message : t("dashboard.images.invalid")); }
  };
  const move = (slot: ImageSlotDescriptor, index: number, direction: -1 | 1) => {
    const current = [...(media[slotName(slot.key)] as string[] || [])]; const other = index + direction;
    if (other < 0 || other >= current.length) return; [current[index], current[other]] = [current[other], current[index]]; set(slot, current);
  };
  return <div className="grid gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
    <Card className="h-fit rounded-[2rem] border-[#173f32]/10 bg-[#fbfaf7] shadow-none"><CardHeader><CardTitle>{t("dashboard.images.title")}</CardTitle><CardDescription>{t("dashboard.images.description")}</CardDescription></CardHeader><CardContent className="space-y-5">{schema.length ? schema.map((slot) => { const value = media[slotName(slot.key)]; const images = slot.type === "gallery" ? Array.isArray(value) ? value : [] : typeof value === "string" && value ? [value] : []; return <section key={slot.key} className="rounded-2xl border bg-white p-4"><div className="font-semibold">{slot.label}</div><div className="mt-1 text-xs text-slate-500">{t("dashboard.images.recommended", { size: slot.recommendedSize })}{slot.type === "gallery" ? ` · ${images.length}/${slot.maxImages}` : ""}</div><div className="mt-3 space-y-2">{images.map((url, index) => <div key={`${url.slice(-30)}-${index}`} className="flex items-center gap-3 rounded-xl border p-2"><img src={url} alt="" className="h-20 w-28 rounded-lg object-cover" /><div className="ml-auto flex gap-1">{slot.type === "gallery" ? <><Button variant="ghost" size="icon" disabled={index === 0} onClick={() => move(slot, index, -1)}><ArrowUp className="h-4 w-4" /></Button><Button variant="ghost" size="icon" disabled={index === images.length - 1} onClick={() => move(slot, index, 1)}><ArrowDown className="h-4 w-4" /></Button></> : null}<Button variant="ghost" size="icon" onClick={() => set(slot, slot.type === "gallery" ? images.filter((_, itemIndex) => itemIndex !== index) : "")}><Trash2 className="h-4 w-4" /></Button></div></div>)}</div>{slot.type === "single" || images.length < (slot.maxImages || 1) ? <label className="mt-3 flex cursor-pointer items-center justify-center rounded-xl border border-dashed p-4 text-sm font-medium"><ImagePlus className="mr-2 h-4 w-4" />{t(images.length && slot.type === "single" ? "dashboard.images.replace" : "dashboard.images.add")}<Input className="hidden" type="file" multiple={slot.type === "gallery"} accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload(slot, event.target.files)} /></label> : null}</section>; }) : <p className="rounded-2xl border bg-white p-5 text-sm text-slate-500">{t("dashboard.images.empty")}</p>}<div className="sticky bottom-3 flex items-center gap-3 rounded-2xl border bg-white/95 p-4 shadow-lg"><Button onClick={onSave} disabled={saving || !dirty}>{t(saving ? "common.saving" : "dashboard.images.save")}</Button>{dirty ? <span className="text-xs text-amber-700">{t("dashboard.images.unsaved")}</span> : null}</div></CardContent></Card>
    <Card className="overflow-hidden rounded-[2rem] border-[#173f32]/10 bg-[#e9e7e1] shadow-none xl:sticky xl:top-24 xl:h-[calc(100vh-120px)]"><iframe key={previewVersion} title={t("dashboard.images.preview")} src={previewUrl} className="h-full w-full bg-white" /></Card>
  </div>;
}
