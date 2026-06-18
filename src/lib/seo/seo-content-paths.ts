import { ALTERNATIVE_PATHS } from "@/lib/seo/alternatives-content";
import { GUIDE_PATHS } from "@/lib/seo/guides-content";
import { INDUSTRY_PATHS } from "@/lib/seo/industries-content";
import { LOCATION_PATHS } from "@/lib/seo/locations-content";
import { USE_CASE_PATHS } from "@/lib/seo/use-cases-content";
import { WORKFLOW_PATHS } from "@/lib/seo/workflows-content";

export const SEO_CONTENT_HUB_PATHS = [
  "/alternatives",
  "/guides",
  "/workflows",
  "/locations",
  "/use-cases",
  "/industries",
] as const;

export const SEO_CONTENT_PATHS = [
  ...SEO_CONTENT_HUB_PATHS,
  ...ALTERNATIVE_PATHS,
  ...GUIDE_PATHS,
  ...WORKFLOW_PATHS,
  ...LOCATION_PATHS,
  ...USE_CASE_PATHS,
  ...INDUSTRY_PATHS,
] as const;

export type SeoContentPath = (typeof SEO_CONTENT_PATHS)[number];
