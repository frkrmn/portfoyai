import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePageMeta } from "@/lib/page-meta";
import { publicSitePageMetadata } from "@/lib/site-metadata.js";
import { createTemplateConfig, type PublicSitePayload, type TemplateView } from "./types";
import { getTemplateFamily } from "./registry";
import { GoogleFontStylesheet } from "./GoogleFontStylesheet";

function RendererMessage({ children }: { children: string }) {
  return <div className="grid min-h-screen place-items-center bg-[#f1eadf] px-5 text-center text-sm text-[#25231f]">{children}</div>;
}

export function SiteRenderer({ view }: { view: TemplateView }) {
  const { slug = "", listingId } = useParams();
  const { i18n } = useTranslation();
  const [payload, setPayload] = useState<PublicSitePayload | null>(null);
  const [error, setError] = useState("");

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
    ? publicSitePageMetadata({ payload, view, listing, locale: i18n.resolvedLanguage === "en" ? "en" : "tr" })
    : { title: "", description: "" }, [i18n.resolvedLanguage, listing, payload, view]);
  usePageMeta(metadata.title, metadata.description);

  if (error) return <RendererMessage>{error}</RendererMessage>;
  if (!payload) return <RendererMessage>Site yükleniyor...</RendererMessage>;
  if (view === "detail" && !listing) return <RendererMessage>İlan bulunamadı.</RendererMessage>;

  const config = createTemplateConfig(payload, view, listing);
  const family = getTemplateFamily(config.templateId);
  const Component = view === "home" ? family.Home : view === "listings" ? family.Listings : family.Detail;
  const closedLabel = listing?.listing_status === "sold"
    ? (i18n.resolvedLanguage === "en" ? "Sold" : "Satıldı")
    : listing?.listing_status === "rented"
      ? (i18n.resolvedLanguage === "en" ? "Rented" : "Kiralandı")
      : "";
  return <><GoogleFontStylesheet fonts={config.fonts} />{closedLabel ? <div data-listing-status={listing?.listing_status} className="fixed right-5 top-5 z-[100] rounded-full bg-slate-950 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-xl">{closedLabel}</div> : null}<Component config={config} /></>;
}

export function TemplateNotFoundLink({ slug }: { slug: string }) {
  return <Link to={`/site/${slug}`}>Siteye dön</Link>;
}
