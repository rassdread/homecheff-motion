import type { SeoContentPage } from "@/lib/seo/seo-content-types";
import {
  INDUSTRIES_WAVE3_CONTENT,
  INDUSTRY_WAVE3_SLUGS,
} from "@/lib/seo/seo-wave3-content";

export const INDUSTRY_SLUGS = [...INDUSTRY_WAVE3_SLUGS] as const;

export type IndustrySlug = (typeof INDUSTRY_SLUGS)[number];

export const INDUSTRIES_CONTENT: Record<IndustrySlug, SeoContentPage> =
  INDUSTRIES_WAVE3_CONTENT as Record<IndustrySlug, SeoContentPage>;

export function getIndustry(slug: string): SeoContentPage | null {
  if (!(slug in INDUSTRIES_CONTENT)) return null;
  return INDUSTRIES_CONTENT[slug as IndustrySlug];
}

export const INDUSTRY_PATHS = INDUSTRY_SLUGS.map((s) => `/industries/${s}` as const);
