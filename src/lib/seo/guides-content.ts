import type { SeoContentPage } from "@/lib/seo/seo-content-types";
import { enrichSeoContentPage } from "@/lib/seo/seo-internal-link-enricher";
import { GUIDE_WAVE1_SLUGS, GUIDES_WAVE1_CONTENT } from "@/lib/seo/seo-wave1-content";
import { GUIDE_WAVE2_SLUGS, GUIDES_WAVE2_CONTENT } from "@/lib/seo/seo-wave2-content";
import {
  LONGTAIL_GUIDE_WAVE3_SLUGS,
  LONGTAIL_GUIDES_WAVE3_CONTENT,
} from "@/lib/seo/seo-wave3-content";

export const GUIDE_SLUGS = [
  ...GUIDE_WAVE1_SLUGS,
  ...GUIDE_WAVE2_SLUGS,
  ...LONGTAIL_GUIDE_WAVE3_SLUGS,
] as const;

export type GuideSlug = (typeof GUIDE_SLUGS)[number];

const RAW_GUIDES: Record<GuideSlug, SeoContentPage> = {
  ...(GUIDES_WAVE1_CONTENT as Record<GuideSlug, SeoContentPage>),
  ...(GUIDES_WAVE2_CONTENT as Record<GuideSlug, SeoContentPage>),
  ...(LONGTAIL_GUIDES_WAVE3_CONTENT as Record<GuideSlug, SeoContentPage>),
};

export const GUIDES_CONTENT: Record<GuideSlug, SeoContentPage> = Object.fromEntries(
  Object.entries(RAW_GUIDES).map(([slug, page]) => [slug, enrichSeoContentPage(page, "guide")])
) as Record<GuideSlug, SeoContentPage>;

export function getGuide(slug: string): SeoContentPage | null {
  if (!(slug in GUIDES_CONTENT)) return null;
  return GUIDES_CONTENT[slug as GuideSlug];
}

export const GUIDE_PATHS = GUIDE_SLUGS.map((s) => `/guides/${s}` as const);
