import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
try {
  const { createTemplateConfig } = await vite.ssrLoadModule("/src/templates/types.ts");
  const { SharedTeamNavLink, SharedTeamPage } = await vite.ssrLoadModule("/src/templates/SharedTeamPage.tsx");
  const base = {
    id: "warm-team-site",
    slug: "sicak-ekip",
    config: {
      template_id: "warm-editorial",
      business_name: "Sahil Emlak",
      tone: "Mahallenizi bilen kişisel danışmanlık.",
      primary_color: "#20372f",
      accent_color: "#c56f4b",
      headline: "Evinizi birlikte bulalım",
      theme_config: { template_id: "warm-editorial", colors: { background: "#f8f0e5", primary: "#20372f", accent: "#c56f4b", text: "#29241f" }, fonts: { heading: "Georgia, serif", body: "Arial, sans-serif" } },
    },
    listings: [],
    show_team_section: true,
  };
  const member = (id, name) => ({ id, site_id: base.id, name, role: "Gayrimenkul Danışmanı", bio: "Bölgesinde uzman kişisel danışman.", photo_url: "", sort_order: 0, created_at: new Date().toISOString() });
  const render = (Component, config) => renderToString(React.createElement(MemoryRouter, null, React.createElement(Component, { config })));

  const one = createTemplateConfig({ ...base, team_members: [member("one", "Deniz Kaya")] }, "team");
  assert.equal(one.teamSectionLabel, "Danışmanımız");
  assert.match(render(SharedTeamPage, one), /Deniz Kaya/);
  assert.match(render(SharedTeamNavLink, one), /Danışmanımız/);

  const two = createTemplateConfig({ ...base, team_members: [member("one", "Deniz Kaya"), member("two", "Ece Akın")] }, "team");
  assert.equal(two.teamSectionLabel, "Ekibimiz");
  assert.match(render(SharedTeamPage, two), /Ece Akın/);

  const custom = createTemplateConfig({ ...base, team_section_label: "Danışmanlarımız", team_members: [member("one", "Deniz Kaya"), member("two", "Ece Akın")] }, "team");
  assert.equal(custom.teamSectionLabel, "Danışmanlarımız");

  const hidden = createTemplateConfig({ ...base, show_team_section: false, team_members: [member("one", "Deniz Kaya")] }, "home");
  assert.equal(render(SharedTeamNavLink, hidden), "");

  console.info(JSON.stringify({ one_member_label: one.teamSectionLabel, two_member_label: two.teamSectionLabel, custom_label: custom.teamSectionLabel, hidden_nav: false, placeholder_photo: true }, null, 2));
} finally {
  await vite.close();
}
