import { useRef, useState, type ChangeEvent } from "react";
import { ArrowDown, ArrowUp, ExternalLink, Monitor, Plus, Smartphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ContentFieldDescriptor } from "@/templates/content-schema";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type ContentValue = string | ContentRecord | ContentValue[];
export type ContentRecord = { [key: string]: ContentValue };
type FieldFocus = (instanceKey: string, value: string) => void;

const relativePath = (key: string) => key.replace(/^content\./, "").split(".").filter(Boolean);
const getValue = (content: ContentRecord, key: string): ContentValue | undefined => relativePath(key).reduce<ContentValue | undefined>((current, part) => current && !Array.isArray(current) && typeof current === "object" ? current[part] : undefined, content);
const setValue = (content: ContentRecord, key: string, value: ContentValue): ContentRecord => {
  const next = structuredClone(content);
  const parts = relativePath(key);
  let cursor: ContentRecord = next;
  parts.forEach((part, index) => {
    if (index === parts.length - 1) cursor[part] = value;
    else {
      if (!cursor[part] || Array.isArray(cursor[part]) || typeof cursor[part] !== "object") cursor[part] = {};
      cursor = cursor[part] as ContentRecord;
    }
  });
  return next;
};

function BasicField({ field, value, instanceKey, selected, onFocus, onChange }: { field: ContentFieldDescriptor; value: string; instanceKey: string; selected: boolean; onFocus: FieldFocus; onChange: (value: string) => void }) {
  const control = { value, onFocus: () => onFocus(instanceKey, value), onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value) };
  return <div className={cn("rounded-xl border p-3 transition", selected ? "border-[#d86f45] bg-[#fff7f2] shadow-sm" : "border-transparent")}><Label>{field.label}</Label>{field.type === "textarea" ? <Textarea className="mt-2 min-h-28 bg-white" {...control} /> : <Input className="mt-2 bg-white" {...control} />}</div>;
}

function RepeatableField({ field, value, selectedKey, onFocus, onPreviewText, onChange }: { field: ContentFieldDescriptor; value: ContentValue[]; selectedKey: string; onFocus: FieldFocus; onPreviewText: (instanceKey: string, previous: string, next: string) => void; onChange: (value: ContentValue[]) => void }) {
  const { t } = useTranslation();
  const scalar = field.itemFields?.length === 1 && field.itemFields[0].key === "";
  const add = () => onChange([...value, scalar ? "" : Object.fromEntries((field.itemFields || []).map((item) => [item.key, ""]))]);
  const move = (index: number, direction: -1 | 1) => { const other = index + direction; if (other < 0 || other >= value.length) return; const next = [...value]; [next[index], next[other]] = [next[other], next[index]]; onChange(next); };
  return <div className="rounded-2xl border bg-white p-4"><div className="flex items-center justify-between gap-3"><Label>{field.label}</Label><Button type="button" variant="outline" size="sm" onClick={add}><Plus className="mr-2 h-4 w-4" />{t("dashboard.content.add")}</Button></div><div className="mt-4 space-y-3">{value.map((item, index) => <div key={index} className="rounded-xl border bg-[#fbfaf7] p-3"><div className="mb-2 flex justify-end gap-1"><Button type="button" variant="ghost" size="icon" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" disabled={index === value.length - 1} onClick={() => move(index, 1)}><ArrowDown className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4" /></Button></div><div className="space-y-2">{(field.itemFields || []).map((itemField) => { const instanceKey = `${field.key}.${index}.${itemField.key || "value"}`; const currentValue = scalar ? String(item || "") : String((item as ContentRecord)?.[itemField.key] || ""); return <BasicField key={itemField.key || "value"} field={itemField} instanceKey={instanceKey} selected={selectedKey === instanceKey} value={currentValue} onFocus={onFocus} onChange={(nextValue) => { onPreviewText(instanceKey, currentValue, nextValue); onChange(value.map((entry, itemIndex) => itemIndex !== index ? entry : scalar ? nextValue : { ...(entry as ContentRecord), [itemField.key]: nextValue })); }} />; })}</div></div>)}</div></div>;
}

