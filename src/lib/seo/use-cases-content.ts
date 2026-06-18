import type { SeoContentPage } from "@/lib/seo/seo-content-types";
import { enrichSeoContentPage } from "@/lib/seo/seo-internal-link-enricher";
import {
  USE_CASE_WAVE3_SLUGS,
  USE_CASES_WAVE3_CONTENT,
} from "@/lib/seo/seo-wave3-content";

export const USE_CASE_SLUGS = [...USE_CASE_WAVE3_SLUGS] as const;

export type UseCaseSlug = (typeof USE_CASE_SLUGS)[number];

export const USE_CASES_CONTENT: Record<UseCaseSlug, SeoContentPage> = Object.fromEntries(
  Object.entries(USE_CASES_WAVE3_CONTENT).map(([slug, page]) => [
    slug,
    enrichSeoContentPage(page, "use-case"),
  ])
) as Record<UseCaseSlug, SeoContentPage>;

export function getUseCase(slug: string): SeoContentPage | null {
  if (!(slug in USE_CASES_CONTENT)) return null;
  return USE_CASES_CONTENT[slug as UseCaseSlug];
}

export const USE_CASE_PATHS = USE_CASE_SLUGS.map((s) => `/use-cases/${s}` as const);
