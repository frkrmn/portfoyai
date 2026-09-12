import { overviewSection } from "./overview";
import { listingsSection } from "./listings";
import { contentSection } from "./content";
import { mediaSection } from "./media";
import { leadsSection } from "./leads";
import { settingsSection } from "./settings";

export const dashboardSections = [overviewSection, listingsSection, contentSection, mediaSection, leadsSection, settingsSection] as const;
export type DashboardSectionId = (typeof dashboardSections)[number]["id"];
