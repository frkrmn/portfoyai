import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, HelpCircle, LifeBuoy, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HELP_CONTENT_VERSION, searchHelpArticles, type HelpLocale } from "@/lib/help-content";

const GUIDE_STORAGE_KEY = `fastate_onboarding_guide_v${HELP_CONTENT_VERSION}`;
const copy = {
  tr: { help: "Yardım", title: "Yardım merkezi", search: "Yardımda ara", noResults: "Aramanızla eşleşen içerik bulunamadı.", contextual: "Bu bölüm için", all: "Tüm rehberler", support: "Destek isteği gönder", category: "Konu", message: "Nasıl yardımcı olabiliriz?", placeholder: "Sorunu ve beklediğiniz sonucu açıklayın.", privacy: "Şifre, ödeme bilgisi, kimlik belgesi veya müşterilerin kişisel verilerini paylaşmayın. Site ve ekran bilgisi güvenli biçimde otomatik eklenir.", send: "Gönder", sending: "Gönderiliyor…", sent: "Talebiniz alındı", reference: "Takip numarası", failed: "Talep gönderilemedi. Lütfen tekrar deneyin.", guide: "İlk kullanım rehberi", restart: "Rehberi aç", next: "İleri", back: "Geri", finish: "Tamamla", close: "Kapat", steps: [{ title: "Paneli tanıyın", body: "Soldaki menü içerik, görsel, portföy, lead ve analitik alanlarına ulaşmanızı sağlar." }, { title: "Taslak üzerinde çalışın", body: "Değişiklikleriniz önce taslağa kaydolur. Canlı siteniz siz yayınlayana kadar değişmez." }, { title: "Kontrol edip yayınlayın", body: "Genel Bakış’taki gerçek veriye dayalı hazırlık listesini tamamlayın ve yayın öncesi kalite kontrolünü çalıştırın." }] },
  en: { help: "Help", title: "Help center", search: "Search help", noResults: "No help content matched your search.", contextual: "For this section", all: "All guides", support: "Send a support request", category: "Topic", message: "How can we help?", placeholder: "Describe the problem and the result you expected.", privacy: "Do not share passwords, payment details, identity documents, or customers’ personal data. Site and screen context is attached safely.", send: "Send", sending: "Sending…", sent: "Request received", reference: "Reference", failed: "Could not send the request. Please try again.", guide: "Getting started guide", restart: "Open guide", next: "Next", back: "Back", finish: "Finish", close: "Close", steps: [{ title: "Meet your dashboard", body: "Use the side navigation to reach content, images, listings, leads, and analytics." }, { title: "Work in a draft", body: "Changes are saved to your draft first. Your live site stays unchanged until you publish." }, { title: "Review and publish", body: "Complete the real-data readiness checklist on Overview and run the pre-publish quality review." }] },
};
const categories = ["getting-started", "site-editor", "publishing", "leads", "billing", "other"];

type Props = { siteId?: string; activeSection: string; authHeaders: Record<string, string> };

