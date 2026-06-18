import type { SeoContentPage } from "@/lib/seo/seo-content-types";
import { ALTERNATIVES_WAVE1_CONTENT, ALTERNATIVE_WAVE1_SLUGS } from "@/lib/seo/seo-wave1-content";
import {
  ALTERNATIVE_WAVE2_SLUGS,
  ALTERNATIVES_WAVE2_CONTENT,
} from "@/lib/seo/seo-wave2-content";

export const ALTERNATIVE_SLUGS = [...ALTERNATIVE_WAVE1_SLUGS, ...ALTERNATIVE_WAVE2_SLUGS] as const;

export type AlternativeSlug = (typeof ALTERNATIVE_SLUGS)[number];

export const ALTERNATIVES_CONTENT: Record<AlternativeSlug, SeoContentPage> = {
  ...(ALTERNATIVES_WAVE1_CONTENT as Record<AlternativeSlug, SeoContentPage>),
  ...(ALTERNATIVES_WAVE2_CONTENT as Record<AlternativeSlug, SeoContentPage>),
};

export function getAlternative(slug: string): SeoContentPage | null {
  if (!(slug in ALTERNATIVES_CONTENT)) return null;
  return ALTERNATIVES_CONTENT[slug as AlternativeSlug];
}

export const ALTERNATIVE_PATHS = ALTERNATIVE_SLUGS.map((s) => `/alternatives/${s}` as const);
