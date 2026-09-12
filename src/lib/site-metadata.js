const normalizeText = (value) => String(value || "").replace(/\s+/g, " ").trim();
const localized = (value, locale) => normalizeText(value && typeof value === "object" ? value[locale] || value.tr || value.en : value);

export const truncateMetaDescription = (value, maxLength = 160) => {
  const text = normalizeText(value);
  if (text.length <= maxLength) return text;
  const candidate = text.slice(0, maxLength - 1);
  const lastSpace = candidate.lastIndexOf(" ");
  return `${candidate.slice(0, lastSpace > 110 ? lastSpace : candidate.length).trimEnd()}…`;
};

const siteBio = (payload) => {
  const themeConfig = payload?.config?.theme_config;
  const content = themeConfig && typeof themeConfig === "object" ? themeConfig.content : null;
  return normalizeText(content?.bio || payload?.config?.tone || payload?.config?.headline);
};

export const platformPageMetadata = (locale = "tr") => locale === "en"
  ? {
      title: "Fastate AI — Fast Real Estate Sites, Built by AI",
      description: "Fast real estate sites, built by AI: describe your business and Fastate AI creates a tailored website for your brand in seconds.",
    }
  : {
      title: "Fastate AI — Emlak Siteniz Saniyeler İçinde Hazır",
      description: "Emlak siteniz saniyeler içinde hazır: Fastate AI işletmenizi dinler, markanıza özel emlak sitesini yapay zekâ ile oluşturur.",
    };

export const publicSitePageMetadata = ({ payload, view = "home", listing, locale = "tr" }) => {
  const businessName = normalizeText(payload?.config?.business_name) || "Fastate AI";
  const headline = normalizeText(payload?.config?.headline);
  const bio = siteBio(payload);
  const siteDescription = truncateMetaDescription([headline, bio]
    .filter((value, index, values) => value && values.indexOf(value) === index)
    .map((value) => value.replace(/[.!?]+$/g, ""))
    .join(". "));
  const siteSeo = payload?.config?.theme_config?.seo || {};
  const listingSeo = listing?.seo || {};
  const custom = view === "detail" ? listingSeo : siteSeo;
  const customTitle = localized(custom.title, locale);
  const customDescription = truncateMetaDescription(localized(custom.description, locale));
  const shared = {
    ogImage: normalizeText(custom.og_image || siteSeo.og_image),
    favicon: normalizeText(siteSeo.favicon),
    canonicalUrl: normalizeText(view === "detail" ? listingSeo.canonical_url : view === "home" ? siteSeo.canonical_url : ""),
    robots: custom.robots_index === false || siteSeo.robots_index === false ? "noindex,nofollow" : "index,follow",
  };

  if (view === "detail" && listing) {
    return { title: customTitle || `${normalizeText(listing.title)} — ${businessName}`, description: customDescription || truncateMetaDescription(listing.description || `${listing.title}, ${businessName}`), ...shared };
  }

  if (view === "listings") {
    return { title: customTitle || `${businessName} — ${locale === "en" ? "All Listings" : "Tüm İlanlar"}`, description: customDescription || siteDescription, ...shared };
  }

  return { title: customTitle || (headline ? `${businessName} — ${headline}` : businessName), description: customDescription || siteDescription, ...shared };
};
