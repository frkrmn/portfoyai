import type { TemplateFamily } from "./types";
import {
  WarmEditorialDetail,
  WarmEditorialHome,
  WarmEditorialListings,
} from "./warm-editorial/WarmEditorialTemplate";
import { LegacyDetail, LegacyHome, LegacyListings } from "./legacy/LegacyTemplate";
import { BoldLuxuryDetail, BoldLuxuryHome, BoldLuxuryListings } from "./bold-luxury/BoldLuxuryTemplate";
import { CleanModernDetail, CleanModernHome, CleanModernListings } from "./clean-modern/CleanModernTemplate";
import { NeighborhoodFriendlyDetail, NeighborhoodFriendlyHome, NeighborhoodFriendlyListings } from "./neighborhood-friendly/NeighborhoodFriendlyTemplate";
import { InvestmentFocusedDetail, InvestmentFocusedHome, InvestmentFocusedListings } from "./investment-focused/InvestmentFocusedTemplate";
import { UrgentDealsDetail, UrgentDealsHome, UrgentDealsListings } from "./urgent-deals/UrgentDealsTemplate";
import { GuidedMatchDetail, GuidedMatchHome, GuidedMatchListings } from "./guided-match/GuidedMatchTemplate";
import { LandPlotsDetail, LandPlotsHome, LandPlotsListings, LandPlotsTeam } from "./land-plots/LandPlotsTemplate";

export const defaultTemplateId = "tm_01";

const warmEditorialFamily: TemplateFamily = {
  Home: WarmEditorialHome,
  Listings: WarmEditorialListings,
  Detail: WarmEditorialDetail,
};

const legacyFamily: TemplateFamily = {
  Home: LegacyHome,
  Listings: LegacyListings,
  Detail: LegacyDetail,
};

const boldLuxuryFamily: TemplateFamily = {
  Home: BoldLuxuryHome,
  Listings: BoldLuxuryListings,
  Detail: BoldLuxuryDetail,
};

const cleanModernFamily: TemplateFamily = {
  Home: CleanModernHome,
  Listings: CleanModernListings,
  Detail: CleanModernDetail,
};

const neighborhoodFriendlyFamily: TemplateFamily = {
  Home: NeighborhoodFriendlyHome,
  Listings: NeighborhoodFriendlyListings,
  Detail: NeighborhoodFriendlyDetail,
};

const investmentFocusedFamily: TemplateFamily = {
  Home: InvestmentFocusedHome,
  Listings: InvestmentFocusedListings,
  Detail: InvestmentFocusedDetail,
};

const urgentDealsFamily: TemplateFamily = {
  Home: UrgentDealsHome,
  Listings: UrgentDealsListings,
  Detail: UrgentDealsDetail,
};

const guidedMatchFamily: TemplateFamily = {
  Home: GuidedMatchHome,
  Listings: GuidedMatchListings,
  Detail: GuidedMatchDetail,
};

const landPlotsFamily: TemplateFamily = {
  Home: LandPlotsHome,
  Listings: LandPlotsListings,
  Detail: LandPlotsDetail,
  Team: LandPlotsTeam,
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