export function HelpCenter({ siteId, activeSection, authHeaders }: Props) {
  const { i18n } = useTranslation();
  const locale: HelpLocale = i18n.resolvedLanguage === "en" ? "en" : "tr";
  const text = copy[locale];
  const [open, setOpen] = useState(false);
  const [guideStep, setGuideStep] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("getting-started");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [requestId, setRequestId] = useState("");
  const closeButton = useRef<HTMLButtonElement>(null);
  const articles = useMemo(() => searchHelpArticles(query, locale), [query, locale]);
  const contextual = articles.filter((article) => article.contexts.includes(activeSection));
  const remaining = articles.filter((article) => !article.contexts.includes(activeSection));

  useEffect(() => {
    if (window.localStorage.getItem(GUIDE_STORAGE_KEY) !== "done") setGuideStep(0);
  }, []);
  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const finishGuide = () => { window.localStorage.setItem(GUIDE_STORAGE_KEY, "done"); setGuideStep(null); };
  async function submit(event: FormEvent) {
    event.preventDefault(); setStatus("sending");
    try {
      const response = await fetch("/api/support-requests", { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders }, body: JSON.stringify({ site_id: siteId, category, message, context: { section: activeSection, help_version: HELP_CONTENT_VERSION } }) });
      if (!response.ok) throw new Error("support request failed");
      const payload = await response.json(); setRequestId(payload.request.request_id); setMessage(""); setStatus("sent");
    } catch { setStatus("error"); }
  }

  return <>
    <Button type="button" onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-40 rounded-full shadow-lg" aria-label={text.title}><HelpCircle className="mr-2 h-4 w-4" />{text.help}</Button>
    {open ? <div className="fixed inset-0 z-50 bg-black/30" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
      <section role="dialog" aria-modal="true" aria-labelledby="help-center-title" className="ml-auto flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex items-center justify-between gap-4"><h2 id="help-center-title" className="text-2xl font-semibold text-[#173f32]">{text.title}</h2><Button ref={closeButton} variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label={text.close}><X className="h-5 w-5" /></Button></div>
        <Button type="button" variant="outline" className="mt-4 justify-start" onClick={() => setGuideStep(0)}><LifeBuoy className="mr-2 h-4 w-4" />{text.restart}</Button>
        <div className="relative mt-5"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder={text.search} aria-label={text.search} /></div>
        {!articles.length ? <p role="status" className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{text.noResults}</p> : null}
        {[{ label: text.contextual, items: contextual }, { label: text.all, items: remaining }].map((group) => group.items.length ? <div key={group.label} className="mt-6"><h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{group.label}</h3><div className="mt-2 space-y-2">{group.items.map((article) => <details key={article.id} className="rounded-xl border p-4"><summary className="cursor-pointer font-medium text-[#173f32]">{article.title[locale]}</summary><p className="mt-3 text-sm leading-6 text-slate-600">{article.body[locale]}</p></details>)}</div></div> : null)}
        <form onSubmit={submit} className="mt-8 space-y-4 border-t pt-6"><h3 className="text-lg font-semibold text-[#173f32]">{text.support}</h3><div><Label htmlFor="support-category">{text.category}</Label><select id="support-category" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-2 h-10 w-full rounded-md border bg-white px-3 text-sm">{categories.map((item) => <option key={item} value={item}>{item.replace("-", " ")}</option>)}</select></div><div><Label htmlFor="support-message">{text.message}</Label><Textarea id="support-message" value={message} onChange={(e) => setMessage(e.target.value)} minLength={10} maxLength={2000} required rows={5} placeholder={text.placeholder} className="mt-2" /></div><p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">{text.privacy}</p><Button disabled={status === "sending" || message.trim().length < 10}>{status === "sending" ? text.sending : text.send}</Button>{status === "sent" ? <p role="status" className="text-sm text-emerald-700"><CheckCircle2 className="mr-1 inline h-4 w-4" />{text.sent}. {text.reference}: <code>{requestId}</code></p> : null}{status === "error" ? <p role="alert" className="text-sm text-red-700">{text.failed}</p> : null}</form>
      </section>
    </div> : null}
    {guideStep !== null ? <div className="fixed inset-0 z-[60] grid place-items-end bg-black/40 p-4 sm:place-items-center" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="onboarding-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><p className="text-xs font-semibold uppercase tracking-wider text-[#d86f45]">{text.guide} · {guideStep + 1}/{text.steps.length}</p><h2 id="onboarding-title" className="mt-3 text-2xl font-semibold text-[#173f32]">{text.steps[guideStep].title}</h2><p className="mt-3 leading-7 text-slate-600">{text.steps[guideStep].body}</p><div className="mt-6 flex justify-between"><Button variant="ghost" onClick={finishGuide}>{text.close}</Button><div className="flex gap-2">{guideStep > 0 ? <Button variant="outline" onClick={() => setGuideStep(guideStep - 1)}><ArrowLeft className="mr-1 h-4 w-4" />{text.back}</Button> : null}<Button onClick={() => guideStep === text.steps.length - 1 ? finishGuide() : setGuideStep(guideStep + 1)}>{guideStep === text.steps.length - 1 ? text.finish : text.next}{guideStep < text.steps.length - 1 ? <ArrowRight className="ml-1 h-4 w-4" /> : null}</Button></div></div></section></div> : null}
  </>;
}
