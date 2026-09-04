import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import tr from "../../locales/site/tr.json";
import en from "../../locales/site/en.json";
import type { TemplateConfig } from "./types";
import { resolveStoredContent, translatableRootFields } from "./content-localization";

export type SiteLocale = "tr" | "en";
type Messages = {
  content: Record<string, string | string[]>;
  ui: Record<string, string>;
  templates?: Record<string, Record<string, string>>;
};
const dictionaries: Record<SiteLocale, Messages> = { tr, en };
const storageKey = (slug: string) => `fastate_site_locale:${slug}`;

type SiteLocaleContextValue = { locale: SiteLocale; setLocale: (locale: SiteLocale) => void; messages: Messages };
const SiteLocaleContext = createContext<SiteLocaleContextValue | null>(null);

export function SiteLocaleProvider({ children, defaultLocale, slug }: { children: ReactNode; defaultLocale: SiteLocale; slug: string }) {
  const [locale, setLocaleState] = useState<SiteLocale>(() => {
    const requested = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("siteLocale");
    if (requested === "tr" || requested === "en") return requested;
    const stored = typeof window === "undefined" ? null : sessionStorage.getItem(storageKey(slug));
    return stored === "tr" || stored === "en" ? stored : defaultLocale;
  });
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const value = useMemo(() => ({ locale, setLocale: (next: SiteLocale) => { if (typeof window !== "undefined") sessionStorage.setItem(storageKey(slug), next); setLocaleState(next); }, messages: dictionaries[locale] }), [locale, slug]);
  return <SiteLocaleContext.Provider value={value}>{children}</SiteLocaleContext.Provider>;
}

export function useSiteLocale() {
  const context = useContext(SiteLocaleContext);
  if (!context) throw new Error("useSiteLocale must be used within SiteLocaleProvider");
  return context;
}

export function localizeSiteConfig(config: TemplateConfig, messages: Messages, locale: SiteLocale): TemplateConfig {
  const customTeamLabel = config.teamSectionLabel !== "Danışmanımız" && config.teamSectionLabel !== "Ekibimiz";
  const dynamicContent = resolveStoredContent<Partial<TemplateConfig["content"]>>(config.storedContent, locale);
  const narrativeKeys: Array<keyof TemplateConfig["content"]> = [
    ...translatableRootFields,
    "stats", "whyItems", "neighborhoods", "feelings", "timings", "teamMembers", "services", "processSteps",
  ] as Array<keyof TemplateConfig["content"]>;
  const narrativeContent = Object.fromEntries(narrativeKeys.filter((key) => dynamicContent[key] !== undefined).map((key) => [key, dynamicContent[key]]));
  const content = { ...config.content, ...dynamicContent, ...messages.content, ...(messages.templates?.[config.templateId] || {}), ...narrativeContent } as TemplateConfig["content"];
  const generatedTeam = Array.isArray(dynamicContent.teamMembers) ? dynamicContent.teamMembers : [];
  return {
    ...config,
    content,
    teamMembers: config.teamMembers.map((member, index) => ({ ...member, role: generatedTeam[index]?.role || member.role, bio: generatedTeam[index]?.bio || member.bio })),
    teamSectionLabel: customTeamLabel ? config.teamSectionLabel : (config.teamMembers.length === 1 ? (locale === "en" ? "Our Advisor" : "Danışmanımız") : (locale === "en" ? "Our Team" : "Ekibimiz")),
  };
}

export function SiteLanguageToggle({ className = "" }: { className?: string }) {
  const { locale, setLocale, messages } = useSiteLocale();
  return <div data-site-language-toggle role="group" aria-label={messages.ui.languageLabel} className={`inline-flex shrink-0 overflow-hidden rounded-full border border-current/20 text-[10px] font-bold ${className}`}><button type="button" aria-pressed={locale === "tr"} onClick={() => setLocale("tr")} className={`px-2.5 py-1.5 ${locale === "tr" ? "bg-current/15" : "opacity-55"}`}>TR</button><button type="button" aria-pressed={locale === "en"} onClick={() => setLocale("en")} className={`px-2.5 py-1.5 ${locale === "en" ? "bg-current/15" : "opacity-55"}`}>EN</button></div>;
}

export function SiteCredit() {
  const { messages } = useSiteLocale();
  return <div className="mt-5 text-xs opacity-45">{messages.ui.credit}</div>;
}
