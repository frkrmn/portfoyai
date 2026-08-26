import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";
import { buildStarterListings } from "./site-persistence.mjs";
import { ensureLandPlotsContent } from "./handlers/generate-theme.mjs";

const generated = ensureLandPlotsContent({
  template_id: "land-plots",
  business_name: "Erta Arsa Danışmanlık",
  tone: "Profesyonel arsa ve imarlı gayrimenkul danışmanlığı.",
  primary_color: "#102f3d",
  accent_color: "#708b79",
  headline: "Toprağın değerini uzmanlıkla geleceğe taşıyoruz",
  region_focus: "İstanbul, Tekirdağ, Çanakkale",
  content: {},
});
const listings = buildStarterListings(generated, "land-plots-e2e-site").map((listing, index) => ({ ...listing, id: `land-${index}`, created_at: new Date().toISOString(), listing_status: "active" }));
assert.equal(listings.length, 6);
assert.ok(listings.every((listing) => listing.property_category === "arsa"));
assert.equal(new Set(listings.map((listing) => listing.property_subtype)).size, 5);
assert.ok(listings.every((listing) => listing.features.length >= 3));

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
const originalError = console.error;
console.error = (...args) => {
  const message = String(args[0] || "");
  if (message.includes("useLayoutEffect does nothing on the server") || message.includes("NO_I18NEXT_INSTANCE")) return;
  originalError(...args);
};
try {
  const types = await vite.ssrLoadModule("/src/templates/types.ts");
  const template = await vite.ssrLoadModule("/src/templates/land-plots/LandPlotsTemplate.tsx");
  const sharedTeam = await vite.ssrLoadModule("/src/templates/SharedTeamPage.tsx");
  const teamMembers = generated.content.teamMembers.map((member, index) => ({ ...member, id: `member-${index}`, site_id: "land-plots-e2e-site", sort_order: index, created_at: new Date().toISOString() }));
  const payload = { id: "land-plots-e2e-site", slug: "erta-arsa", config: { ...generated, theme_config: { template_id: "land-plots", colors: { background: "#fff", primary: generated.primary_color, accent: generated.accent_color, text: "#17211c" }, fonts: { heading: "Georgia, serif", body: "Arial, sans-serif" }, content: generated.content } }, listings, show_team_section: true, team_members: teamMembers };
  const render = (Component, view, listing) => renderToString(React.createElement(MemoryRouter, null, React.createElement(Component, { config: types.createTemplateConfig(payload, view, listing) })));
  const home = render(template.LandPlotsHome, "home");
  const grid = render(template.LandPlotsListings, "listings");
  const detail = render(template.LandPlotsDetail, "detail", listings[0]);
  const team = render(sharedTeam.SharedTeamPage, "team");
  assert.match(home, /Hizmetlerimiz/);
  assert.match(grid, /Konut İmarlı/);
  assert.match(grid, /Ticari İmarlı/);
  assert.match(grid, /Tarla \/ Tarımsal/);
  assert.match(grid, /Villa İmarlı/);
  assert.match(grid, /Kentsel Dönüşüm/);
  assert.match(detail, /Öne çıkan özellikler/i);
  assert.match(team, /Erta Arsa Danışmanlık Kurucusu/);
  assert.match(team, /Nasıl Çalışıyoruz/);
  console.info(JSON.stringify({ template_id: generated.template_id, listings: listings.length, distinct_subtypes: 5, services: generated.content.services.length, team_members: generated.content.teamMembers.length, process_steps: generated.content.processSteps.length, rendered: ["home", "listings", "detail", "team"] }, null, 2));
} finally {
  console.error = originalError;
  await vite.close();
}
