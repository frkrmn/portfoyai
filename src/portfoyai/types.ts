export type ThemeVariant = "Modern Minimal" | "Warm Classic" | "Bold Luxury" | "Clean Corporate";

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

export type ThemeConfig = {
  variant: ThemeVariant;
  primary: string;
  accent: string;
  fontPairing: FontPairing;
  layoutVariant: "editorial" | "gallery" | "heroSplit" | "corporate";
  layout_fine_tune?: LayoutFineTune;
};

export type GeneratedSiteConfig = {
  /** Opaque internal choice returned by generation; never render this in product UI. */
  template_id?: "tm_01" | "tm_02" | "tm_03" | "tm_04" | "warm-editorial" | "bold-luxury" | "clean-modern" | "neighborhood-friendly" | "investment-focused" | "urgent-deals" | "guided-match";
  content?: {
    neighborhoods?: Array<{ name: string; description: string }>;
    feelings?: string[];
    timings?: string[];
  };
  business_name: string;
  tone: string;
  primary_color: string;
  accent_color: string;
  headline: string;
  region_focus?: string;
  layout_fine_tune?: LayoutFineTune;
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
};

export type Listing = {
  id: string;
  site_id: string;
  title: string;
  description: string;
  price: number;
  currency: "TRY" | "USD" | "EUR";
  m2: number;
  room_count: string;
  listing_type: "sale" | "rent";
  district: string;
  lat: number;
  lng: number;
  media: MediaItem[];
  status: "active" | "passive" | "sold";
  created_at: string;
  features: string[];
  address?: string | null;
  category?: "apartment" | "house" | "duplex" | null;
  bedroom_count?: number | null;
  bathroom_count?: number | null;
  rental_yield_percent?: number | null;
  roi_notes?: string | null;
  price_reduced_from?: number | null;
  urgent_sale?: boolean | null;
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
