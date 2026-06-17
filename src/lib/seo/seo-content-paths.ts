import { ALTERNATIVE_PATHS } from "@/lib/seo/alternatives-content";
import { GUIDE_PATHS } from "@/lib/seo/guides-content";
import { WORKFLOW_PATHS } from "@/lib/seo/workflows-content";

export const SEO_CONTENT_HUB_PATHS = ["/alternatives", "/guides", "/workflows"] as const;

export const SEO_CONTENT_PATHS = [
  ...SEO_CONTENT_HUB_PATHS,
  ...ALTERNATIVE_PATHS,
  ...GUIDE_PATHS,
  ...WORKFLOW_PATHS,
] as const;

export type SeoContentPath = (typeof SEO_CONTENT_PATHS)[number];
