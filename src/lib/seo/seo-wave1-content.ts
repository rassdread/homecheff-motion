import {
  buildAlternativeWave1Page,
  buildGuideWave1Page,
  buildWorkflowWave1Page,
} from "@/lib/seo/seo-content-wave1-builder";
import type { SeoContentPage } from "@/lib/seo/seo-content-types";
import { ALTERNATIVES_WAVE1_CONFIG } from "@/lib/seo/alternatives-wave1-config";
import { GUIDES_WAVE1_CONFIG } from "@/lib/seo/guides-wave1-config";
import { WORKFLOWS_WAVE1_CONFIG } from "@/lib/seo/workflows-wave1-config";

export const ALTERNATIVE_WAVE1_SLUGS = ALTERNATIVES_WAVE1_CONFIG.map((c) => c.slug);
export const GUIDE_WAVE1_SLUGS = GUIDES_WAVE1_CONFIG.map((c) => c.slug);
export const WORKFLOW_WAVE1_SLUGS = WORKFLOWS_WAVE1_CONFIG.map((c) => c.slug);

export const ALTERNATIVES_WAVE1_CONTENT: Record<string, SeoContentPage> = Object.fromEntries(
  ALTERNATIVES_WAVE1_CONFIG.map((config) => [config.slug, buildAlternativeWave1Page(config)])
);

export const GUIDES_WAVE1_CONTENT: Record<string, SeoContentPage> = Object.fromEntries(
  GUIDES_WAVE1_CONFIG.map((config) => [config.slug, buildGuideWave1Page(config)])
);

export const WORKFLOWS_WAVE1_CONTENT = Object.fromEntries(
  WORKFLOWS_WAVE1_CONFIG.map((config) => [config.slug, buildWorkflowWave1Page(config)])
);
