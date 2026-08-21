import type { Agent, AppState, GeneratedSiteConfig, Listing, MediaItem, PromptProfile, Site, ThemeConfig } from "./types";

const now = () => new Date().toISOString();

const uid = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 8)}${Math.random().toString(36).slice(2, 5)}`;

const palette = {
  "Modern Minimal": {
    primary: "#0f766e",
    accent: "#14b8a6",
    fontPairing: { heading: "Cormorant Garamond, serif", body: "DM Sans, sans-serif" },
    layoutVariant: "gallery",
  },
  "Warm Classic": {
    primary: "#9a3412",
    accent: "#d97706",
    fontPairing: { heading: "Libre Baskerville, serif", body: "DM Sans, sans-serif" },
    layoutVariant: "editorial",
  },
  "Bold Luxury": {
    primary: "#111827",
    accent: "#b08968",
    fontPairing: { heading: "Cormorant Garamond, serif", body: "Inter, sans-serif" },
    layoutVariant: "heroSplit",
  },
  "Clean Corporate": {
    primary: "#1d4ed8",
    accent: "#38bdf8",
    fontPairing: { heading: "Manrope, sans-serif", body: "Inter, sans-serif" },
    layoutVariant: "corporate",
  },
} satisfies Record<string, Omit<ThemeConfig, "variant">>;

const districtSeed = [
  "Kadıköy",
  "Ataşehir",
  "Beşiktaş",
  "Üsküdar",
  "Beylikdüzü",
  "Bakırköy",
  "Şişli",
  "Sarıyer",
];

export const generateThemeFromPrompt = (prompt: string): { profile: PromptProfile; theme: ThemeConfig } => {
  const lower = prompt.toLowerCase();
  const variant: ThemeConfig["variant"] =
    lower.includes("lüks") || lower.includes("luxury")
      ? "Bold Luxury"
      : lower.includes("klasik") || lower.includes("classic")
        ? "Warm Classic"
        : lower.includes("kurumsal") || lower.includes("corporate")
          ? "Clean Corporate"
          : "Modern Minimal";

  const regionFocus =
    [
      "kadıköy",
      "ataşehir",
      "beşiktaş",
      "şişli",
      "sarıyer",
      "üsküdar",
      "bakırköy",
      "beylikdüzü",
    ].find((district) => lower.includes(district)) ?? "İstanbul Anadolu Yakası";

  const listing_types: PromptProfile["listing_types"] = [];
  if (lower.includes("kirala") || lower.includes("rent")) listing_types.push("rent");
  if (lower.includes("sat") || lower.includes("sale") || listing_types.length === 0) listing_types.push("sale");

  const theme = {
    variant,
    ...palette[variant],
  } satisfies ThemeConfig;

  return {
    profile: {
      business_name:
        prompt
          .split(/[.!?]/)[0]
          .replace(/\b(emlak|real estate|danışmanlık|brokerage)\b/gi, "")
          .trim()
          .slice(0, 48) || "PortföyAI Demo Ofis",
      region_focus: regionFocus,
      tone: lower.includes("güven") ? "Trustworthy" : lower.includes("modern") ? "Modern" : "Warm",
      color_direction: theme.variant,
      listing_types,
    },
    theme,
  };
};

const formatTL = (value: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value);

export const generateDescriptionFromFacts = (listing: {
  title: string;
  district: string;
  listing_type: "sale" | "rent";
  m2: number;
  room_count: string;
  price: number;
  features: string[];
}) =>
  [
    `${listing.district} bölgesinde yer alan ${listing.title.toLowerCase()}, ${listing.m2} m² kullanım alanı ve ${listing.room_count} oda düzeniyle öne çıkıyor.`,
    `Fiyat: ${formatTL(listing.price)}. ${listing.listing_type === "sale" ? "Satılık" : "Kiralık"} seçenek, modern yaşam beklentisine uygun olarak düzenlendi.`,
    listing.features.length
      ? `Öne çıkan özellikler: ${listing.features.join(", ")}.`
      : "Öne çıkan detaylar, ferah plan ve doğal ışık alan yaşam alanlarıdır.",
    "Daha fazla bilgi ve yerinde gösterim için iletişime geçebilirsiniz.",
  ].join(" ");

export const svgDataUri = (title: string, accent: string, index: number) => {
  const lines = title.slice(0, 34);
  const bg = index % 2 === 0 ? "#f8fafc" : "#eef2ff";
  const safeTitle = lines.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="${accent}" stop-opacity="0.72"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="800" fill="${bg}"/>
    <rect x="80" y="80" width="1040" height="640" rx="56" fill="url(#g)"/>
    <circle cx="980" cy="180" r="110" fill="white" fill-opacity="0.36"/>
    <rect x="148" y="530" width="430" height="34" rx="17" fill="white" fill-opacity="0.7"/>
    <rect x="148" y="580" width="280" height="22" rx="11" fill="white" fill-opacity="0.55"/>
    <text x="150" y="250" font-size="42" font-family="Arial, sans-serif" fill="#0f172a" font-weight="700">PortföyAI</text>
    <text x="150" y="330" font-size="72" font-family="Arial, sans-serif" fill="#0f172a" font-weight="700">${safeTitle}</text>
    <text x="150" y="390" font-size="28" font-family="Arial, sans-serif" fill="#334155">İstanbul için seçkin gayrimenkul sunumu</text>
    <text x="150" y="640" font-size="24" font-family="Arial, sans-serif" fill="#0f172a">Demo görsel • ${index + 1}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const listingImagePaths = [
  "/images/listings/caddebostan-sea-view.jpg",
  "/images/listings/bagdat-residence.jpg",
  "/images/listings/fenerbahce-garden.jpg",
  "/images/listings/suadiye-penthouse.jpg",
  "/images/listings/moda-character.jpg",
];

const makeMedia = (title: string, accent: string, index: number): MediaItem[] => {
  const base = listingImagePaths[index % listingImagePaths.length] || svgDataUri(title, accent, index);
  return [
    { id: uid("media"), url: base, thumbUrl: base, alt: `${title} görsel ${index + 1}` },
    {
      id: uid("media"),
      url: listingImagePaths[(index + 1) % listingImagePaths.length] || base,
      thumbUrl: listingImagePaths[(index + 1) % listingImagePaths.length] || base,
      alt: `${title} detay görseli`,
    },
  ];
};

const demoTheme = generateThemeFromPrompt("Kadıköy'de lüks daire satan modern ve güvenilir bir emlakçıyım").theme;

const demoAgent: Agent = {
  id: "agent_demo",
  name: "Demet Kaya",
  email: "demet@portfoyai.com",
  phone: "+90 532 555 00 10",
  region: "Kadıköy",
  plan: "free",
  created_at: now(),
  businessName: "Kaya Gayrimenkul",
  tone: "Güvenilir",
  colorDirection: "Modern Minimal",
  bio: "Kadıköy ve çevresinde butik daire, rezidans ve yatırım odaklı satışlarla çalışan bir emlak danışmanı.",
};

const demoSite: Site = {
  id: "site_demo",
  agent_id: demoAgent.id,
  subdomain: "kaya-gayrimenkul",
  custom_domain: null,
  theme_config: demoTheme,
  status: "published",
  created_at: now(),
  heroTitle: "Kadıköy'de seçkin yaşam alanları",
  heroSubtitle: "PortföyAI ile saniyeler içinde canlı, markalı bir emlak sitesi.",
};

const demoListings: Listing[] = [
  {
    id: "listing_1",
    site_id: demoSite.id,
    title: "Caddebostan Deniz Manzaralı 3+1",
    description:
      "Geniş salonu, balkonlu planı ve sahile yakın konumuyla öne çıkan seçkin bir aile dairesi.",
    price: 14950000,
    currency: "TRY",
    m2: 165,
    room_count: "3+1",
    listing_type: "sale",
    district: "Kadıköy",
    lat: 40.9603,
    lng: 29.0792,
    media: makeMedia("Caddebostan Deniz Manzaralı 3+1", demoTheme.accent, 0),
    status: "active",
    created_at: now(),
    features: ["Deniz manzarası", "Kapalı otopark", "Akıllı ev sistemi"],
  },
  {
    id: "listing_2",
    site_id: demoSite.id,
    title: "Bağdat Caddesi Modern Rezidans",
    description: "Günlük yaşamı kolaylaştıran sosyal alanlarıyla şehir içinde rahat bir deneyim sunar.",
    price: 68000,
    currency: "TRY",
    m2: 95,
    room_count: "2+1",
    listing_type: "rent",
    district: "Kadıköy",
    lat: 40.968,
    lng: 29.081,
    media: makeMedia("Bağdat Caddesi Modern Rezidans", demoTheme.accent, 1),
    status: "active",
    created_at: now(),
    features: ["Rezidans hizmetleri", "Yüzme havuzu", "7/24 güvenlik"],
  },
  {
    id: "listing_3",
    site_id: demoSite.id,
    title: "Fenerbahçe Site İçinde Bahçeli Daire",
    description: "Sessiz sokak, ferah bahçe ve yenilenmiş iç mekan ile aile yaşamına uygun.",
    price: 17600000,
    currency: "TRY",
    m2: 210,
    room_count: "4+1",
    listing_type: "sale",
    district: "Kadıköy",
    lat: 40.952,
    lng: 29.064,
    media: makeMedia("Fenerbahçe Site İçinde Bahçeli Daire", demoTheme.accent, 2),
    status: "active",
    created_at: now(),
    features: ["Bahçe kullanımı", "Kombi doğalgaz", "Yeni tadilat"],
  },
  {
    id: "listing_4",
    site_id: demoSite.id,
    title: "Suadiye Sahil Hattında Teraslı Dubleks",
    description: "Geniş terası, rafine malzeme seçimleri ve sahile yakın konumuyla sakin bir şehir yaşamı sunar.",
    price: 28500000,
    currency: "TRY",
    m2: 180,
    room_count: "4+2",
    listing_type: "sale",
    district: "Kadıköy",
    lat: 40.956,
    lng: 29.082,
    media: makeMedia("Suadiye Sahil Hattında Teraslı Dubleks", demoTheme.accent, 3),
    status: "active",
    created_at: now(),
    features: ["Geniş teras", "Deniz manzarası", "Kapalı otopark"],
  },
  {
    id: "listing_5",
    site_id: demoSite.id,
    title: "Moda'da Cumbalı Karakter Daire",
    description: "Yüksek tavanları, korunmuş ahşap detayları ve gün ışığı alan cumbasıyla Moda'nın ruhunu taşıyan özel bir daire.",
    price: 11850000,
    currency: "TRY",
    m2: 125,
    room_count: "3+1",
    listing_type: "sale",
    district: "Kadıköy",
    lat: 40.984,
    lng: 29.025,
    media: makeMedia("Moda'da Cumbalı Karakter Daire", demoTheme.accent, 4),
    status: "active",
    created_at: now(),
    features: ["Yüksek tavan", "Orijinal parke", "Cumbalı salon"],
  },
];

const demoLeads = [
  {
    id: "lead_1",
    site_id: demoSite.id,
    listing_id: "listing_1",
    name: "Mert Yılmaz",
    phone: "+90 530 222 11 22",
    message: "Yerinde görmek için müsaitlik bilgisi alabilir miyim?",
    source: "listing-detail",
    created_at: now(),
  },
  {
    id: "lead_2",
    site_id: demoSite.id,
    listing_id: "listing_2",
    name: "Elif Arslan",
    phone: "+90 536 111 44 55",
    message: "Rezidans için hafta içi akşam gösterim planlayabilir miyiz?",
    source: "listing-detail",
    created_at: now(),
  },
];

export const createSeedState = (): AppState => ({
  agents: [demoAgent],
  sites: [demoSite],
  listings: demoListings,
  leads: demoLeads,
  currentAgentId: demoAgent.id,
  onboardingPrompt: "Kadıköy'de lüks daire satan modern ve güvenilir bir emlakçıyım",
});

export const createAgentFromPrompt = (prompt: string, name: string, email: string, phone: string, generatedConfig?: GeneratedSiteConfig) => {
  const generatedTheme = generateThemeFromPrompt(prompt);
  const profile: PromptProfile = generatedConfig
    ? { ...generatedTheme.profile, business_name: generatedConfig.business_name, tone: generatedConfig.tone }
    : generatedTheme.profile;
  const theme: ThemeConfig = generatedConfig
    ? { ...generatedTheme.theme, primary: generatedConfig.primary_color, accent: generatedConfig.accent_color }
    : generatedTheme.theme;
  const agentId = uid("agent");
  const siteId = uid("site");
  const subdomain = `${profile.business_name
    .toLowerCase()
    .replace(/[^a-z0-9ğüşöçıİ\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "portfoyai"}-${agentId.slice(-4)}`;

  const agent: Agent = {
    id: agentId,
    name: name || profile.business_name,
    email,
    phone,
    region: profile.region_focus,
    plan: "free",
    created_at: now(),
    businessName: profile.business_name,
    tone: profile.tone,
    colorDirection: profile.color_direction,
    bio: `${profile.region_focus} odaklı, ${profile.tone.toLowerCase()} bir emlak markası.`,
  };

  const site: Site = {
    id: siteId,
    agent_id: agentId,
    subdomain,
    custom_domain: null,
    theme_config: theme,
    status: "published",
    created_at: now(),
    heroTitle: generatedConfig?.headline || `${profile.region_focus} için özel olarak hazırlanmış marka sitesi`,
    heroSubtitle: `PortföyAI, ${profile.listing_types.join(" ve ")} ilanlarınızı temiz ve güvenilir bir vitrinle sunar.`,
  };

  const listings: Listing[] = Array.from({ length: 5 }).map((_, index) => {
    const district = districtSeed[index % districtSeed.length];
    const isRent = profile.listing_types.includes("rent") && index % 2 === 1;
    const title = `${district} ${isRent ? "kiralık" : "satılık"} ${index + 1} numaralı demo portföy`;
    return {
      id: uid("listing"),
      site_id: siteId,
      title,
      description: generateDescriptionFromFacts({
        title,
        district,
        listing_type: isRent ? "rent" : "sale",
        m2: 85 + index * 18,
        room_count: index % 2 === 0 ? "3+1" : "2+1",
        price: 6500000 + index * 1250000,
        features: ["Merkezi konum", "Ferah plan", "Gün ışığı"],
      }),
      price: 6500000 + index * 1250000,
      currency: "TRY",
      m2: 85 + index * 18,
      room_count: index % 2 === 0 ? "3+1" : "2+1",
      listing_type: isRent ? "rent" : "sale",
      district,
      lat: 40.9 + index * 0.03,
      lng: 29.0 + index * 0.03,
      media: makeMedia(title, theme.accent, index),
      status: "active",
      created_at: now(),
      features: ["Merkezi konum", "Ferah plan", "Gün ışığı"],
    };
  });

  return { agent, site, listings, prompt };
};

export const loadState = (): AppState => {
  if (typeof window === "undefined") return createSeedState();
  try {
    const raw = window.localStorage.getItem("portfoyai-state");
    if (!raw) return createSeedState();
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed?.agents?.length || !parsed?.sites?.length) return createSeedState();
    const seed = createSeedState();
    const seedDemoListings = new Map(seed.listings.map((listing) => [listing.id, listing]));
    return {
      ...parsed,
      listings: parsed.listings.map((listing) => {
        if (listing.site_id !== "site_demo") return listing;
        const refreshed = seedDemoListings.get(listing.id);
        return refreshed ? { ...listing, title: refreshed.title, description: refreshed.description, media: refreshed.media, features: refreshed.features } : listing;
      }),
      leads: parsed.leads.map((lead) => {
        if (lead.site_id !== "site_demo") return lead;
        const refreshed = seed.leads.find((item) => item.id === lead.id);
        return refreshed ? { ...lead, listing_id: refreshed.listing_id, message: refreshed.message } : lead;
      }),
    };
  } catch {
    return createSeedState();
  }
};

export const saveState = (state: AppState) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("portfoyai-state", JSON.stringify(state));
};

export const formatTRY = (value: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value);

export const formatDateTR = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9ğüşöçıİ\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
