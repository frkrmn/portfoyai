import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { usePageMeta } from "@/lib/page-meta";
import { publicSitePageMetadata } from "@/lib/site-metadata.js";
import { createTemplateConfig, type PublicSitePayload, type TemplateFamily, type TemplateView } from "./types";
import { loadTemplateFamily } from "./registry";
import { GoogleFontStylesheet } from "./GoogleFontStylesheet";
import { localizeSiteConfig, SiteLocaleProvider, useSiteLocale } from "./site-locale";

function LocalizedSite({ config, Component, listingStatus }: { config: ReturnType<typeof createTemplateConfig>; Component: TemplateFamily["Home"]; listingStatus?: string }) {
  const { locale, messages } = useSiteLocale();
  const localizedConfig = useMemo(() => localizeSiteConfig(config, messages, locale), [config, locale, messages]);
  const closedLabel = listingStatus === "sold" ? messages.ui.sold : listingStatus === "rented" ? messages.ui.rented : "";
  return <><GoogleFontStylesheet fonts={localizedConfig.fonts} />{closedLabel ? <div data-listing-status={listingStatus} className="fixed right-5 top-5 z-[100] rounded-full bg-slate-950 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-xl">{closedLabel}</div> : null}<Component config={localizedConfig} /></>;
}

function RendererMessage({ children }: { children: string }) {
  return <div className="grid min-h-screen place-items-center bg-[#f1eadf] px-5 text-center text-sm text-[#25231f]">{children}</div>;
}

export function SiteRenderer({ view }: { view: TemplateView }) {
  const { slug = "", listingId } = useParams();
  const [searchParams] = useSearchParams();
  const previewSiteId = searchParams.get("previewSiteId");
  const [payload, setPayload] = useState<PublicSitePayload | null>(null);
  const [family, setFamily] = useState<TemplateFamily | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setPayload(null);
    setError("");
    const load = async () => {
      const params = view === "detail" && listingId ? `?listingId=${encodeURIComponent(listingId)}` : "";
      if (!previewSiteId) return fetch(`/api/public-sites/${encodeURIComponent(slug)}${params}`, { signal: controller.signal });
      const { data: { session } } = await supabase.auth.getSession();
      return fetch(`/api/sites/${encodeURIComponent(previewSiteId)}/preview${params}`, { signal: controller.signal, headers: session ? { Authorization: `Bearer ${session.access_token}` } : {} });
    };
    load()
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
  }, [listingId, previewSiteId, slug, view]);

  const listing = useMemo(
    () => payload?.listings?.find((item) => item.id === listingId),
    [listingId, payload],
  );
  const templateId = payload?.config.template_id;
  useEffect(() => {
    if (!payload) { setFamily(null); return; }
    let active = true;
    void loadTemplateFamily(templateId).then((loaded) => { if (active) setFamily(loaded); }).catch(() => { if (active) setError("Site teması yüklenemedi."); });
    return () => { active = false; };
  }, [payload, templateId]);
  const metadata = useMemo(() => payload
    ? publicSitePageMetadata({ payload, view, listing, locale: payload.language === "en" ? "en" : "tr" })
    : { title: "", description: "" }, [listing, payload, view]);
  usePageMeta(metadata.title, metadata.description);

  useEffect(() => {
    if (view !== "home" || window.location.hash !== "#ekibimiz" || !payload) return;
    window.requestAnimationFrame(() => document.getElementById("ekibimiz")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [payload, view]);

  if (error) return <RendererMessage>{error}</RendererMessage>;
  if (!payload || !family) return <RendererMessage>Site yükleniyor...</RendererMessage>;
  if (view === "detail" && !listing) return <RendererMessage>İlan bulunamadı.</RendererMessage>;

  const config = createTemplateConfig(payload, view, listing);
  if (view === "team" && (!config.showTeamSection || !config.teamMembers.length)) return <RendererMessage>Sayfa bulunamadı.</RendererMessage>;
  if (view === "team") return <Navigate to={`/site/${slug}#ekibimiz`} replace />;
  const Component = view === "home" ? family.Home : view === "listings" ? family.Listings : family.Detail;
  return <SiteLocaleProvider defaultLocale={config.language} slug={slug}><LocalizedSite config={config} Component={Component} listingStatus={listing?.listing_status} /></SiteLocaleProvider>;
}

export function TemplateNotFoundLink({ slug }: { slug: string }) {
  return <Link to={`/site/${slug}`}>Siteye dön</Link>;
}
