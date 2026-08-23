import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";

const env = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const warmEditorialDemoConfig = {
  template_id: "warm-editorial",
  colors: { background: "#f1eadf", primary: "#292923", accent: "#9a7455", text: "#25231f" },
  fonts: { heading: "Cormorant Garamond, Georgia, serif", body: "Inter, Arial, sans-serif" },
  content: {
    businessName: "Atölye Gayrimenkul",
    eyebrow: "İstanbul’un iyi yaşam rehberi",
    headline: "Yaşamak isteyeceğiniz",
    headlineAccent: "bir yer bulun.",
    bio: "Kadıköy, Beşiktaş ve Boğaz hattında karakterli evleri; doğru bilgi, sakin bir süreç ve kişisel danışmanlıkla buluşturuyoruz.",
    ctaText: "Portföyleri keşfedin",
    featuredEyebrow: "Özenle seçilenler",
    featuredTitle: "Her ev, kendine ait bir hikâye anlatır.",
    categoriesEyebrow: "Yaşam biçiminize göre",
    categoriesTitle: "Nasıl yaşamak istediğinizi seçin.",
    tourTitle: "Randevu Planla",
    tourDescription: "İlgilendiğiniz evi birlikte gezmek için size ulaşabileceğimiz bilgileri bırakın.",
    agentName: "Selin Arman",
    phone: "+90 532 410 24 18",
    email: "selin@atolyegayrimenkul.com",
    address: "Moda Caddesi No: 42, Kadıköy / İstanbul",
  },
  layout: { show_categories: true },
};

const images = [
  "/images/listings/caddebostan-sea-view.jpg",
  "/images/listings/bagdat-residence.jpg",
  "/images/listings/fenerbahce-garden.jpg",
  "/images/listings/moda-character.jpg",
  "/images/listings/suadiye-penthouse.jpg",
];

const listingSeeds = [
  ["Caddebostan’da Denizle İç İçe 3+1", "Gün ışığını gün boyu içeri alan geniş salonu, sakin renkleri ve sahile birkaç adımlık konumuyla zarif bir şehir evi.", 18750000, 168, "3+1", "sale", "Kadıköy", ["Deniz manzarası", "Kapalı otopark", "Ebeveyn banyosu", "Balkon"]],
  ["Bebek’te Boğaz Manzaralı Zarif Daire", "Boğazın değişen ışığına açılan, yenilenmiş detayları ve dingin atmosferiyle özel bir yaşam alanı.", 28500000, 142, "2+1", "sale", "Beşiktaş", ["Boğaz manzarası", "Yenilenmiş iç mimari", "Asansör", "Merkezi konum"]],
  ["Acarkent’te Bahçeli Müstakil Yaşam", "Olgun ağaçlarla çevrili özel bahçesi, şömineli salonu ve aile yaşamına uygun planıyla huzurlu bir ev.", 46500000, 340, "5+1", "sale", "Beykoz", ["Özel bahçe", "Şömine", "Otopark", "Güvenlik"]],
  ["Moda’da Karakterli Tarihi Daire", "Özgün ahşap detayları korunarak yenilenen, yüksek tavanlı ve Moda’nın gündelik hayatına karışan özel bir daire.", 98000, 118, "2+1", "rent", "Kadıköy", ["Yüksek tavan", "Özgün ahşap detaylar", "Cumbalı salon", "Merkezi konum"]],
  ["Suadiye’de Teraslı Dubleks", "Geniş terası, yalın iç mimarisi ve ferah yaşam alanlarıyla sahil hattında sakin ve çağdaş bir ev.", 23900000, 210, "4+1", "sale", "Kadıköy", ["Geniş teras", "Yerden ısıtma", "Akıllı ev sistemi", "Kapalı otopark"]],
  ["Arnavutköy’de Boğaza Yakın 2+1", "Semtin dokusunu yansıtan cephesi, işlevli planı ve Boğaz hattına yakınlığıyla keyifli bir kiralık seçenek.", 115000, 105, "2+1", "rent", "Beşiktaş", ["Boğaza yakın", "Yenilenmiş mutfak", "Doğal ışık", "Sessiz sokak"]],
];

const { data: site, error: siteError } = await supabase
  .from("sites")
  .upsert({
    id: "7b223f5e-0c77-4f6e-950a-a97258f33b3a",
    session_id: "warm-editorial-demo-session",
    slug: "atolye-gayrimenkul",
    business_name: "Atölye Gayrimenkul",
    tone: "Sıcak, editoryal ve kişisel bir gayrimenkul danışmanlığı yaklaşımı.",
    primary_color: warmEditorialDemoConfig.colors.primary,
    accent_color: warmEditorialDemoConfig.colors.accent,
    headline: "İstanbul’da yaşamak isteyeceğiniz bir yer bulun.",
    theme_config: warmEditorialDemoConfig,
    status: "published",
  }, { onConflict: "slug" })
  .select("id, slug")
  .single();
if (siteError) throw siteError;

const listings = listingSeeds.map(([title, description, price, m2, roomCount, listingType, district, features], index) => ({
  id: `e1010000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  site_id: site.id,
  title,
  description,
  price,
  currency: "TRY",
  m2,
  room_count: roomCount,
  listing_type: listingType,
  district,
  lat: 41.0 + index / 100,
  lng: 29.0 + index / 100,
  media: [0, 1, 2].map((offset) => {
    const url = images[(index + offset) % images.length];
    return { id: `we-${index + 1}-${offset + 1}`, url, thumbUrl: url, alt: `${title} görseli` };
  }),
  status: "active",
  features,
}));

const { error: listingsError } = await supabase.from("listings").upsert(listings, { onConflict: "id" });
if (listingsError) throw listingsError;

console.info(JSON.stringify({ site_id: site.id, slug: site.slug, listings: listings.length, public_path: `/site/${site.slug}` }));
