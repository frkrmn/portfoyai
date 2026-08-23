import type { ComponentType } from "react";
import type { Listing, ThemeConfig } from "@/portfoyai/types";

export type TemplateView = "home" | "listings" | "detail";

export type TemplateContent = {
  businessName: string;
  eyebrow: string;
  headline: string;
  headlineAccent: string;
  bio: string;
  ctaText: string;
  featuredEyebrow: string;
  featuredTitle: string;
  categoriesEyebrow: string;
  categoriesTitle: string;
  tourTitle: string;
  tourDescription: string;
  agentName: string;
  phone: string;
  email: string;
  address: string;
  tagline: string;
  stats: Array<{ value: string; label: string }>;
  showcaseEyebrow: string;
  showcaseTitle: string;
  whyEyebrow: string;
  whyTitle: string;
  whyItems: Array<{ title: string; description: string }>;
  testimonialQuote: string;
  testimonialAuthor: string;
  testimonialRole: string;
  navListings: string;
  navAbout: string;
  navContact: string;
  fullNameLabel: string;
  emailLabel: string;
  phoneLabel: string;
  messageLabel: string;
  formSubmit: string;
  formSubmitting: string;
  formSuccess: string;
  formError: string;
  saleLabel: string;
  rentLabel: string;
  listingsTitle: string;
  listingsDescription: string;
  searchLabel: string;
  typeLabel: string;
  locationLabel: string;
  allLabel: string;
  emptyListings: string;
  backLabel: string;
  listingAboutLabel: string;
  listingFeaturesLabel: string;
  findHomeTitle: string;
  findHomeDescription: string;
  keywordLabel: string;
  propertyTypeLabel: string;
  apartmentLabel: string;
  houseLabel: string;
  duplexLabel: string;
  roomLabel: string;
  priceRangeLabel: string;
  rentSectionTitle: string;
  saleSectionTitle: string;
  detailsLabel: string;
  areaLabel: string;
  bedLabel: string;
  bathLabel: string;
  neighborhoods: Array<{ name: string; description: string }>;
  neighborhoodsTitle: string;
  neighborhoodsDescription: string;
  neighborhoodListingLabel: string;
  featuredStripTitle: string;
  aboutTitle: string;
  aboutDescription: string;
  directContactLabel: string;
  agentImage: string;
  heroImage: string;
  averageYieldLabel: string;
  regionalGrowthLabel: string;
  activePortfolioLabel: string;
  rentalYieldLabel: string;
  roiLabel: string;
  pricePerM2Label: string;
  cardViewLabel: string;
  comparisonViewLabel: string;
  investmentWhyTitle: string;
};

