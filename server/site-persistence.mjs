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

const buildThemeConfig = (config) => {
  const isBoldLuxury = config.template_id === "bold-luxury";
  const isCleanModern = config.template_id === "clean-modern";
  const isNeighborhoodFriendly = config.template_id === "neighborhood-friendly";
  const isInvestmentFocused = config.template_id === "investment-focused";
  const isUrgentDeals = config.template_id === "urgent-deals";
  const isGuidedMatch = config.template_id === "guided-match";
  return {
    template_id: config.template_id,
    colors: {
      background: isBoldLuxury ? "#0A0A09" : isCleanModern || isInvestmentFocused || isUrgentDeals ? "#FFFFFF" : isNeighborhoodFriendly || isGuidedMatch ? "#FFF8F1" : "#F1EADF",
      primary: config.primary_color,
      accent: config.accent_color,
      buttonColorSource: "accent",
      text: isBoldLuxury ? "#F5F1E8" : isCleanModern || isInvestmentFocused || isUrgentDeals ? "#17211C" : isNeighborhoodFriendly || isGuidedMatch ? "#352B25" : "#25231F",
    },
    fonts: {
      heading: isCleanModern || isNeighborhoodFriendly || isInvestmentFocused || isUrgentDeals ? "Manrope, Inter, Arial, sans-serif" : "Cormorant Garamond, Georgia, serif",
      body: "Inter, Arial, sans-serif",
    },
    content: {
      businessName: config.business_name,
      headline: config.headline,
      bio: config.tone,
      regionFocus: config.region_focus,
      neighborhoods: config.content?.neighborhoods,
      feelings: config.content?.feelings,
      timings: config.content?.timings,
      tagline: isBoldLuxury
        ? "Ayrıcalıklı yaşamlar için seçkin bir gayrimenkul deneyimi."
        : isInvestmentFocused
          ? "Kira getirisi, değer artışı ve piyasa verileriyle desteklenen yatırım danışmanlığı."
          : isNeighborhoodFriendly
          ? "Mahallenizi bilen, sizi dinleyen ve doğru evi birlikte bulan komşu gibi danışmanlık."
        : isCleanModern
          ? "Doğru evi hızlı, şeffaf ve kolay bir deneyimle bulun."
          : isUrgentDeals
            ? "Güncel fiyat avantajlarını net bilgi ve hızlı iletişimle yakalayın."
          : isGuidedMatch
            ? "Sizi dinleyen, tercihlerinizi anlayan ve doğru eve yönlendiren kişisel danışmanlık."
          : "Yaşam alanlarını kişisel bir seçkiyle buluşturuyoruz.",
    },
    layout: {
      show_categories: !isBoldLuxury && !isCleanModern && !isNeighborhoodFriendly && !isInvestmentFocused && !isUrgentDeals && !isGuidedMatch,
      show_testimonial: isBoldLuxury || isCleanModern,
    },
    ...(config.layout_fine_tune ? { layout_fine_tune: config.layout_fine_tune } : {}),
  };
};

const defaultDistricts = ["Kadıköy", "Beşiktaş", "Ataşehir", "Şişli", "Üsküdar", "Bakırköy"];

