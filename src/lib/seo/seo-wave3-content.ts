import {
  buildIndustryWave3Page,
  buildLocationWave3Page,
  buildLongtailGuideWave3Page,
  buildUseCaseWave3Page,
} from "@/lib/seo/seo-content-wave3-builder";
import type { SeoContentPage } from "@/lib/seo/seo-content-types";
import { INDUSTRIES_WAVE3_CONFIG } from "@/lib/seo/industries-wave3-config";
import { LOCATIONS_WAVE3_CONFIG } from "@/lib/seo/locations-wave3-config";
import { LONGTAIL_GUIDES_WAVE3_CONFIG } from "@/lib/seo/longtail-guides-wave3-config";
import { USE_CASES_WAVE3_CONFIG } from "@/lib/seo/use-cases-wave3-config";

export const LOCATION_WAVE3_SLUGS = LOCATIONS_WAVE3_CONFIG.map((c) => c.slug);
export const USE_CASE_WAVE3_SLUGS = USE_CASES_WAVE3_CONFIG.map((c) => c.slug);
export const INDUSTRY_WAVE3_SLUGS = INDUSTRIES_WAVE3_CONFIG.map((c) => c.slug);
export const LONGTAIL_GUIDE_WAVE3_SLUGS = LONGTAIL_GUIDES_WAVE3_CONFIG.map((c) => c.slug);

export const LOCATIONS_WAVE3_CONTENT: Record<string, SeoContentPage> = Object.fromEntries(
  LOCATIONS_WAVE3_CONFIG.map((config) => [config.slug, buildLocationWave3Page(config)])
);

export const USE_CASES_WAVE3_CONTENT: Record<string, SeoContentPage> = Object.fromEntries(
  USE_CASES_WAVE3_CONFIG.map((config) => [config.slug, buildUseCaseWave3Page(config)])
);

export const INDUSTRIES_WAVE3_CONTENT: Record<string, SeoContentPage> = Object.fromEntries(
  INDUSTRIES_WAVE3_CONFIG.map((config) => [config.slug, buildIndustryWave3Page(config)])
);

export const LONGTAIL_GUIDES_WAVE3_CONTENT: Record<string, SeoContentPage> = Object.fromEntries(
  LONGTAIL_GUIDES_WAVE3_CONFIG.map((config) => [config.slug, buildLongtailGuideWave3Page(config)])
);

export const WAVE3_PAGE_COUNT =
  LOCATION_WAVE3_SLUGS.length +
  USE_CASE_WAVE3_SLUGS.length +
  INDUSTRY_WAVE3_SLUGS.length +
  LONGTAIL_GUIDE_WAVE3_SLUGS.length;
