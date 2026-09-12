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
    accent_color: "#d86f45",
    headline: "Doğru portföyü hızlıca bulun",
    theme_config: { template_id: "clean-modern", colors: { background: "#fbfaf7", primary: "#173f32", accent: "#d86f45", text: "#17231e" }, fonts: { heading: "Arial", body: "Arial" }, content: {}, media: {} },
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
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp" };
const send = (response, statusCode, type, body) => { response.writeHead(statusCode, { "Content-Type": type, "Cache-Control": "no-store" }); response.end(body); };

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`).pathname;
  if (pathname === "/api/public-sites/performance-fixture") return send(response, 200, "application/json", JSON.stringify(fixture));
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
