import type { SeoContentPage } from "@/lib/seo/seo-content-types";
import { enrichSeoContentPage } from "@/lib/seo/seo-internal-link-enricher";
import {
  LOCATION_WAVE3_SLUGS,
  LOCATIONS_WAVE3_CONTENT,
} from "@/lib/seo/seo-wave3-content";

export const LOCATION_SLUGS = [...LOCATION_WAVE3_SLUGS] as const;

export type LocationSlug = (typeof LOCATION_SLUGS)[number];

export const LOCATIONS_CONTENT: Record<LocationSlug, SeoContentPage> = Object.fromEntries(
  Object.entries(LOCATIONS_WAVE3_CONTENT).map(([slug, page]) => [
    slug,
    enrichSeoContentPage(page, "location"),
  ])
) as Record<LocationSlug, SeoContentPage>;

export function getLocation(slug: string): SeoContentPage | null {
  if (!(slug in LOCATIONS_CONTENT)) return null;
  return LOCATIONS_CONTENT[slug as LocationSlug];
}

export const LOCATION_PATHS = LOCATION_SLUGS.map((s) => `/locations/${s}` as const);
