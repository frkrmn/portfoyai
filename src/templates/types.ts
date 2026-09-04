import type { ComponentType } from "react";
import type { LayoutFineTune, Listing, TeamMember, ThemeConfig } from "@/portfoyai/types";
import type { ContentFieldDescriptor } from "./content-schema";
import type { ImageSlotDescriptor } from "./image-schema";
import { resolveStoredContent, type StoredContentRecord } from "./content-localization";

export type TemplateView = "home" | "listings" | "detail" | "team";

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
  regionFocus: string;
  mapUrl: string;
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
  allPropertyTypesLabel: string;
  residentialLabel: string;
  landLabel: string;
  commercialLabel: string;
  apartmentLabel: string;
  detachedHouseLabel: string;
  villaLabel: string;
  residenceLabel: string;
  residentialZonedLabel: string;
  commercialZonedLabel: string;
  agriculturalFieldLabel: string;
  villaZonedLabel: string;
  urbanRenewalLabel: string;
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
  dealsSectionTitle: string;
  dealsSectionDescription: string;
  priceDroppedLabel: string;
  urgentSaleLabel: string;
  daysOnlineLabel: string;
  originalPriceLabel: string;
  opportunityLabel: string;
  matchEyebrow: string;
  matchTitle: string;
  matchDescription: string;
  feelingLabel: string;
  budgetMinLabel: string;
  budgetMaxLabel: string;
  timingLabel: string;
  matchSubmitLabel: string;
  matchResultsTitle: string;
  matchResultsDescription: string;
  feelings: string[];
  timings: string[];
  guideTitle: string;
  guideQuote: string;
  servicesTitle: string;
  servicesDescription: string;
  services: Array<{ title: string; description: string }>;
  teamTitle: string;
  teamDescription: string;
  teamMembers: Array<{ name: string; role: string; bio: string; photo_url: string }>;
  processTitle: string;
  processSteps: Array<{ title: string; description: string }>;
  navTeam: string;
  usageLabel: string;
  contactActionLabel: string;
};

export type TemplateConfig = {
  language: "tr" | "en";
  templateId: string;
  view: TemplateView;
  siteId: string;
  slug: string;
  colors: {
    background: string;
    primary: string;
    accent: string;
    text: string;
    buttonColorSource: "accent" | "primary" | "custom";
    buttonColorCustom?: string;
    button: string;
    buttonText: string;
  };
  fonts: {
    heading: string;
    body: string;
    headingWeight?: number;
    headingItalic?: boolean;
    bodyWeight?: number;
    bodyItalic?: boolean;
  };
  content: TemplateContent;
  storedContent: StoredContentRecord;
  media: Record<string, string | string[]>;
  layout: {
    showCategories: boolean;
    showTestimonial: boolean;
  };
  layoutFineTune: LayoutFineTune;
  listings: Listing[];
  closedListings: Listing[];
  showClosedListings: boolean;
  showTeamSection: boolean;
  teamSectionLabel: string;
  teamMembers: TeamMember[];
  listing?: Listing;
};

export type SiteTemplateProps = { config: TemplateConfig };

export type TemplateFamily = {
  Home: ComponentType<SiteTemplateProps>;
  Listings: ComponentType<SiteTemplateProps>;
  Detail: ComponentType<SiteTemplateProps>;
  contentSchema: ContentFieldDescriptor[];
  imageSchema: ImageSlotDescriptor[];
};

export type PublicSitePayload = {
  id: string;
  slug: string;
  language?: "tr" | "en" | null;
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
  show_closed_listings?: boolean;
  show_team_section?: boolean;
  team_section_label?: string | null;
  team_members?: TeamMember[];
};

type NestedThemeConfig = {
  language?: "tr" | "en";
  colors?: Partial<TemplateConfig["colors"]>;
  fonts?: Partial<TemplateConfig["fonts"]>;
  content?: Partial<TemplateContent>;
  media?: Record<string, string | string[]>;
  layout?: { show_categories?: boolean; show_testimonial?: boolean };
  layout_fine_tune?: LayoutFineTune;
};

