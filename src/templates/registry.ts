import type { TemplateFamily } from "./types";
import {
  WarmEditorialDetail,
  WarmEditorialHome,
  WarmEditorialListings,
  contentSchema as warmEditorialContentSchema,
  imageSchema as warmEditorialImageSchema,
} from "./warm-editorial/WarmEditorialTemplate";
import { LegacyDetail, LegacyHome, LegacyListings } from "./legacy/LegacyTemplate";
import { BoldLuxuryDetail, BoldLuxuryHome, BoldLuxuryListings, contentSchema as boldLuxuryContentSchema, imageSchema as boldLuxuryImageSchema } from "./bold-luxury/BoldLuxuryTemplate";
import { CleanModernDetail, CleanModernHome, CleanModernListings, contentSchema as cleanModernContentSchema, imageSchema as cleanModernImageSchema } from "./clean-modern/CleanModernTemplate";
import { NeighborhoodFriendlyDetail, NeighborhoodFriendlyHome, NeighborhoodFriendlyListings, contentSchema as neighborhoodFriendlyContentSchema, imageSchema as neighborhoodFriendlyImageSchema } from "./neighborhood-friendly/NeighborhoodFriendlyTemplate";
import { InvestmentFocusedDetail, InvestmentFocusedHome, InvestmentFocusedListings, contentSchema as investmentFocusedContentSchema, imageSchema as investmentFocusedImageSchema } from "./investment-focused/InvestmentFocusedTemplate";
import { UrgentDealsDetail, UrgentDealsHome, UrgentDealsListings, contentSchema as urgentDealsContentSchema, imageSchema as urgentDealsImageSchema } from "./urgent-deals/UrgentDealsTemplate";
import { GuidedMatchDetail, GuidedMatchHome, GuidedMatchListings, contentSchema as guidedMatchContentSchema, imageSchema as guidedMatchImageSchema } from "./guided-match/GuidedMatchTemplate";
import { LandPlotsDetail, LandPlotsHome, LandPlotsListings, contentSchema as landPlotsContentSchema, imageSchema as landPlotsImageSchema } from "./land-plots/LandPlotsTemplate";

export const defaultTemplateId = "tm_01";

const warmEditorialFamily: TemplateFamily = {
  Home: WarmEditorialHome,
  Listings: WarmEditorialListings,
  Detail: WarmEditorialDetail,
  contentSchema: warmEditorialContentSchema,
  imageSchema: warmEditorialImageSchema,
};

const legacyFamily: TemplateFamily = {
  Home: LegacyHome,
  Listings: LegacyListings,
  Detail: LegacyDetail,
  contentSchema: warmEditorialContentSchema,
  imageSchema: warmEditorialImageSchema,
};

const boldLuxuryFamily: TemplateFamily = {
  Home: BoldLuxuryHome,
  Listings: BoldLuxuryListings,
  Detail: BoldLuxuryDetail,
  contentSchema: boldLuxuryContentSchema,
  imageSchema: boldLuxuryImageSchema,
};

const cleanModernFamily: TemplateFamily = {
  Home: CleanModernHome,
  Listings: CleanModernListings,
  Detail: CleanModernDetail,
  contentSchema: cleanModernContentSchema,
  imageSchema: cleanModernImageSchema,
};

const neighborhoodFriendlyFamily: TemplateFamily = {
  Home: NeighborhoodFriendlyHome,
  Listings: NeighborhoodFriendlyListings,
  Detail: NeighborhoodFriendlyDetail,
  contentSchema: neighborhoodFriendlyContentSchema,
  imageSchema: neighborhoodFriendlyImageSchema,
};

const investmentFocusedFamily: TemplateFamily = {
  Home: InvestmentFocusedHome,
  Listings: InvestmentFocusedListings,
  Detail: InvestmentFocusedDetail,
  contentSchema: investmentFocusedContentSchema,
  imageSchema: investmentFocusedImageSchema,
};

const urgentDealsFamily: TemplateFamily = {
  Home: UrgentDealsHome,
  Listings: UrgentDealsListings,
  Detail: UrgentDealsDetail,
  contentSchema: urgentDealsContentSchema,
  imageSchema: urgentDealsImageSchema,
};

const guidedMatchFamily: TemplateFamily = {
  Home: GuidedMatchHome,
  Listings: GuidedMatchListings,
  Detail: GuidedMatchDetail,
  contentSchema: guidedMatchContentSchema,
  imageSchema: guidedMatchImageSchema,
};

const landPlotsFamily: TemplateFamily = {
  Home: LandPlotsHome,
  Listings: LandPlotsListings,
  Detail: LandPlotsDetail,
  contentSchema: landPlotsContentSchema,
  imageSchema: landPlotsImageSchema,
};

export const templates: Record<string, TemplateFamily> = {
  "warm-editorial": warmEditorialFamily,
  "bold-luxury": boldLuxuryFamily,
  "clean-modern": cleanModernFamily,
  "neighborhood-friendly": neighborhoodFriendlyFamily,
  "investment-focused": investmentFocusedFamily,
  "urgent-deals": urgentDealsFamily,
  "guided-match": guidedMatchFamily,
  "land-plots": landPlotsFamily,
  tm_01: legacyFamily,
  tm_02: legacyFamily,
  tm_03: legacyFamily,
  tm_04: legacyFamily,
};

export function getTemplateFamily(templateId?: string): TemplateFamily {
  return templateId && templates[templateId] ? templates[templateId] : templates[defaultTemplateId];
}
