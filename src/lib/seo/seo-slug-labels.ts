/** Lightweight slug → display label maps for internal linking (no page builders). */
import { ALTERNATIVES_WAVE1_CONFIG } from "@/lib/seo/alternatives-wave1-config";
import { ALTERNATIVES_WAVE2_CONFIG } from "@/lib/seo/alternatives-wave2-config";
import { GUIDES_WAVE1_CONFIG } from "@/lib/seo/guides-wave1-config";
import { GUIDES_WAVE2_CONFIG } from "@/lib/seo/guides-wave2-config";
import { INDUSTRIES_WAVE3_CONFIG } from "@/lib/seo/industries-wave3-config";
import { LOCATIONS_WAVE3_CONFIG } from "@/lib/seo/locations-wave3-config";
import { LONGTAIL_GUIDES_WAVE3_CONFIG } from "@/lib/seo/longtail-guides-wave3-config";
import { USE_CASES_WAVE3_CONFIG } from "@/lib/seo/use-cases-wave3-config";
import { WORKFLOWS_WAVE1_CONFIG } from "@/lib/seo/workflows-wave1-config";
import { WORKFLOWS_WAVE2_CONFIG } from "@/lib/seo/workflows-wave2-config";

function titleCaseFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const SEO_PATH_LABELS: Record<string, string> = {
  "/": "Home",
  "/studio": "AI Storyboard Studio",
  "/editor": "AI Image Editor",
  "/animate/instant": "Image to Video",
  "/pricing": "Pricing & Credits",
  "/signup": "Create Free Account",
  "/guides": "Guides",
  "/alternatives": "Alternatives",
  "/workflows": "Workflows",
  "/locations": "Locations",
  "/use-cases": "Use Cases",
  "/industries": "Industries",
};

for (const c of ALTERNATIVES_WAVE1_CONFIG) {
  SEO_PATH_LABELS[`/alternatives/${c.slug}`] = `${c.competitor} alternative`;
}
for (const c of ALTERNATIVES_WAVE2_CONFIG) {
  SEO_PATH_LABELS[`/alternatives/${c.slug}`] = `${c.competitor} alternative`;
}
for (const c of GUIDES_WAVE1_CONFIG) {
  SEO_PATH_LABELS[`/guides/${c.slug}`] = c.h1;
}
for (const c of GUIDES_WAVE2_CONFIG) {
  SEO_PATH_LABELS[`/guides/${c.slug}`] = c.h1;
}
for (const c of LONGTAIL_GUIDES_WAVE3_CONFIG) {
  SEO_PATH_LABELS[`/guides/${c.slug}`] = c.h1;
}
for (const c of WORKFLOWS_WAVE1_CONFIG) {
  SEO_PATH_LABELS[`/workflows/${c.slug}`] = c.h1;
}
for (const c of WORKFLOWS_WAVE2_CONFIG) {
  SEO_PATH_LABELS[`/workflows/${c.slug}`] = c.h1;
}
for (const c of LOCATIONS_WAVE3_CONFIG) {
  SEO_PATH_LABELS[`/locations/${c.slug}`] = `AI video in ${c.city}`;
}
for (const c of USE_CASES_WAVE3_CONFIG) {
  SEO_PATH_LABELS[`/use-cases/${c.slug}`] = `AI video for ${c.name}`;
}
for (const c of INDUSTRIES_WAVE3_CONFIG) {
  SEO_PATH_LABELS[`/industries/${c.slug}`] = `${c.industry} video`;
}

export function seoLink(href: string, label?: string): { href: string; label: string } {
  return { href, label: label ?? SEO_PATH_LABELS[href] ?? titleCaseFromSlug(href.split("/").pop() ?? href) };
}

export const ALL_GUIDE_SLUGS = [
  ...GUIDES_WAVE1_CONFIG.map((c) => c.slug),
  ...GUIDES_WAVE2_CONFIG.map((c) => c.slug),
  ...LONGTAIL_GUIDES_WAVE3_CONFIG.map((c) => c.slug),
];

export const ALL_ALTERNATIVE_SLUGS = [
  ...ALTERNATIVES_WAVE1_CONFIG.map((c) => c.slug),
  ...ALTERNATIVES_WAVE2_CONFIG.map((c) => c.slug),
];

export const ALL_WORKFLOW_SLUGS = [
  ...WORKFLOWS_WAVE1_CONFIG.map((c) => c.slug),
  ...WORKFLOWS_WAVE2_CONFIG.map((c) => c.slug),
];

export const ALL_LOCATION_SLUGS = LOCATIONS_WAVE3_CONFIG.map((c) => c.slug);
export const ALL_USE_CASE_SLUGS = USE_CASES_WAVE3_CONFIG.map((c) => c.slug);
export const ALL_INDUSTRY_SLUGS = INDUSTRIES_WAVE3_CONFIG.map((c) => c.slug);
