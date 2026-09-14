export type ThemeVariant =
  | "Modern Minimal"
  | "Warm Classic"
  | "Bold Luxury"
  | "Clean Corporate";

export type FontPairing = {
  heading: string;
  body: string;
};

export type LayoutFineTune = {
  buttonStyle?: "solid" | "outline" | "pill" | "sharp";
  navAlignment?: "left" | "center" | "split";
  spacingDensity?: "compact" | "comfortable" | "spacious";
  cardStyle?: "flat" | "shadow" | "bordered";
  headingScale?: "modest" | "bold";
};

export type LocalizedText = { tr: string; en?: string };

export type ThemeConfig = {
  variant: ThemeVariant;
  primary: string;
  accent: string;
  fontPairing: FontPairing;
  layoutVariant: "editorial" | "gallery" | "heroSplit" | "corporate";
  layout_fine_tune?: LayoutFineTune;
  colors?: {
    background?: string;
    primary?: string;
    accent?: string;
    text?: string;
    buttonColorSource?: "accent" | "primary" | "custom";
    buttonColorCustom?: string;
  };
  fonts?: {
    heading?: string;
    body?: string;
    headingWeight?: number;
    headingItalic?: boolean;
    bodyWeight?: number;
    bodyItalic?: boolean;
  };
};

export type GeneratedSiteConfig = {
  /** Opaque internal choice returned by generation; never render this in product UI. */
  template_id?:
    | "tm_01"
    | "tm_02"
    | "tm_03"
    | "tm_04"
    | "warm-editorial"
    | "bold-luxury"
    | "clean-modern"
    | "neighborhood-friendly"
    | "investment-focused"
    | "urgent-deals"
    | "guided-match"
    | "land-plots";
  content?: {
    neighborhoods?: Array<{ name: string; description: LocalizedText; transit?: LocalizedText; schools?: LocalizedText; greenSpace?: LocalizedText; priceRange?: LocalizedText; lifestyle?: LocalizedText; source?: LocalizedText; asOf?: string }>;
    feelings?: LocalizedText[];
    timings?: LocalizedText[];
    teamMembers?: Array<{
      name: string;
      role: LocalizedText;
      bio: LocalizedText;
      photo_url: string;
    }>;
    processSteps?: Array<{ title: LocalizedText; description: LocalizedText }>;
    services?: Array<{ title: LocalizedText; description: LocalizedText }>;
  };
  business_name: string;
  tone: LocalizedText;
  primary_color: string;
  accent_color: string;
  headline: LocalizedText;
  region_focus?: string;
  layout_fine_tune?: LayoutFineTune;
  selection_context?: {
    template_id: string;
    audience: string;
    region: string;
    reason: LocalizedText;
  };
};

export type Agent = {
  id: string;
  name: string;
  email: string;
  phone: string;
  region: string;
  plan: "free" | "pro";
  created_at: string;
  businessName: string;
  tone: string;
  colorDirection: string;
  bio: string;
};

export type TeamMember = {
  id: string;
  site_id: string;
  name: string;
  role: string;
  bio: string;
  photo_url: string;
  sort_order: number;
  created_at: string;
};

export type Site = {
  id: string;
  agent_id: string;
  subdomain: string;
  custom_domain: string | null;
  theme_config: ThemeConfig;
  status: "draft" | "published";
  created_at: string;
  heroTitle: string;
  heroSubtitle: string;
};

export type MediaItem = {
  id: string;
  url: string;
  thumbUrl: string;
  alt: string;
  size?: number;
  order?: number;
};

export type SeoConfig = {
  title?: { tr?: string; en?: string };
  description?: { tr?: string; en?: string };
  og_image?: string;
  favicon?: string;
  canonical_url?: string;
  robots_index?: boolean;
};

export type Listing = {
  id: string;
  site_id: string;
  title: string;
  description: string;
  price: number;
  currency: "TRY" | "USD" | "GBP" | "EUR";
  m2: number;
  room_count: string;
  listing_type: "sale" | "rent";
  property_category: "konut" | "arsa" | "isyeri";
  property_subtype:
    | "daire"
    | "mustakil_ev"
    | "villa"
    | "rezidans"
    | "konut_imarli"
    | "ticari_imarli"
    | "tarla_tarimsal"
    | "villa_imarli"
    | "kentsel_donusum"
    | null;
  district: string;
  country_id?: string | null;
  province_id?: string | null;
  district_id?: string | null;
  neighborhood_id?: string | null;
  country_name?: string | null;
  province_name?: string | null;
  district_name?: string | null;
  neighborhood_name?: string | null;
  lat: number;
  lng: number;
  media: MediaItem[];
  status: "active" | "passive" | "sold";
  listing_status: "active" | "sold" | "rented";
  seo?: SeoConfig;
  created_at: string;
  features: string[];
  address?: string | null;
  category?: "apartment" | "house" | "duplex" | null;
  bedroom_count?: number | null;
  bathroom_count?: number | null;
  rental_yield_percent?: number | null;
  roi_notes?: string | null;
  investment_metrics?: Partial<
    Record<
      "rental_yield" | "price_per_m2",
      {
        source: string;
        as_of: string;
        status: "actual" | "estimate";
        hidden: boolean;
      }
    >
  >;
  price_reduced_from?: number | null;
  urgent_sale?: boolean | null;
  urgent_verified_at?: string | null;
  urgent_expires_at?: string | null;
  price_history?: Array<{ old_price: number; new_price: number; currency: "TRY" | "USD" | "GBP" | "EUR"; changed_at: string }>;
  land_details?: LandDetails;
};

export type LandDocument = {
  id: string;
  name: string;
  path: string;
  kind: "deed" | "zoning" | "survey" | "other";
  mime_type: string;
  size: number | null;
  uploaded_at: string | null;
};

export type LandDetails = {
  block?: string | null;
  parcel?: string | null;
  zoning_status?: string | null;
  deed_type?: "independent" | "shared" | "allocation" | "unknown";
  frontage_m?: number | null;
  infrastructure?: Array<"road" | "electricity" | "water" | "sewer" | "natural_gas" | "internet">;
  slope_percent?: number | null;
  intended_use?: string | null;
  coordinates?: { lat: number; lng: number } | null;
  verification_status?: "unverified" | "owner_declared" | "document_checked" | "official_source";
  verified_at?: string | null;
  source?: { label: string | null; url: string | null; checked_at: string | null };
  documents?: LandDocument[];
};

export type Lead = {
  id: string;
  site_id: string;
  listing_id: string | null;
  name: string;
  phone: string;
  message: string;
  source: string;
  created_at: string;
};

export type PromptProfile = {
  business_name: string;
  region_focus: string;
  tone: string;
  color_direction: string;
  listing_types: Array<"sale" | "rent">;
};

export type AppState = {
  agents: Agent[];
  sites: Site[];
  listings: Listing[];
  leads: Lead[];
  currentAgentId: string;
  onboardingPrompt: string;
};

export type ListingDraft = Omit<Listing, "id" | "created_at">;
