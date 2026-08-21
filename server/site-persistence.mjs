export const slugifyBusinessName = (businessName) => {
  const transliterated = businessName
    .replace(/[Çç]/g, "c")
    .replace(/[Ğğ]/g, "g")
    .replace(/[İIı]/g, "i")
    .replace(/[Öö]/g, "o")
    .replace(/[Şş]/g, "s")
    .replace(/[Üü]/g, "u");

  return transliterated
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "") || "site";
};

export const insertGeneratedSite = async (supabase, config, sessionId, userId = null) => {
  const baseSlug = slugifyBusinessName(config.business_name);

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const { data: site, error } = await supabase
      .from("sites")
      .insert({
        session_id: sessionId,
        user_id: userId,
        slug,
        business_name: config.business_name,
        tone: config.tone,
        primary_color: config.primary_color,
        accent_color: config.accent_color,
        headline: config.headline,
        status: "draft",
      })
      .select("id, slug")
      .single();

    if (!error) return site;
    if (error.code !== "23505") {
      throw new Error(`Failed to save generated site: ${error.message}`);
    }
  }

  throw new Error("Failed to create a unique site slug after 25 attempts.");
};