const normalizeDistricts = (config) => {
  const neighborhoods = config.content?.neighborhoods
    ?.map((item) => item?.name?.trim())
    .filter(Boolean);
  if (config.template_id === "neighborhood-friendly" && neighborhoods?.length) {
    return neighborhoods;
  }

  const regionDistricts = typeof config.region_focus === "string"
    ? config.region_focus
      .split(/,|;|\s+ve\s+|\//i)
      .map((item) => item.trim())
      .filter(Boolean)
    : [];
  return regionDistricts.length ? regionDistricts : defaultDistricts;
};

const listingBlueprints = [
  { listingType: "sale", price: 6_950_000, m2: 92, roomCount: "2+1", title: "Aydınlık Şehir Dairesi" },
  { listingType: "sale", price: 11_800_000, m2: 138, roomCount: "3+1", title: "Geniş Balkonlu Aile Dairesi" },
  { listingType: "sale", price: 18_750_000, m2: 205, roomCount: "4+1", title: "Teraslı Seçkin Dubleks" },
  { listingType: "rent", price: 38_500, m2: 78, roomCount: "1+1", title: "Merkezi Konumda Modern Daire" },
  { listingType: "rent", price: 54_000, m2: 116, roomCount: "2+1", title: "Ferah Planlı Kiralık Daire" },
  { listingType: "rent", price: 72_500, m2: 164, roomCount: "3+1", title: "Bahçeli Sakin Yaşam" },
];

const investmentYields = [4.8, 5.4, 6.1, 6.7, 7.2, 7.8];

export const buildStarterListings = (config, siteId) => {
  const districts = normalizeDistricts(config);
  const investmentFocused = config.template_id === "investment-focused";
  const urgentDeals = config.template_id === "urgent-deals";

  return listingBlueprints.map((item, index) => {
    const district = districts[index % districts.length];
    const rentalYieldPercent = investmentFocused ? investmentYields[index] : null;
    return {
      site_id: siteId,
      title: `${district} · ${item.title}`,
      description: `${district} bölgesinde, ${item.m2} m² kullanım alanına sahip ${item.roomCount} portföy. Gün ışığı alan planı, ulaşım olanaklarına yakınlığı ve bakımlı yaşam alanlarıyla öne çıkıyor.`,
      price: item.price,
      currency: "TRY",
      m2: item.m2,
      room_count: item.roomCount,
      listing_type: item.listingType,
      district,
      lat: 41.0082 + index * 0.006,
      lng: 28.9784 + index * 0.006,
      media: [],
      // Keep six useful starter rows while respecting the five-active-listing
      // free allowance. The final starter remains editable and can be activated
      // after another listing is made passive/deleted or the plan becomes Pro.
      status: index === listingBlueprints.length - 1 ? "passive" : "active",
      features: ["Merkezi konum", "Ferah plan", "Gün ışığı"],
      ...(investmentFocused ? {
        rental_yield_percent: rentalYieldPercent,
        roi_notes: `%${rentalYieldPercent} tahmini yıllık brüt kira getirisi potansiyeli.`,
      } : {}),
      ...(urgentDeals ? {
        urgent_sale: index === 0 || index === 2,
        price_reduced_from: index === 1 || index === 2 ? Math.round(item.price * (index === 2 ? 1.14 : 1.1)) : null,
      } : {}),
    };
  });
};

export const insertGeneratedSite = async (supabase, config, userId, { siteLimitExempt = false } = {}) => {
  const baseSlug = slugifyBusinessName(config.business_name);

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const { data: site, error } = await supabase
      .from("sites")
      .insert({
        user_id: userId,
        ...(siteLimitExempt ? { owner_limit_exempt: true } : {}),
        slug,
        business_name: config.business_name,
        tone: config.tone,
        primary_color: config.primary_color,
        accent_color: config.accent_color,
        headline: config.headline,
        theme_config: buildThemeConfig(config),
        status: "draft",
      })
      .select("id, slug")
      .single();

    if (!error) {
      const starterListings = buildStarterListings(config, site.id);
      let { error: listingsError } = await supabase.from("listings").insert(starterListings);
      let metricsStorage = config.template_id === "investment-focused" ? "columns" : null;

      // Keep generation operational against projects where the optional metrics
      // migration has not reached PostgREST yet. The follow-up migration below
      // backfills these normal feature values into the real nullable columns.
      if (listingsError && config.template_id === "investment-focused" && /rental_yield_percent|roi_notes/.test(listingsError.message)) {
        const compatibleListings = starterListings.map(({ rental_yield_percent, roi_notes, ...listing }) => ({
          ...listing,
          features: [
            ...listing.features,
            `Tahmini kira getirisi: %${rental_yield_percent}`,
            `Yatırım görünümü: ${roi_notes}`,
          ],
        }));
        ({ error: listingsError } = await supabase.from("listings").insert(compatibleListings));
        metricsStorage = "features-compat";
      }

      if (!listingsError) return { ...site, starterListingsCount: starterListings.length, metricsStorage };

      const { error: cleanupError } = await supabase.from("sites").delete().eq("id", site.id);
      const cleanupMessage = cleanupError ? ` Cleanup also failed: ${cleanupError.message}` : "";
      throw new Error(`Failed to save starter listings: ${listingsError.message}.${cleanupMessage}`);
    }
    if (error.code === "23505" && /sites_one_per_user_idx|user_id/.test(`${error.message} ${error.details || ""}`)) {
      throw new Error("SITE_LIMIT_REACHED");
    }
    if (error.code !== "23505") {
      throw new Error(`Failed to save generated site: ${error.message}`);
    }
  }

  throw new Error("Failed to create a unique site slug after 25 attempts.");
};