export const fineTuneAttributes = (config: TemplateConfig) => ({
  className: "site-fine-tune min-h-screen",
  "data-button-style": config.layoutFineTune.buttonStyle,
  "data-nav-alignment": config.layoutFineTune.navAlignment,
  "data-spacing-density": config.layoutFineTune.spacingDensity,
  "data-card-style": config.layoutFineTune.cardStyle,
  "data-heading-scale": config.layoutFineTune.headingScale,
  "data-heading-weight": config.fonts.headingWeight,
  "data-heading-italic": config.fonts.headingItalic === undefined ? undefined : String(config.fonts.headingItalic),
  "data-body-weight": config.fonts.bodyWeight,
  "data-body-italic": config.fonts.bodyItalic === undefined ? undefined : String(config.fonts.bodyItalic),
});

export const themeStyleVariables = (config: TemplateConfig) => ({
  "--site-button": config.colors.button,
  "--site-button-text": config.colors.buttonText,
  "--site-heading-weight": config.fonts.headingWeight,
  "--site-body-weight": config.fonts.bodyWeight,
});

const contrastText = (color: string) => {
  const match = /^#([0-9a-f]{6})$/i.exec(color);
  if (!match) return "#FFFFFF";
  const channels = [0, 2, 4].map((offset) => Number.parseInt(match[1].slice(offset, offset + 2), 16) / 255)
    .map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722 > 0.48 ? "#151515" : "#FFFFFF";
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
  regionFocus: "İstanbul, Türkiye",
  mapUrl: "",
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
  allPropertyTypesLabel: "Tüm emlak türleri",
  residentialLabel: "Konut",
  landLabel: "Arsa",
  commercialLabel: "İş Yeri",
  apartmentLabel: "Daire",
  detachedHouseLabel: "Müstakil ev",
  villaLabel: "Villa",
  residenceLabel: "Rezidans",
  residentialZonedLabel: "Konut İmarlı",
  commercialZonedLabel: "Ticari İmarlı",
  agriculturalFieldLabel: "Tarla / Tarımsal",
  villaZonedLabel: "Villa İmarlı",
  urbanRenewalLabel: "Kentsel Dönüşüm",
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
  dealsSectionTitle: "Bugünün Fırsatları",
  dealsSectionDescription: "Güncel portföylerden öne çıkan fırsatlar.",
  priceDroppedLabel: "Fiyat Düştü",
  urgentSaleLabel: "Acil Satılık",
  daysOnlineLabel: "gündür yayında",
  originalPriceLabel: "Önceki fiyat",
  opportunityLabel: "Fırsat",
  matchEyebrow: "Kişisel ev eşleştirme",
  matchTitle: "Ne arıyorsun?",
  matchDescription: "Tercihlerini birkaç cümleyle paylaş; sana gerçekten uyan evleri birlikte daraltalım.",
  feelingLabel: "Nasıl bir his?",
  budgetMinLabel: "En düşük bütçe",
  budgetMaxLabel: "En yüksek bütçe",
  timingLabel: "Ne zaman taşınmak istiyorsun?",
  matchSubmitLabel: "Bana uygun evleri bul",
  matchResultsTitle: "Sana uygun eşleşmeler",
  matchResultsDescription: "Paylaştığın tercihlere göre öne çıkan portföyler.",
  feelings: ["Sakin", "Enerjik", "Aile dostu", "Şehirli"],
  timings: ["Hemen", "1–3 ay içinde", "3–6 ay içinde", "Henüz araştırıyorum"],
  guideTitle: "Evinizi birlikte bulalım",
  guideQuote: "Önce sizi dinliyorum; sonra yalnızca gerçekten uyan evleri gösteriyorum.",
  servicesTitle: "Hizmetlerimiz",
  servicesDescription: "Gayrimenkul kararlarınızı uzmanlık ve şeffaflıkla yönetiyoruz.",
  services: [
    { title: "Alım-Satım Danışmanlığı", description: "Doğru portföyü doğru koşullarla buluşturuyoruz." },
    { title: "İmar ve Tapu Takibi", description: "Teknik ve hukuki süreci dikkatle inceliyoruz." },
    { title: "Değerleme ve Pazarlama", description: "Portföyün gerçek değerini güçlü biçimde konumlandırıyoruz." },
    { title: "Yatırım Danışmanlığı", description: "Potansiyeli verilerle değerlendirip yol haritası sunuyoruz." },
  ],
  teamTitle: "Ekibimiz",
  teamDescription: "Arsa ve gayrimenkul süreçlerinde uzman ekibimizle yanınızdayız.",
  teamMembers: [],
  processTitle: "Nasıl Çalışıyoruz?",
  processSteps: [],
  navTeam: "Ekibimiz",
  usageLabel: "Kullanım",
  contactActionLabel: "İletişime Geç",
};

