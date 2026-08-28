import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ContentFieldDescriptor } from "@/templates/content-schema";
import { useTranslation } from "react-i18next";

type ContentValue = string | ContentRecord | ContentValue[];
export type ContentRecord = { [key: string]: ContentValue };

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

function BasicField({ field, value, onChange }: { field: ContentFieldDescriptor; value: string; onChange: (value: string) => void }) {
  return <div><Label>{field.label}</Label>{field.type === "textarea" ? <Textarea className="mt-2 min-h-28" value={value} onChange={(event) => onChange(event.target.value)} /> : <Input className="mt-2" value={value} onChange={(event) => onChange(event.target.value)} />}</div>;
}

function RepeatableField({ field, value, onChange }: { field: ContentFieldDescriptor; value: ContentValue[]; onChange: (value: ContentValue[]) => void }) {
  const { t } = useTranslation();
  const scalar = field.itemFields?.length === 1 && field.itemFields[0].key === "";
  const add = () => onChange([...value, scalar ? "" : Object.fromEntries((field.itemFields || []).map((item) => [item.key, ""]))]);
  const move = (index: number, direction: -1 | 1) => { const other = index + direction; if (other < 0 || other >= value.length) return; const next = [...value]; [next[index], next[other]] = [next[other], next[index]]; onChange(next); };
  return <div className="rounded-2xl border bg-white p-4"><div className="flex items-center justify-between gap-3"><Label>{field.label}</Label><Button type="button" variant="outline" size="sm" onClick={add}><Plus className="mr-2 h-4 w-4" />{t("dashboard.content.add")}</Button></div><div className="mt-4 space-y-3">{value.map((item, index) => <div key={index} className="rounded-xl border bg-[#fbfaf7] p-4"><div className="mb-3 flex justify-end gap-1"><Button type="button" variant="ghost" size="icon" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" disabled={index === value.length - 1} onClick={() => move(index, 1)}><ArrowDown className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4" /></Button></div><div className="space-y-3">{(field.itemFields || []).map((itemField) => <BasicField key={itemField.key || "value"} field={itemField} value={scalar ? String(item || "") : String((item as ContentRecord)?.[itemField.key] || "")} onChange={(nextValue) => onChange(value.map((entry, itemIndex) => itemIndex !== index ? entry : scalar ? nextValue : { ...(entry as ContentRecord), [itemField.key]: nextValue }))} />)}</div></div>)}</div></div>;
}

export function ContentEditor({ schema, content, onChange, onSave, saving, dirty }: { schema: ContentFieldDescriptor[]; content: ContentRecord; onChange: (content: ContentRecord) => void; onSave: () => void; saving: boolean; dirty: boolean }) {
  const { t } = useTranslation();
  return <Card className="rounded-[2rem] border-[#173f32]/10 bg-[#fbfaf7] shadow-none"><CardHeader><CardTitle>{t("dashboard.content.title")}</CardTitle><CardDescription>{t("dashboard.content.description")}</CardDescription></CardHeader><CardContent className="space-y-5">{schema.map((field) => field.type === "array-of-objects" ? <RepeatableField key={field.key} field={field} value={Array.isArray(getValue(content, field.key)) ? getValue(content, field.key) as ContentValue[] : []} onChange={(value) => onChange(setValue(content, field.key, value))} /> : <BasicField key={field.key} field={field} value={String(getValue(content, field.key) || "")} onChange={(value) => onChange(setValue(content, field.key, value))} />)}<div className="sticky bottom-4 flex items-center gap-3 rounded-2xl border bg-white/95 p-4 shadow-lg backdrop-blur"><Button onClick={onSave} disabled={saving || !dirty}>{t(saving ? "common.saving" : "dashboard.content.save")}</Button>{dirty ? <span className="text-xs text-amber-700">{t("dashboard.content.unsaved")}</span> : null}</div></CardContent></Card>;
}
