import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
try {
  const { createTemplateConfig } = await vite.ssrLoadModule("/src/templates/types.ts");
  const { SharedTeamHeaderLink, SharedTeamPage, SharedTeamSection } = await vite.ssrLoadModule("/src/templates/SharedTeamPage.tsx");
  const { SharedFooterContact } = await vite.ssrLoadModule("/src/templates/SharedFooterContact.tsx");
  const { getTemplateFamily } = await vite.ssrLoadModule("/src/templates/registry.ts");
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

  const one = createTemplateConfig({ ...base, team_members: [member("one", "Deniz Kaya")] }, "home");
  assert.equal(one.teamSectionLabel, "Danışmanımız");
  assert.match(render(SharedTeamPage, one), /Deniz Kaya/);
  assert.match(render(SharedTeamHeaderLink, one), />Danışmanımız</);
  assert.match(render(SharedTeamSection, one), /data-team-section/);
  const contactConfig = createTemplateConfig({
    ...base,
    config: { ...base.config, theme_config: { ...base.config.theme_config, content: { regionFocus: "Moda, Kadıköy, İstanbul", mapUrl: "https://maps.app.goo.gl/example" } } },
    team_members: [member("one", "Deniz Kaya")],
  }, "home");
  const contact = render(SharedFooterContact, contactConfig);
  assert.match(contact, /data-footer-contact/);
  assert.match(contact, />Adres</);
  assert.match(contact, />Telefon</);
  assert.match(contact, />E-posta</);
  assert.match(contact, /Moda, Kadıköy, İstanbul/);
  assert.match(contact, /href="https:\/\/maps\.app\.goo\.gl\/example"/);
  assert.match(contact, /Haritada Göster/);
  assert.match(contact, /href="tel:/);
  assert.match(contact, /href="mailto:/);

  const two = createTemplateConfig({ ...base, team_members: [member("one", "Deniz Kaya"), member("two", "Ece Akın")] }, "team");
  assert.equal(two.teamSectionLabel, "Ekibimiz");
  assert.match(render(SharedTeamPage, two), /Ece Akın/);

  const custom = createTemplateConfig({ ...base, team_section_label: "Danışmanlarımız", team_members: [member("one", "Deniz Kaya"), member("two", "Ece Akın")] }, "team");
  assert.equal(custom.teamSectionLabel, "Danışmanlarımız");

  const hidden = createTemplateConfig({ ...base, show_team_section: false, team_members: [member("one", "Deniz Kaya")] }, "home");
  assert.equal(render(SharedTeamHeaderLink, hidden), "");
  assert.equal(render(SharedTeamSection, hidden), "");

  const templateIds = ["warm-editorial", "bold-luxury", "clean-modern", "neighborhood-friendly", "investment-focused", "urgent-deals", "guided-match", "land-plots", "tm_01"];
  for (const templateId of templateIds) {
    const config = createTemplateConfig({ ...base, config: { ...base.config, template_id: templateId, theme_config: { ...base.config.theme_config, template_id: templateId } }, team_members: [member("one", "Deniz Kaya")] }, "home");
    const html = render(getTemplateFamily(templateId).Home, config);
    assert.match(html, /data-team-section/, `${templateId} must render the team inside the landing flow`);
    assert.equal((html.match(/data-footer-contact/g) || []).length, 1, `${templateId} must render the standard footer contact block once`);
    assert.match(html, />Danışmanımız<\/a>/, `${templateId} header must show the team section label`);
    assert.equal((html.match(/href="#ekibimiz"/g) || []).length, 1, `${templateId} must link to the team section once from its header`);
  }

  console.info(JSON.stringify({ one_member_label: one.teamSectionLabel, two_member_label: two.teamSectionLabel, custom_label: custom.teamSectionLabel, hidden_nav: false, placeholder_photo: true, inline_templates: templateIds }, null, 2));
} finally {
  await vite.close();
}