export type TemplateConfig = {
  templateId: string;
  view: TemplateView;
  siteId: string;
  slug: string;
  colors: {
    background: string;
    primary: string;
    accent: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  content: TemplateContent;
  layout: {
    showCategories: boolean;
    showTestimonial: boolean;
  };
  listings: Listing[];
  listing?: Listing;
};

export type SiteTemplateProps = { config: TemplateConfig };

export type TemplateFamily = {
  Home: ComponentType<SiteTemplateProps>;
  Listings: ComponentType<SiteTemplateProps>;
  Detail: ComponentType<SiteTemplateProps>;
};

export type PublicSitePayload = {
  id: string;
  slug: string;
  config: {
    template_id?: string;
    business_name: string;
    tone: string;
    primary_color: string;
    accent_color: string;
    headline: string;
    theme_config?: Record<string, unknown> | null;
  };
  listings: Listing[];
};

type NestedThemeConfig = {
  colors?: Partial<TemplateConfig["colors"]>;
  fonts?: Partial<TemplateConfig["fonts"]>;
  content?: Partial<TemplateContent>;
  layout?: { show_categories?: boolean; show_testimonial?: boolean };
};

export const warmEditorialFallbacks: TemplateContent = {
  businessName: "Seçkin Gayrimenkul",
  eyebrow: "İstanbul'da özenle seçilmiş yaşam alanları",
  headline: "Yaşamak isteyeceğiniz",
  headlineAccent: "bir yer bulun.",
  bio: "İhtiyaçlarınızı dinleyen, bölge bilgisini şeffaf iletişimle birleştiren kişisel gayrimenkul danışmanlığı.",
  ctaText: "Portföyleri inceleyin",
  featuredEyebrow: "Seçkin portföyler",
  featuredTitle: "Yeni yaşamınız burada başlıyor.",
  categoriesEyebrow: "Yaşam biçiminize göre",
  categoriesTitle: "Kategoriye göre keşfedin.",
  tourTitle: "Randevu Planla",
  tourDescription: "İlgilendiğiniz portföyü birlikte gezmek için bilgilerinizi bırakın.",
  agentName: "Gayrimenkul Danışmanı",
  phone: "+90 212 000 00 00",
  email: "iletisim@example.com",
  address: "İstanbul, Türkiye",
  tagline: "Yaşam alanlarını kişisel bir seçkiyle buluşturuyoruz.",
  stats: [
    { value: "18+", label: "Seçkin Bölge" },
    { value: "95+", label: "Mutlu Müşteri" },
    { value: "120+", label: "Özel Konut" },
  ],
  showcaseEyebrow: "Seçkin yaşamlar",
  showcaseTitle: "Mimari, konum ve ayrıcalık.",
  whyEyebrow: "Neden biz",
  whyTitle: "Her ayrıntıda güven ve uzmanlık.",
  whyItems: [
    { title: "Yerel uzmanlık", description: "Her bölgeyi yaşam dinamikleri ve yatırım değeriyle birlikte değerlendiriyoruz." },
    { title: "Kişisel seçki", description: "Yalnız ihtiyaçlarınıza ve beklentilerinize gerçekten uyan evleri sunuyoruz." },
    { title: "Şeffaf süreç", description: "İlk görüşmeden anahtar teslimine kadar her adımı açıkça yönetiyoruz." },
  ],
  testimonialQuote: "Aradığımız evi değil, bize gerçekten uyan yaşamı bulduk.",
  testimonialAuthor: "Özel müşteri",
  testimonialRole: "Ev sahibi",
  navListings: "Portföyler",
  navAbout: "Yaklaşımımız",
  navContact: "İletişim",
  fullNameLabel: "Ad Soyad",
  emailLabel: "E-posta",
  phoneLabel: "Telefon",
  messageLabel: "Mesajınız",
  formSubmit: "Özel görüşme talep et",
  formSubmitting: "Gönderiliyor...",
  formSuccess: "Talebiniz alındı, en kısa sürede sizinle iletişime geçilecek.",
  formError: "Talebiniz gönderilemedi. Lütfen tekrar deneyin.",
  saleLabel: "Satılık",
  rentLabel: "Kiralık",
  listingsTitle: "Seçkin Portföyler",
  listingsDescription: "Güncel portföyleri konum ve ilan türüne göre keşfedin.",
  searchLabel: "Portföy ara",
  typeLabel: "İlan türü",
  locationLabel: "Konum",
  allLabel: "Tümü",
  emptyListings: "Aramanızla eşleşen aktif portföy bulunamadı.",
  backLabel: "Tüm portföyler",
  listingAboutLabel: "Portföy hakkında",
  listingFeaturesLabel: "Öne çıkan özellikler",
  findHomeTitle: "Evinizi Bulun",
  findHomeDescription: "İhtiyacınıza uygun portföyleri kolayca filtreleyin.",
  keywordLabel: "Anahtar kelime",
  propertyTypeLabel: "Gayrimenkul türü",
  apartmentLabel: "Daire",
  houseLabel: "Müstakil ev",
  duplexLabel: "Dubleks",
  roomLabel: "Oda sayısı",
  priceRangeLabel: "Fiyat aralığı",
  rentSectionTitle: "Öne Çıkan Kiralık",
  saleSectionTitle: "Öne Çıkan Satılık",
  detailsLabel: "Detaylar",
  areaLabel: "Alan",
  bedLabel: "Oda",
  bathLabel: "Banyo",
  neighborhoods: [],
  neighborhoodsTitle: "Mahalleleri keşfedin",
  neighborhoodsDescription: "Sokak sokak bildiğimiz bölgelerde size uygun yaşamı birlikte bulalım.",
  neighborhoodListingLabel: "ilan",
  featuredStripTitle: "Mahalleden yeni ilanlar",
  aboutTitle: "Merhaba, tanışalım",
  aboutDescription: "Bu mahallede yalnızca evleri değil, sokakları ve gündelik hayatı da tanıyorum. Ne aradığınızı konuşalım; doğru yeri birlikte bulalım.",
  directContactLabel: "Hemen ara",
  agentImage: "",
  heroImage: "",
  averageYieldLabel: "Ortalama kira getirisi",
  regionalGrowthLabel: "Bölgesel değer artışı",
  activePortfolioLabel: "Aktif portföy",
  rentalYieldLabel: "Kira getirisi",
  roiLabel: "Yatırım görünümü",
  pricePerM2Label: "m² fiyatı",
  cardViewLabel: "Kart Görünümü",
  comparisonViewLabel: "Karşılaştırma Görünümü",
  investmentWhyTitle: "Neden yatırım için birlikte çalışmalıyız?",
};

export const boldLuxuryFallbacks: TemplateContent = {
  ...warmEditorialFallbacks,
  eyebrow: "İstanbul’un ayrıcalıklı yaşam seçkisi",
  tagline: "Prestijli konutları güçlü temsil ve kişisel danışmanlıkla buluşturuyoruz.",
  ctaText: "Özel portföyleri keşfedin",
  stats: [
    { value: "18+", label: "Prestijli Bölge" },
    { value: "95+", label: "Müşteri Güveni" },
    { value: "120+", label: "Lüks Konut" },
  ],
  showcaseEyebrow: "Mimari seçki",
  showcaseTitle: "Sınırların ötesinde bir yaşam standardı.",
  whyEyebrow: "Ayrıcalığımız",
  whyTitle: "Üst segmentte güçlü temsil.",
  whyItems: [
    { title: "Özel erişim", description: "Herkese açık olmayan seçkin portföylere doğrudan erişim sağlıyoruz." },
    { title: "Stratejik temsil", description: "Her mülkü konumu, mimarisi ve yatırım değeriyle güçlü biçimde konumlandırıyoruz." },
    { title: "Mutlak gizlilik", description: "Tüm görüşme ve işlemleri üst segment beklentilere uygun gizlilikle yönetiyoruz." },
    { title: "Kusursuz süreç", description: "İlk temastan anahtar teslimine kadar tüm ayrıntıları kişisel olarak takip ediyoruz." },
  ],
  testimonialQuote: "Beklentimizin ötesinde, son derece seçkin ve güven veren bir deneyimdi.",
  testimonialAuthor: "İstanbul · Özel müşteri",
  featuredEyebrow: "Özel portföyler",
  featuredTitle: "Seçkin yaşam alanları.",
  tourTitle: "Özel Görüşme Talep Edin",
  tourDescription: "Portföy hakkında ayrıntılı bilgi ve kişisel sunum için bilgilerinizi bırakın.",
  listingsTitle: "Özel Portföy Seçkisi",
  listingsDescription: "Üst segment konutları konum, fiyat ve yaşam özellikleriyle inceleyin.",
};

export const cleanModernFallbacks: TemplateContent = {
  ...warmEditorialFallbacks,
  eyebrow: "Güncel gayrimenkul portföyleri",
  headlineAccent: "kolayca keşfedin.",
  tagline: "Doğru evi hızlı, şeffaf ve kolay bir deneyimle bulun.",
  ctaText: "Portföyleri görüntüle",
  featuredEyebrow: "Güncel fırsatlar",
  featuredTitle: "Size uygun seçenekleri karşılaştırın.",
  testimonialQuote: "Tüm seçenekleri kolayca karşılaştırdık ve doğru evi güvenle bulduk.",
  testimonialAuthor: "Elif ve Mert Kaya",
  testimonialRole: "Yeni ev sahipleri",
  tourTitle: "Bu portföy hakkında bilgi alın",
  tourDescription: "Danışmanımızın size ulaşması için iletişim bilgilerinizi bırakın.",
  listingsTitle: "Tüm Portföyler",
  listingsDescription: "Satılık ve kiralık portföyleri konum, tür, oda sayısı ve fiyata göre filtreleyin.",
};

export const neighborhoodFriendlyFallbacks: TemplateContent = {
  ...warmEditorialFallbacks,
  eyebrow: "Mahallenin içinden gayrimenkul danışmanlığı",
  headline: "Mahallende yeni bir ev mi arıyorsun?",
  headlineAccent: "Birlikte bakalım.",
  bio: "Sokağını, pazarını ve en güzel köşelerini bildiğim mahallelerde sana gerçekten uyan evi birlikte bulalım.",
  tagline: "Mahalleni bilen, seni dinleyen, komşu gibi bir danışman.",
  ctaText: "Mahalleleri keşfet",
  navAbout: "Mahalleler",
  featuredEyebrow: "Yeni komşularını bekleyenler",
  featuredTitle: "Mahalleden seçtiklerim",
  tourTitle: "Bu evi konuşalım mı?",
  tourDescription: "Telefonunu bırak, portföyü ve mahalleyi sana samimiyetle anlatayım.",
  listingsTitle: "Mahalledeki İlanlar",
  listingsDescription: "Konum ve ilan türüne göre mahalledeki güncel evlere göz at.",
  searchLabel: "Ev ara",
  directContactLabel: "WhatsApp’tan yaz",
  neighborhoods: [
    { name: "Kadıköy", description: "Sokağı canlı, ulaşımı kolay, her köşesi kendine özgü." },
    { name: "Moda", description: "Sahile yakın, sakin ve güçlü mahalle kültürüne sahip." },
    { name: "Bostancı", description: "Aile yaşamı, sahil ve ulaşım seçenekleri bir arada." },
  ],
};

export const investmentFocusedFallbacks: TemplateContent = {
  ...warmEditorialFallbacks,
  eyebrow: "Veriye dayalı gayrimenkul yatırımı",
  headline: "Yatırım Getirisi Yüksek Gayrimenkul Fırsatları",
  headlineAccent: "Rakamlarla doğru kararı verin.",
  bio: "Kira getirisi, bölgesel değer artışı ve fiyat verilerini birlikte değerlendirerek yatırım hedefinize uygun portföyleri seçiyoruz.",
  tagline: "Gayrimenkul yatırımında sezgi değil, ölçülebilir veri.",
  ctaText: "Yatırım fırsatlarını incele",
  featuredEyebrow: "Analiz edilen portföyler",
  featuredTitle: "Öne çıkan yatırım fırsatları",
  listingsTitle: "Yatırım Portföyleri",
  listingsDescription: "Portföyleri fiyat, m² değeri ve kira getirisiyle karşılaştırın.",
  tourTitle: "Yatırım analizini görüşelim",
  tourDescription: "Portföyün getiri potansiyeli ve piyasa verileri için bilgilerinizi bırakın.",
  stats: [
    { value: "%6,2", label: "Ortalama kira getirisi" },
    { value: "%18", label: "Bölgesel yıllık değer artışı" },
    { value: "24", label: "Analiz edilen portföy" },
  ],
  whyItems: [
    { title: "Piyasa bilgisi", description: "Bölgesel fiyat ve kira eğilimlerini güncel verilerle izliyoruz." },
    { title: "Veriye dayalı öneri", description: "Her portföyü getiri, birim fiyat ve değer artışı potansiyeliyle değerlendiriyoruz." },
    { title: "Ölçülebilir portföy", description: "Yatırım kararını karşılaştırılabilir metrikler ve açık varsayımlarla destekliyoruz." },
  ],
  navAbout: "Yatırım Yaklaşımı",
};

/**
 * Keeps the existing flat ThemeConfig contract as the source of truth while
 * presenting every template with one stable, renderer-friendly config prop.
 */
export function createTemplateConfig(
  payload: PublicSitePayload,
  view: TemplateView,
  listing?: Listing,
): TemplateConfig {
  const raw = (payload.config.theme_config || {}) as NestedThemeConfig;
  const defaults = payload.config.template_id === "bold-luxury"
    ? boldLuxuryFallbacks
    : payload.config.template_id === "clean-modern"
      ? cleanModernFallbacks
      : payload.config.template_id === "neighborhood-friendly"
        ? neighborhoodFriendlyFallbacks
        : payload.config.template_id === "investment-focused"
          ? investmentFocusedFallbacks
      : warmEditorialFallbacks;
  const isBoldLuxury = payload.config.template_id === "bold-luxury";
  const isCleanModern = payload.config.template_id === "clean-modern";
  const isNeighborhoodFriendly = payload.config.template_id === "neighborhood-friendly";
  const isInvestmentFocused = payload.config.template_id === "investment-focused";
  const legacyTheme: Pick<ThemeConfig, "primary" | "accent" | "fontPairing"> = {
    primary: payload.config.primary_color,
    accent: payload.config.accent_color,
    fontPairing: {
      heading: raw.fonts?.heading || (isCleanModern || isNeighborhoodFriendly || isInvestmentFocused ? "Manrope, Inter, Arial, sans-serif" : "Cormorant Garamond, Georgia, serif"),
      body: raw.fonts?.body || "Inter, Arial, sans-serif",
    },
  };
  const content = raw.content || {};

  return {
    templateId: payload.config.template_id || "tm_01",
    view,
    siteId: payload.id,
    slug: payload.slug,
    colors: {
      background: raw.colors?.background || (isBoldLuxury ? "#0A0A09" : isCleanModern || isInvestmentFocused ? "#FFFFFF" : isNeighborhoodFriendly ? "#FFF8F1" : "#F1EADF"),
      primary: raw.colors?.primary || legacyTheme.primary,
      accent: raw.colors?.accent || legacyTheme.accent,
      text: raw.colors?.text || (isBoldLuxury ? "#F5F1E8" : isCleanModern || isInvestmentFocused ? "#17211C" : isNeighborhoodFriendly ? "#352B25" : "#25231F"),
    },
    fonts: legacyTheme.fontPairing,
    content: {
      ...defaults,
      ...content,
      businessName: content.businessName || payload.config.business_name || defaults.businessName,
      headline: content.headline || payload.config.headline || defaults.headline,
      bio: content.bio || payload.config.tone || defaults.bio,
      neighborhoods: content.neighborhoods?.length ? content.neighborhoods : defaults.neighborhoods,
    },
    layout: {
      showCategories: raw.layout?.show_categories !== false,
      showTestimonial: raw.layout?.show_testimonial === true,
    },
    listings: payload.listings || [],
    listing,
  };
}
