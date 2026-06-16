/**
 * Future-ready featured experience shape for the Space Showcase Carousel.
 * Current source: {@link HOMECHEFF_EXAMPLES} in homecheff-examples.ts
 */

export type FeaturedExperienceService =
  | "motion"
  | "studio"
  | "publish"
  | "editor"
  | "home";

export type FeaturedExperience = {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  video?: string;
  assistantPrompt?: string;
  service: FeaturedExperienceService;
  sortOrder: number;
  active: boolean;
};