export function ContentEditor({ schema, content, previewUrl, previewVersion, onChange, onSave, saving, dirty }: { schema: ContentFieldDescriptor[]; content: ContentRecord; previewUrl: string; previewVersion: number; onChange: (content: ContentRecord) => void; onSave: () => void; saving: boolean; dirty: boolean }) {
  const { t } = useTranslation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewNodes = useRef(new Map<string, { node: Text; value: string; element: HTMLElement }>());
  const [selectedKey, setSelectedKey] = useState("");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const clearHighlight = () => previewNodes.current.forEach(({ element }) => { element.style.outline = ""; element.style.outlineOffset = ""; });
  const locate = (instanceKey: string, value: string) => {
    setSelectedKey(instanceKey);
    const document = iframeRef.current?.contentDocument;
    if (!document || !value.trim()) return;
    clearHighlight();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    while (current) {
      if ((current.nodeValue || "").includes(value)) {
        const element = current.parentElement;
        if (element) {
          element.style.outline = "3px solid #d86f45";
          element.style.outlineOffset = "5px";
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          previewNodes.current.set(instanceKey, { node: current as Text, value, element });
        }
        return;
      }
      current = walker.nextNode();
    }
  };
  const updatePreviewText = (instanceKey: string, previous: string, next: string) => {
    let match = previewNodes.current.get(instanceKey);
    if (!match) { locate(instanceKey, previous); match = previewNodes.current.get(instanceKey); }
    if (!match) return;
    match.node.nodeValue = (match.node.nodeValue || "").replace(match.value, next);
    previewNodes.current.set(instanceKey, { ...match, value: next });
  };

  return <div className="grid min-h-[760px] gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
    <Card className="h-fit rounded-[2rem] border-[#173f32]/10 bg-[#fbfaf7] shadow-none xl:max-h-[calc(100vh-150px)] xl:overflow-y-auto"><CardHeader><CardTitle>{t("dashboard.content.title")}</CardTitle><CardDescription>{t("dashboard.content.description")}</CardDescription></CardHeader><CardContent className="space-y-4">{schema.map((field) => field.type === "array-of-objects" ? <RepeatableField key={field.key} field={field} value={Array.isArray(getValue(content, field.key)) ? getValue(content, field.key) as ContentValue[] : []} selectedKey={selectedKey} onFocus={locate} onPreviewText={updatePreviewText} onChange={(value) => onChange(setValue(content, field.key, value))} /> : <BasicField key={field.key} field={field} instanceKey={field.key} selected={selectedKey === field.key} value={String(getValue(content, field.key) || "")} onFocus={locate} onChange={(value) => { const previous = String(getValue(content, field.key) || ""); updatePreviewText(field.key, previous, value); onChange(setValue(content, field.key, value)); }} />)}<div className="sticky bottom-3 flex items-center gap-3 rounded-2xl border bg-white/95 p-4 shadow-lg backdrop-blur"><Button onClick={onSave} disabled={saving || !dirty}>{t(saving ? "common.saving" : "dashboard.content.save")}</Button>{dirty ? <span className="text-xs text-amber-700">{t("dashboard.content.unsaved")}</span> : null}</div></CardContent></Card>
    <Card className="overflow-hidden rounded-[2rem] border-[#173f32]/10 bg-[#e9e7e1] shadow-none xl:sticky xl:top-24 xl:h-[calc(100vh-120px)]"><div className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-3"><div><div className="text-sm font-semibold">{t("dashboard.content.previewTitle")}</div><div className="text-xs text-[#69756e]">{t("dashboard.content.previewHelp")}</div></div><div className="flex items-center gap-1"><Button type="button" variant={device === "desktop" ? "secondary" : "ghost"} size="icon" onClick={() => setDevice("desktop")} aria-label={t("dashboard.content.desktop")}><Monitor className="h-4 w-4" /></Button><Button type="button" variant={device === "mobile" ? "secondary" : "ghost"} size="icon" onClick={() => setDevice("mobile")} aria-label={t("dashboard.content.mobile")}><Smartphone className="h-4 w-4" /></Button><Button asChild variant="ghost" size="icon"><a href={previewUrl} target="_blank" rel="noreferrer" aria-label={t("dashboard.content.openPreview")}><ExternalLink className="h-4 w-4" /></a></Button></div></div><div className="flex h-[calc(100%-65px)] justify-center overflow-auto p-3"><iframe ref={iframeRef} key={previewVersion} title={t("dashboard.content.previewTitle")} src={previewUrl} onLoad={() => { previewNodes.current.clear(); setSelectedKey(""); }} className={cn("h-full bg-white shadow-xl transition-all", device === "mobile" ? "w-[390px] max-w-full rounded-[1.5rem]" : "w-full")} /></div></Card>
  </div>;
}
