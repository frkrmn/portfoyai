const localizedTr = (value) => typeof value === "string" ? value : value?.tr || "";

export const siteSelect = "id, slug, user_id, business_name, phone, email, address, region_focus, map_url, theme_config, previous_theme_config, status, show_closed_listings, show_team_section, team_section_label, country_id, province_id, district_id, neighborhood_id, created_at";

export const canonicalSiteProjection = (site) => {
  const storedTheme = site.theme_config || {};
  const storedContent = storedTheme.content || {};
  const themeConfig = {
    ...storedTheme,
    content: {
      ...storedContent,
      businessName: site.business_name,
      phone: site.phone || "",
      email: site.email || "",
      address: site.address || "",
      regionFocus: site.region_focus || "",
      mapUrl: site.map_url || "",
    },
  };
  return {
    ...site,
    tone: localizedTr(storedContent.bio),
    headline: localizedTr(storedContent.headline),
    primary_color: storedTheme.colors?.primary || "#173F32",
    accent_color: storedTheme.colors?.accent || "#D86F45",
    theme_config: themeConfig,
  };
};
