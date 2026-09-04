import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ExternalLink, Info, Languages, ListTree, Monitor, Pencil, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { contentFieldLabel, type ContentFieldDescriptor } from "@/templates/content-schema";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { countMissingEnglish, isLocalizedText, isTranslatableContentPath, resolveStoredContent, translatableRootFields, type LocalizedText } from "@/templates/content-localization";

type ContentValue = string | ContentRecord | ContentValue[];
export type ContentRecord = { [key: string]: ContentValue };
type EditableEntry = { key: string; value: string };

const relativePath = (key: string) => key.replace(/^content\./, "").split(".").filter(Boolean);
export const editableEntries = (content: ContentRecord, locale: "tr" | "en"): EditableEntry[] => {
  const entries: EditableEntry[] = [];
  const visit = (value: ContentValue, parts: string[]) => {
    if (isLocalizedText(value)) {
      const resolved = resolveStoredContent<string>(value, locale);
      if (resolved.trim()) entries.push({ key: `content.${parts.join(".")}`, value: resolved });
      return;
    }
    if (typeof value === "string") {
      if (value.trim()) entries.push({ key: `content.${parts.join(".")}`, value });
      return;
    }
    if (Array.isArray(value)) value.forEach((item, index) => visit(item, [...parts, String(index)]));
    else if (value && typeof value === "object") Object.entries(value).forEach(([key, item]) => visit(item, [...parts, key]));
  };
  Object.entries(content).forEach(([key, value]) => visit(value, [key]));
  return entries.sort((a, b) => b.value.length - a.value.length);
};

export const setInstanceValue = (content: ContentRecord, key: string, value: string, locale: "tr" | "en"): ContentRecord => {
  const next = structuredClone(content);
  const parts = relativePath(key);
  let cursor: ContentRecord | ContentValue[] = next;
  parts.forEach((part, index) => {
    const last = index === parts.length - 1;
    const arrayIndex = Array.isArray(cursor) ? Number(part) : null;
    if (last) {
      const current = Array.isArray(cursor) ? cursor[arrayIndex!] : cursor[part];
      const localized = isLocalizedText(current) || isTranslatableContentPath(parts)
        ? { ...(isLocalizedText(current) ? current : { tr: String(current || "") }), [locale]: value } as LocalizedText
        : value;
      if (Array.isArray(cursor)) cursor[arrayIndex!] = localized as ContentValue;
      else cursor[part] = localized as ContentValue;
      return;
    }
    const nextPart = parts[index + 1];
    const child = Array.isArray(cursor) ? cursor[arrayIndex!] : cursor[part];
    if (!child || typeof child !== "object") {
      const replacement: ContentRecord | ContentValue[] = /^\d+$/.test(nextPart) ? [] : {};
      if (Array.isArray(cursor)) cursor[arrayIndex!] = replacement;
      else cursor[part] = replacement;
      cursor = replacement;
    } else cursor = child as ContentRecord | ContentValue[];
  });
  return next;
};

const valueAt = (content: ContentRecord, key: string, locale: "tr" | "en") => {
  let value: ContentValue | undefined = content;
  for (const part of relativePath(key)) value = Array.isArray(value) ? value[Number(part)] : value && typeof value === "object" ? value[part] : undefined;
  return typeof value === "string" ? value : isLocalizedText(value) ? (locale === "en" ? value.en || "" : value.tr) : "";
};

