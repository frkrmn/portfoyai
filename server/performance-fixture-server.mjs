import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = new URL("../dist/", import.meta.url).pathname;
const port = Number(process.env.PERFORMANCE_PORT || 4178);
const fixture = {
  id: "00000000-0000-4000-8000-000000000072",
  slug: "performance-fixture",
  language: "tr",
  config: {
    template_id: "clean-modern",
    business_name: "Fastate Performans",
    tone: "Hızlı ve güvenilir gayrimenkul danışmanlığı.",
    primary_color: "#173f32",
    accent_color: "#9a3412",
    headline: "Doğru portföyü hızlıca bulun",
    theme_config: { template_id: "clean-modern", colors: { background: "#fbfaf7", primary: "#173f32", accent: "#9a3412", text: "#17231e" }, fonts: { heading: "Arial", body: "Arial" }, content: {}, media: {} },
  },
  listings: Array.from({ length: 8 }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    title: `Performans portföyü ${index + 1}`,
    description: "Production benzeri performans ölçümü için sabit ilan içeriği.",
    price: 5000000 + index * 250000,
    currency: "TRY",
    m2: 100 + index,
    room_count: "3+1",
    listing_type: index % 2 ? "rent" : "sale",
    district: "Kadıköy",
    media: [],
    listing_status: "active",
    property_category: "konut",
    property_subtype: "daire",
    created_at: "2026-09-12T00:00:00.000Z",
    features: ["Merkezi konum", "Aydınlık"],
  })),
  show_closed_listings: false,
  show_team_section: false,
  team_members: [],
};
const longEnglish = {
  businessName: { tr: "Fastate", en: "International Residential Investment Advisory Collective" },
  headline: { tr: "Doğru portföy", en: "Discover an exceptionally considered approach to finding the right home for every chapter of your life" },
  headlineAccent: { tr: "Sizin için", en: "Guided by local expertise and long-term perspective" },
  tagline: { tr: "Danışmanlık", en: "Independent property guidance for buyers, sellers, investors, and families relocating across international markets" },
  bio: { tr: "Yerel uzmanlık.", en: "We combine neighborhood-level knowledge, careful financial analysis, and patient personal guidance so every decision remains clear, confident, and genuinely aligned with your long-term plans." },
  ctaText: { tr: "Portföyler", en: "Explore All Available Properties" },
  navListings: { tr: "Portföyler", en: "Browse Available Properties" },
  navAbout: { tr: "Hakkımızda", en: "Our Advisory Philosophy" },
  navContact: { tr: "İletişim", en: "Schedule a Personal Consultation" },
  featuredTitle: { tr: "Öne çıkanlar", en: "Carefully selected homes offering enduring quality, thoughtful design, and remarkable locations" },
  listingsTitle: { tr: "Portföyler", en: "Explore every currently available residential and investment opportunity" },
  listingsDescription: { tr: "Güncel seçenekler.", en: "Compare a broad collection of distinctive homes, promising investments, and rare land opportunities selected with lasting value in mind." },
  tourTitle: { tr: "Görüşelim", en: "Arrange a private and unhurried property consultation with our local advisory team" },
  tourDescription: { tr: "Detayları konuşalım.", en: "Tell us what matters most and we will prepare a focused shortlist, answer every practical question, and guide the next steps at your pace." },
  teamDescription: { tr: "Ekibimiz", en: "Meet experienced advisors who bring together local relationships, international perspective, and attentive personal service." },
};
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp" };
const send = (response, statusCode, type, body) => { response.writeHead(statusCode, { "Content-Type": type, "Cache-Control": "no-store" }); response.end(body); };

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`).pathname;
  const publicSiteMatch = pathname.match(/^\/api\/public-sites\/(performance-fixture|a11y-(.+)|long-en-(.+))$/);
  if (publicSiteMatch) {
    const templateId = publicSiteMatch[2] || publicSiteMatch[3] || "clean-modern";
    const isLongEnglish = Boolean(publicSiteMatch[3]);
    return send(response, 200, "application/json", JSON.stringify({
      ...fixture,
      slug: publicSiteMatch[1],
      language: isLongEnglish ? "en" : fixture.language,
      config: { ...fixture.config, business_name: isLongEnglish ? "International Residential Investment Advisory Collective" : fixture.config.business_name, headline: isLongEnglish ? longEnglish.headline.en : fixture.config.headline, template_id: templateId, theme_config: { ...fixture.config.theme_config, template_id: templateId, content: isLongEnglish ? longEnglish : {} } },
      listings: isLongEnglish ? fixture.listings.map((listing, index) => ({ ...listing, title: `A remarkably spacious and light-filled residence designed for sophisticated everyday living ${index + 1}`, description: longEnglish.listingsDescription.en, features: ["Exceptionally convenient access to international schools and neighborhood amenities", "Flexible living spaces designed for changing family priorities"] })) : fixture.listings,
    }));
  }
  try {
    const relative = pathname.startsWith("/assets/") ? normalize(pathname.slice(1)) : "index.html";
    const file = join(root, relative);
    if (!file.startsWith(root) || !(await stat(file)).isFile()) return send(response, 404, "text/plain", "Not found");
    return send(response, 200, mime[extname(file)] || "application/octet-stream", await readFile(file));
  } catch {
    return send(response, 404, "text/plain", "Not found");
  }
});

server.listen(port, "127.0.0.1", () => console.info(`Performance fixture listening on http://127.0.0.1:${port}`));
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => server.close(() => process.exit(0)));