export const landPlotsFallbacks: TemplateContent = {
  ...warmEditorialFallbacks,
  eyebrow: "Arsa & Emlak Danışmanlığı",
  headline: "Toprağın değerini",
  headlineAccent: "uzmanlıkla geleceğe taşıyoruz.",
  bio: "Arsa, tarla ve imarlı gayrimenkullerde güvenilir analiz, doğru değerleme ve uçtan uca danışmanlık.",
  tagline: "Arazi yatırımlarında yerel bilgi, teknik inceleme ve güvenilir süreç yönetimi.",
  ctaText: "Portföyü İncele",
  featuredEyebrow: "Seçili portföyler",
  featuredTitle: "Geleceğe değer katan araziler",
  listingsTitle: "Portföyümüz",
  listingsDescription: "Arsa ve arazi portföylerini kullanım türüne göre inceleyin.",
  navAbout: "Hizmetlerimiz",
  navTeam: "Ekibimiz",
  tourTitle: "Bu ilan hakkında bilgi alın",
  tourDescription: "Portföyün imar, tapu ve yatırım detaylarını ekibimizle değerlendirin.",
  contactActionLabel: "İletişime Geç",
  teamMembers: [
    { name: "Mert Erta", role: "Kurucu Gayrimenkul Danışmanı", bio: "Arazi yatırımları ve bölgesel değerleme alanında danışmanlık sunar.", photo_url: "" },
    { name: "Selin Kaya", role: "İmar ve Tapu Uzmanı", bio: "Teknik inceleme ve resmi süreçleri anlaşılır biçimde yönetir.", photo_url: "" },
    { name: "Emre Yalçın", role: "Yatırım Danışmanı", bio: "Portföyleri gelişim potansiyeli ve piyasa verileriyle değerlendirir.", photo_url: "" },
  ],
  processSteps: [
    { title: "Dinliyoruz", description: "Hedefinizi, bütçenizi ve yatırım beklentinizi netleştiriyoruz." },
    { title: "Analiz Ediyoruz", description: "İmar, tapu, konum ve değer verilerini birlikte inceliyoruz." },
    { title: "Sonuçlandırıyoruz", description: "Müzakere ve devir sürecini güvenle tamamlıyoruz." },
  ],
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

export const urgentDealsFallbacks: TemplateContent = {
  ...warmEditorialFallbacks,
  eyebrow: "Hızlı karar verenlere güncel fırsatlar",
  headline: "Kaçırılmayacak Fırsatlar, Hızlı Sonuç",
  headlineAccent: "Doğru fırsatı bugün yakalayın.",
  bio: "Acil satılık ve fiyatı düşen portföyleri kısa, açık bilgilerle sunuyor; karar sürecinizi hızlandırıyoruz.",
  tagline: "Doğru fiyat, net bilgi, hızlı iletişim.",
  ctaText: "Fırsatları incele",
  featuredEyebrow: "Günün seçkisi",
  featuredTitle: "Bugünün Fırsatları",
  listingsTitle: "Güncel Fırsat İlanları",
  listingsDescription: "Konum ve bütçenize uyan acil satılık veya fiyatı düşen ilanları hızlıca karşılaştırın.",
  tourTitle: "Fırsatı kaçırmadan bilgi alın",
  tourDescription: "İlanın güncel durumu ve detayları için bilgilerinizi bırakın; hızlıca size dönelim.",
  navAbout: "Bugünün Fırsatları",
  dealsSectionTitle: "Bugünün Fırsatları",
  dealsSectionDescription: "Acil satış veya güncel fiyat avantajı taşıyan portföyler.",
  priceDroppedLabel: "Fiyat Düştü",
  urgentSaleLabel: "Acil Satılık",
  daysOnlineLabel: "gündür yayında",
  originalPriceLabel: "Önceki fiyat",
  opportunityLabel: "Fırsat",
};

export const guidedMatchFallbacks: TemplateContent = {
  ...warmEditorialFallbacks,
  eyebrow: "Sizi dinleyen kişisel gayrimenkul danışmanlığı",
  headline: "Doğru ev, doğru sorularla",
  headlineAccent: "birlikte bulunur.",
  bio: "Standart filtrelerden önce nasıl yaşamak istediğinizi konuşuyor, seçenekleri size göre özenle daraltıyorum.",
  tagline: "Tercihlerinizi anlayan, doğru eve sakince yönlendiren kişisel rehberlik.",
  ctaText: "Eşleşmeni başlat",
  featuredEyebrow: "Sizin için seçtiklerimiz",
  featuredTitle: "Sevdiğimiz birkaç yer",
  listingsTitle: "Size Uygun Portföyler",
  listingsDescription: "Tercihlerinizi paylaşarak ya da tüm güncel portföyleri doğrudan inceleyerek başlayın.",
  tourTitle: "Bu evi birlikte değerlendirelim",
  tourDescription: "Sorularınızı ve beklentilerinizi paylaşın; size kişisel olarak dönüş yapayım.",
  navAbout: "Rehberiniz",
  guideTitle: "Evinizi birlikte bulalım",
  guideQuote: "Önce sizi dinliyorum; sonra yalnızca gerçekten uyan evleri gösteriyorum.",
  matchEyebrow: "Kişisel eşleştirme",
  matchTitle: "Ne arıyorsun?",
  matchDescription: "Mahalle tercihini, bütçeni ve aradığın hissi paylaş; sana en yakın eşleşmeleri gösterelim.",
  matchSubmitLabel: "Bana uygun evleri bul",
  matchResultsTitle: "Sana uygun eşleşmeler",
  matchResultsDescription: "Paylaştığın tercihlere göre öne çıkan güncel portföyler.",
};

export const templateContentFallbacks = (templateId?: string) => templateId === "bold-luxury"
  ? boldLuxuryFallbacks
  : templateId === "clean-modern"
    ? cleanModernFallbacks
    : templateId === "neighborhood-friendly"
      ? neighborhoodFriendlyFallbacks
      : templateId === "investment-focused"
        ? investmentFocusedFallbacks
        : templateId === "urgent-deals"
          ? urgentDealsFallbacks
          : templateId === "guided-match"
            ? guidedMatchFallbacks
            : templateId === "land-plots"
              ? landPlotsFallbacks
              : warmEditorialFallbacks;

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
  const defaults = templateContentFallbacks(payload.config.template_id);
  const isBoldLuxury = payload.config.template_id === "bold-luxury";
  const isCleanModern = payload.config.template_id === "clean-modern";
  const isNeighborhoodFriendly = payload.config.template_id === "neighborhood-friendly";
  const isInvestmentFocused = payload.config.template_id === "investment-focused";
  const isUrgentDeals = payload.config.template_id === "urgent-deals";
  const isGuidedMatch = payload.config.template_id === "guided-match";
  const isLandPlots = payload.config.template_id === "land-plots";
  const legacyTheme: Pick<ThemeConfig, "primary" | "accent" | "fontPairing"> = {
    primary: payload.config.primary_color,
    accent: payload.config.accent_color,
    fontPairing: {
      heading: raw.fonts?.heading || (isCleanModern || isNeighborhoodFriendly || isInvestmentFocused || isUrgentDeals ? "Manrope, Inter, Arial, sans-serif" : "Cormorant Garamond, Georgia, serif"),
      body: raw.fonts?.body || "Inter, Arial, sans-serif",
    },
  };
  const storedContent = (raw.content || {}) as StoredContentRecord;
  const content = resolveStoredContent<Partial<TemplateContent>>(storedContent, "tr");
  const buttonColorSource = ["accent", "primary", "custom"].includes(raw.colors?.buttonColorSource || "")
    ? raw.colors!.buttonColorSource as "accent" | "primary" | "custom"
    : "accent";
  const primary = raw.colors?.primary || legacyTheme.primary;
  const accent = raw.colors?.accent || legacyTheme.accent;
  const customButton = /^#[0-9a-f]{6}$/i.test(raw.colors?.buttonColorCustom || "") ? raw.colors?.buttonColorCustom : undefined;
  const button = buttonColorSource === "primary" ? primary : buttonColorSource === "custom" && customButton ? customButton : accent;

  return {
    language: payload.language === "en" || raw.language === "en" ? "en" : "tr",
    templateId: payload.config.template_id || "tm_01",
    view,
    siteId: payload.id,
    slug: payload.slug,
    colors: {
      background: raw.colors?.background || (isBoldLuxury ? "#0A0A09" : isCleanModern || isInvestmentFocused || isUrgentDeals || isLandPlots ? "#FFFFFF" : isNeighborhoodFriendly || isGuidedMatch ? "#FFF8F1" : "#F1EADF"),
      primary,
      accent,
      text: raw.colors?.text || (isBoldLuxury ? "#F5F1E8" : isCleanModern || isInvestmentFocused || isUrgentDeals || isLandPlots ? "#17211C" : isNeighborhoodFriendly || isGuidedMatch ? "#352B25" : "#25231F"),
      buttonColorSource,
      buttonColorCustom: customButton,
      button,
      buttonText: contrastText(button),
    },
    fonts: {
      ...legacyTheme.fontPairing,
      headingWeight: raw.fonts?.headingWeight,
      headingItalic: raw.fonts?.headingItalic,
      bodyWeight: raw.fonts?.bodyWeight,
      bodyItalic: raw.fonts?.bodyItalic,
    },
    content: {
      ...defaults,
      ...content,
      businessName: content.businessName || payload.config.business_name || defaults.businessName,
      headline: content.headline || payload.config.headline || defaults.headline,
      bio: content.bio || payload.config.tone || defaults.bio,
      neighborhoods: content.neighborhoods?.length ? content.neighborhoods : defaults.neighborhoods,
      feelings: content.feelings?.length ? content.feelings : defaults.feelings,
      timings: content.timings?.length ? content.timings : defaults.timings,
      teamMembers: content.teamMembers?.length ? content.teamMembers : defaults.teamMembers,
      processSteps: content.processSteps?.length ? content.processSteps : defaults.processSteps,
      services: content.services?.length ? content.services : defaults.services,
    },
    storedContent,
    media: raw.media || {},
    layout: {
      showCategories: raw.layout?.show_categories !== false,
      showTestimonial: raw.layout?.show_testimonial === true,
    },
    layoutFineTune: raw.layout_fine_tune || {},
    listings: (payload.listings || []).filter((item) => !item.listing_status || item.listing_status === "active"),
    closedListings: (payload.listings || []).filter((item) => item.listing_status === "sold" || item.listing_status === "rented"),
    showClosedListings: payload.show_closed_listings === true,
    showTeamSection: payload.show_team_section === true,
    teamSectionLabel: payload.team_section_label?.trim() || ((payload.team_members || []).length === 1 ? "Danışmanımız" : "Ekibimiz"),
    teamMembers: payload.team_members || [],
    listing,
  };
}