function LocaleTabs({ value, onChange }: { value: "tr" | "en"; onChange: (locale: "tr" | "en") => void }) {
  return <div className="inline-flex rounded-full border bg-slate-50 p-0.5"><button type="button" onClick={() => onChange("tr")} className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", value === "tr" && "bg-[#173f32] text-white")}>TR</button><button type="button" onClick={() => onChange("en")} className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", value === "en" && "bg-[#173f32] text-white")}>EN</button></div>;
}

export function ContentEditor({ schema, content, previewUrl, previewVersion, onChange, onSave, onTranslateMissing, saving, translating = false, dirty }: { schema: ContentFieldDescriptor[]; content: ContentRecord; previewUrl: string; previewVersion: number; onChange: (content: ContentRecord) => void; onSave: () => void; onTranslateMissing?: () => void | Promise<void>; saving: boolean; translating?: boolean; dirty: boolean }) {
  const { t } = useTranslation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const contentRef = useRef(content);
  const onChangeRef = useRef(onChange);
  const observerRef = useRef<MutationObserver | null>(null);
  const guardedDocumentRef = useRef<Document | null>(null);
  const editingRef = useRef(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [contentLocale, setContentLocale] = useState<"tr" | "en">("tr");
  const [editing, setEditing] = useState(false);
  const [hideLocked, setHideLocked] = useState(false);
  const [lockedCount, setLockedCount] = useState(0);
  const [view, setView] = useState<"preview" | "fields">("preview");
  const [fieldLocales, setFieldLocales] = useState<Record<string, "tr" | "en">>({});
  const missingEnglish = countMissingEnglish(content);
  const schemaRootKeys = new Set(schema.map((field) => relativePath(field.key)[0]));
  const supplementalArrays: Record<string, ContentFieldDescriptor> = {
    stats: { key: "content.stats", label: "İstatistikler", type: "array-of-objects", itemFields: [{ key: "label", label: "Etiket", type: "text" }] },
    whyItems: { key: "content.whyItems", label: "Neden biz maddeleri", type: "array-of-objects", itemFields: [{ key: "title", label: "Başlık", type: "text" }, { key: "description", label: "Açıklama", type: "textarea" }] },
    neighborhoods: { key: "content.neighborhoods", label: "Mahalleler", type: "array-of-objects", itemFields: [{ key: "description", label: "Açıklama", type: "textarea" }] },
    teamMembers: { key: "content.teamMembers", label: "Ekip üyeleri", type: "array-of-objects", itemFields: [{ key: "role", label: "Görev", type: "text" }, { key: "bio", label: "Biyografi", type: "textarea" }] },
    services: { key: "content.services", label: "Hizmetler", type: "array-of-objects", itemFields: [{ key: "title", label: "Başlık", type: "text" }, { key: "description", label: "Açıklama", type: "textarea" }] },
    processSteps: { key: "content.processSteps", label: "Süreç adımları", type: "array-of-objects", itemFields: [{ key: "title", label: "Başlık", type: "text" }, { key: "description", label: "Açıklama", type: "textarea" }] },
    feelings: { key: "content.feelings", label: "His seçenekleri", type: "array-of-objects", itemFields: [{ key: "", label: "Seçenek", type: "text" }] },
    timings: { key: "content.timings", label: "Zamanlama seçenekleri", type: "array-of-objects", itemFields: [{ key: "", label: "Seçenek", type: "text" }] },
  };
  const fieldSchema = [
    ...schema,
    ...[...translatableRootFields]
      .filter((key) => content[key] !== undefined && !schemaRootKeys.has(key))
      .map((key): ContentFieldDescriptor => ({ key: `content.${key}`, label: contentFieldLabel(key), type: valueAt(content, `content.${key}`, "tr").length > 100 ? "textarea" : "text" })),
    ...Object.entries(supplementalArrays).filter(([key]) => Array.isArray(content[key]) && !schemaRootKeys.has(key)).map(([, field]) => field),
  ];

  useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => () => observerRef.current?.disconnect(), []);

  const preparePreview = useCallback(() => {
    const document = iframeRef.current?.contentDocument;
    if (!document?.body || editingRef.current) return;
    observerRef.current?.disconnect();
    document.querySelectorAll<HTMLElement>("[data-fastate-editable],[data-fastate-locked]").forEach((element) => element.replaceWith(document.createTextNode(element.textContent || "")));
    document.getElementById("fastate-inline-editor-styles")?.remove();
    const style = document.createElement("style");
    style.id = "fastate-inline-editor-styles";
    style.textContent = `a,button,input,textarea,select,form{pointer-events:none!important}[data-fastate-editable],[data-fastate-locked]{pointer-events:auto!important;border-radius:3px;transition:outline .15s,background .15s}[data-fastate-editable]{cursor:text!important;outline:1px dashed color-mix(in srgb,#d86f45 45%,transparent);outline-offset:2px}[data-fastate-editable]:hover{outline:2px dashed #d86f45;outline-offset:4px;background:color-mix(in srgb,#d86f45 9%,transparent)}[data-fastate-editable][contenteditable=true]{outline:3px solid #d86f45!important;outline-offset:5px;background:#fff7f2!important;color:#17231e!important;min-width:1ch}[data-fastate-locked]{cursor:help!important}.fastate-hide-locked [data-fastate-locked]{display:none!important}`;
    document.head.appendChild(style);
    if (guardedDocumentRef.current !== document) {
      guardedDocumentRef.current = document;
      document.addEventListener("click", (event) => { event.preventDefault(); event.stopImmediatePropagation(); }, true);
      document.addEventListener("submit", (event) => { event.preventDefault(); event.stopImmediatePropagation(); }, true);
    }
    const entries = editableEntries(contentRef.current, contentLocale);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    let node = walker.nextNode();
    while (node) { nodes.push(node as Text); node = walker.nextNode(); }
    let nextLockedCount = document.querySelectorAll("[data-fastate-locked]").length;
    for (const textNode of nodes) {
      const parent = textNode.parentElement;
      const text = textNode.nodeValue || "";
      if (!parent || parent.closest("script,style,noscript,[data-fastate-editable],[data-fastate-locked]") || !text.trim()) continue;
      const entry = entries.find((candidate) => text.trim() === candidate.value.trim());
      if (!entry) {
        const locked = document.createElement("span");
        locked.dataset.fastateLocked = "true";
        const listingText = Boolean(parent.closest("article")?.querySelector('a[href*="/listings/"]'));
        const teamText = Boolean(parent.closest('[data-team-member], [class*="team"]'));
        locked.title = t(listingText ? "dashboard.content.lockedListing" : teamText ? "dashboard.content.lockedTeam" : "dashboard.content.lockedOther");
        locked.textContent = text;
        textNode.replaceWith(locked);
        nextLockedCount += 1;
        continue;
      }
      const editor = document.createElement("span");
      editor.dataset.fastateEditable = entry.key;
      editor.dataset.contentLocale = contentLocale;
      editor.title = t("dashboard.content.doubleClickHint");
      editor.textContent = text;
      textNode.replaceWith(editor);
      editor.addEventListener("dblclick", (event) => {
        event.preventDefault(); event.stopPropagation(); editor.contentEditable = "true"; editor.focus();
        document.getSelection()?.selectAllChildren(editor); editingRef.current = true; setEditing(true);
      });
      editor.addEventListener("input", () => {
        const next = setInstanceValue(contentRef.current, entry.key, editor.textContent || "", contentLocale);
        contentRef.current = next; onChangeRef.current(next);
      });
      editor.addEventListener("keydown", (event) => {
        if (event.key === "Escape") editor.blur();
        if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); editor.blur(); }
      });
      editor.addEventListener("blur", () => { editor.contentEditable = "false"; editingRef.current = false; setEditing(false); });
    }
    document.body.classList.toggle("fastate-hide-locked", hideLocked);
    setLockedCount(nextLockedCount);
    const observer = new MutationObserver(() => window.setTimeout(preparePreview, 50));
    observer.observe(document.body, { childList: true, subtree: true });
    observerRef.current = observer;
  }, [contentLocale, hideLocked, t]);

  useEffect(() => {
    if (!editing && iframeRef.current?.contentDocument?.body) {
      const timer = window.setTimeout(preparePreview, 50);
      return () => window.clearTimeout(timer);
    }
  }, [content, editing, preparePreview]);

  const renderField = (field: ContentFieldDescriptor) => {
    if (field.type === "array-of-objects") {
      const root = relativePath(field.key)[0];
      const items = Array.isArray(content[root]) ? content[root] as ContentValue[] : [];
      return <section key={field.key} className="rounded-2xl border bg-white p-4"><h3 className="font-semibold text-[#173f32]">{field.label}</h3><div className="mt-3 space-y-4">{items.map((item, index) => <div key={index} className="rounded-xl bg-slate-50 p-3"><div className="mb-2 text-xs font-bold text-slate-400">#{index + 1}</div>{field.itemFields?.map((child) => {
        const key = `${field.key}.${index}${child.key ? `.${child.key}` : ""}`;
        if (!isTranslatableContentPath(relativePath(key))) return null;
        const locale = fieldLocales[key] || "tr";
        const Control = child.type === "textarea" ? Textarea : Input;
        return <div key={key} className="mb-3 last:mb-0"><div className="mb-1.5 flex items-center justify-between gap-2"><label className="text-sm font-medium">{child.label}</label><LocaleTabs value={locale} onChange={(next) => setFieldLocales((current) => ({ ...current, [key]: next }))} /></div><Control value={valueAt(content, key, locale)} onChange={(event) => onChange(setInstanceValue(content, key, event.target.value, locale))} rows={child.type === "textarea" ? 3 : undefined} placeholder={locale === "en" ? t("dashboard.content.englishPlaceholder") : undefined} /></div>;
      })}</div>)}</div></section>;
    }
    if (!isTranslatableContentPath(relativePath(field.key))) return null;
    const locale = fieldLocales[field.key] || "tr";
    const Control = field.type === "textarea" ? Textarea : Input;
    return <section key={field.key} className="rounded-2xl border bg-white p-4"><div className="mb-2 flex items-center justify-between gap-2"><label className="font-semibold text-[#173f32]">{field.label}</label><LocaleTabs value={locale} onChange={(next) => setFieldLocales((current) => ({ ...current, [field.key]: next }))} /></div><Control value={valueAt(content, field.key, locale)} onChange={(event) => onChange(setInstanceValue(content, field.key, event.target.value, locale))} rows={field.type === "textarea" ? 4 : undefined} placeholder={locale === "en" ? t("dashboard.content.englishPlaceholder") : undefined} /></section>;
  };

  return <Card className="relative overflow-hidden rounded-[2rem] border-[#173f32]/10 bg-[#e9e7e1] shadow-none">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-5 py-4">
      <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#fff1e9] text-[#d86f45]"><Pencil className="h-4 w-4" /></span><div><div className="text-sm font-semibold">{t("dashboard.content.previewTitle")}</div><div className="text-xs text-[#69756e]">{editing ? t("dashboard.content.editingHelp") : t("dashboard.content.previewHelp")}</div></div></div>
      <div className="flex flex-wrap items-center gap-2"><div className="inline-flex rounded-full border bg-slate-50 p-1"><button type="button" onClick={() => setView("preview")} className={cn("flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold", view === "preview" && "bg-[#173f32] text-white")}><Monitor className="h-3.5 w-3.5" />{t("dashboard.content.visualView")}</button><button type="button" onClick={() => setView("fields")} className={cn("flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold", view === "fields" && "bg-[#173f32] text-white")}><ListTree className="h-3.5 w-3.5" />{t("dashboard.content.fieldsView")}</button></div>{missingEnglish > 0 && <Button type="button" variant="outline" className="rounded-full" disabled={translating || saving} onClick={() => void onTranslateMissing?.()}><Languages className="mr-2 h-4 w-4" />{translating ? t("dashboard.content.translating") : t("dashboard.content.translateMissing", { count: missingEnglish })}</Button>}{view === "preview" && <><div data-content-language-tabs className="inline-flex rounded-full border bg-slate-50 p-1"><button type="button" aria-pressed={contentLocale === "tr"} onClick={() => setContentLocale("tr")} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", contentLocale === "tr" && "bg-[#173f32] text-white")}>TR</button><button type="button" aria-pressed={contentLocale === "en"} onClick={() => setContentLocale("en")} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", contentLocale === "en" && "bg-[#173f32] text-white")}>EN</button></div><button type="button" role="switch" aria-checked={hideLocked} onClick={() => setHideLocked((value) => !value)} className="flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium text-[#52606d]"><Info className="h-3.5 w-3.5" /><span>{t("dashboard.content.hideLocked", { count: lockedCount })}</span><span className={cn("h-5 w-9 rounded-full p-0.5 transition", hideLocked ? "bg-[#173f32]" : "bg-slate-200")}><span className={cn("block h-4 w-4 rounded-full bg-white shadow transition-transform", hideLocked && "translate-x-4")} /></span></button><Button type="button" variant={device === "desktop" ? "secondary" : "ghost"} size="icon" onClick={() => setDevice("desktop")} aria-label={t("dashboard.content.desktop")}><Monitor className="h-4 w-4" /></Button><Button type="button" variant={device === "mobile" ? "secondary" : "ghost"} size="icon" onClick={() => setDevice("mobile")} aria-label={t("dashboard.content.mobile")}><Smartphone className="h-4 w-4" /></Button><Button asChild variant="ghost" size="icon"><a href={previewUrl} target="_blank" rel="noreferrer" aria-label={t("dashboard.content.openPreview")}><ExternalLink className="h-4 w-4" /></a></Button></>}</div>
    </div>
    {view === "preview" ? <div className="flex h-[calc(100vh-210px)] min-h-[680px] justify-center overflow-auto p-3 sm:p-5"><iframe ref={iframeRef} key={`${previewVersion}-${contentLocale}`} title={t("dashboard.content.previewTitle")} src={`${previewUrl}${previewUrl.includes("?") ? "&" : "?"}siteLocale=${contentLocale}`} onLoad={() => window.setTimeout(preparePreview, 300)} className={cn("h-full bg-white shadow-xl transition-all", device === "mobile" ? "w-[390px] max-w-full rounded-[1.5rem]" : "w-full rounded-xl")} /></div> : <div className="h-[calc(100vh-210px)] min-h-[680px] overflow-auto p-4 pb-28 sm:p-6 sm:pb-28"><div className="mx-auto grid max-w-4xl gap-4">{fieldSchema.map(renderField)}</div></div>}
    <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center px-5"><div className="pointer-events-auto flex items-center gap-3 rounded-full border bg-white/95 p-2 pl-5 shadow-xl backdrop-blur"><span className={cn("text-xs", dirty ? "text-amber-700" : "text-[#69756e]")}>{dirty ? t("dashboard.content.unsaved") : t("dashboard.content.savedState")}</span><Button className="rounded-full" onClick={onSave} disabled={saving || !dirty}>{dirty ? t(saving ? "common.saving" : "dashboard.content.save") : <><Check className="mr-2 h-4 w-4" />{t("dashboard.content.savedState")}</>}</Button></div></div>
  </Card>;
}
