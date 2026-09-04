import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { usePageMeta } from "@/lib/page-meta";
import { publicSitePageMetadata } from "@/lib/site-metadata.js";
import { createTemplateConfig, type PublicSitePayload, type TemplateView } from "./types";
import { getTemplateFamily } from "./registry";
import { GoogleFontStylesheet } from "./GoogleFontStylesheet";
import { localizeSiteConfig, SiteLocaleProvider, useSiteLocale } from "./site-locale";
import { contentNeedsEnglishBackfill } from "./content-localization";

function LocalizedSite({ config, Component, listingStatus, onBackfilled }: { config: ReturnType<typeof createTemplateConfig>; Component: ReturnType<typeof getTemplateFamily>["Home"]; listingStatus?: string; onBackfilled: (themeConfig: Record<string, unknown>) => void }) {
  const { locale, messages } = useSiteLocale();
  const requestedBackfill = useRef(false);
  const localizedConfig = useMemo(() => localizeSiteConfig(config, messages, locale), [config, locale, messages]);
  const closedLabel = listingStatus === "sold" ? messages.ui.sold : listingStatus === "rented" ? messages.ui.rented : "";
  useEffect(() => {
    if (locale !== "en" || requestedBackfill.current || !contentNeedsEnglishBackfill(config.storedContent)) return;
    requestedBackfill.current = true;
    const run = async () => {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const response = await fetch(`/api/public-sites/${encodeURIComponent(config.slug)}/content-backfill`, { method: "POST" });
        const body = await response.json();
        if (response.ok && body.theme_config) { onBackfilled(body.theme_config); return; }
        if (response.status !== 202) throw new Error(body.error || "Content translation failed.");
        await new Promise((resolve) => window.setTimeout(resolve, 500));
      }
      throw new Error("Content translation timed out.");
    };
    void run().catch((error) => console.error("[site-content-i18n] Backfill failed", error));
  }, [config.slug, config.storedContent, locale, onBackfilled]);
  return <><GoogleFontStylesheet fonts={localizedConfig.fonts} />{closedLabel ? <div data-listing-status={listingStatus} className="fixed right-5 top-5 z-[100] rounded-full bg-slate-950 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-xl">{closedLabel}</div> : null}<Component config={localizedConfig} /></>;
}

function RendererMessage({ children }: { children: string }) {
  return <div className="grid min-h-screen place-items-center bg-[#f1eadf] px-5 text-center text-sm text-[#25231f]">{children}</div>;
}

export function SiteRenderer({ view }: { view: TemplateView }) {
  const { slug = "", listingId } = useParams();
  const [payload, setPayload] = useState<PublicSitePayload | null>(null);
  const [error, setError] = useState("");
  const applyBackfilledTheme = (themeConfig: Record<string, unknown>) => setPayload((current) => current ? { ...current, config: { ...current.config, theme_config: themeConfig } } : current);

  useEffect(() => {
    const controller = new AbortController();
    setPayload(null);
    setError("");
    fetch(`/api/public-sites/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Site yüklenemedi.");
        const site = body as PublicSitePayload;
        return {
          ...site,
          listings: Array.isArray(site.listings) ? site.listings : [],
        };
      })
      .then(setPayload)
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Site yüklenemedi.");
      });
    return () => controller.abort();
  }, [slug]);

  const listing = useMemo(
    () => payload?.listings?.find((item) => item.id === listingId),
    [listingId, payload],
  );
  const metadata = useMemo(() => payload
    ? publicSitePageMetadata({ payload, view, listing, locale: payload.language === "en" ? "en" : "tr" })
    : { title: "", description: "" }, [listing, payload, view]);
  usePageMeta(metadata.title, metadata.description);

  useEffect(() => {
    if (view !== "home" || window.location.hash !== "#ekibimiz" || !payload) return;
    window.requestAnimationFrame(() => document.getElementById("ekibimiz")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [payload, view]);

  if (error) return <RendererMessage>{error}</RendererMessage>;
  if (!payload) return <RendererMessage>Site yükleniyor...</RendererMessage>;
  if (view === "detail" && !listing) return <RendererMessage>İlan bulunamadı.</RendererMessage>;

  const config = createTemplateConfig(payload, view, listing);
  const family = getTemplateFamily(config.templateId);
  if (view === "team" && (!config.showTeamSection || !config.teamMembers.length)) return <RendererMessage>Sayfa bulunamadı.</RendererMessage>;
  if (view === "team") return <Navigate to={`/site/${slug}#ekibimiz`} replace />;
  const Component = view === "home" ? family.Home : view === "listings" ? family.Listings : family.Detail;
  return <SiteLocaleProvider defaultLocale={config.language} slug={slug}><LocalizedSite config={config} Component={Component} listingStatus={listing?.listing_status} onBackfilled={applyBackfilledTheme} /></SiteLocaleProvider>;
}

export function TemplateNotFoundLink({ slug }: { slug: string }) {
  return <Link to={`/site/${slug}`}>Siteye dön</Link>;
}
