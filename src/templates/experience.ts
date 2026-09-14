export const templateExperienceIds = ["warm-editorial", "bold-luxury", "clean-modern", "neighborhood-friendly", "investment-focused", "urgent-deals", "guided-match", "land-plots"] as const;
export type TemplateExperienceId = (typeof templateExperienceIds)[number];

export type TemplateExperience = {
  composition: "editorial-flow" | "cinematic-stage" | "catalog-grid" | "local-guide" | "data-terminal" | "deal-feed" | "guided-journey" | "land-survey";
  interaction: "browse-story" | "immersive-inquiry" | "filter-first" | "explore-neighborhood" | "compare-assets" | "scan-urgency" | "answer-and-match" | "inspect-parcel";
  density: "airy" | "focused" | "dense";
  geometry: "soft" | "square" | "mixed";
  media: "editorial" | "cinematic" | "catalog" | "human" | "analytical" | "urgent" | "guided" | "topographic";
};

export const templateExperiences: Record<TemplateExperienceId, TemplateExperience> = {
  "warm-editorial": { composition: "editorial-flow", interaction: "browse-story", density: "airy", geometry: "mixed", media: "editorial" },
  "bold-luxury": { composition: "cinematic-stage", interaction: "immersive-inquiry", density: "focused", geometry: "square", media: "cinematic" },
  "clean-modern": { composition: "catalog-grid", interaction: "filter-first", density: "dense", geometry: "square", media: "catalog" },
  "neighborhood-friendly": { composition: "local-guide", interaction: "explore-neighborhood", density: "airy", geometry: "soft", media: "human" },
  "investment-focused": { composition: "data-terminal", interaction: "compare-assets", density: "dense", geometry: "square", media: "analytical" },
  "urgent-deals": { composition: "deal-feed", interaction: "scan-urgency", density: "dense", geometry: "mixed", media: "urgent" },
  "guided-match": { composition: "guided-journey", interaction: "answer-and-match", density: "focused", geometry: "soft", media: "guided" },
  "land-plots": { composition: "land-survey", interaction: "inspect-parcel", density: "focused", geometry: "square", media: "topographic" },
};

export function resolveTemplateExperience(templateId: string) {
  return templateExperiences[templateId as TemplateExperienceId] || templateExperiences["warm-editorial"];
}
