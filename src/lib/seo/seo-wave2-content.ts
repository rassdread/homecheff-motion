import {
  buildAlternativeWave2Page,
  buildGuideWave2Page,
  buildWorkflowWave2Page,
  type WorkflowWave2Page,
} from "@/lib/seo/seo-content-wave2-builder";
import type { SeoContentPage } from "@/lib/seo/seo-content-types";
import { ALTERNATIVES_WAVE2_CONFIG } from "@/lib/seo/alternatives-wave2-config";
import { GUIDES_WAVE2_CONFIG } from "@/lib/seo/guides-wave2-config";
import { WORKFLOWS_WAVE2_CONFIG } from "@/lib/seo/workflows-wave2-config";

export const ALTERNATIVE_WAVE2_SLUGS = ALTERNATIVES_WAVE2_CONFIG.map((c) => c.slug);

export const ALTERNATIVES_WAVE2_CONTENT: Record<string, SeoContentPage> = Object.fromEntries(
  ALTERNATIVES_WAVE2_CONFIG.map((config) => [config.slug, buildAlternativeWave2Page(config)])
);

export const GUIDE_WAVE2_SLUGS = GUIDES_WAVE2_CONFIG.map((c) => c.slug);

export const GUIDES_WAVE2_CONTENT: Record<string, SeoContentPage> = Object.fromEntries(
  GUIDES_WAVE2_CONFIG.map((config) => [config.slug, buildGuideWave2Page(config)])
);

export const WORKFLOW_WAVE2_SLUGS = WORKFLOWS_WAVE2_CONFIG.map((c) => c.slug);

export const WORKFLOWS_WAVE2_CONTENT: Record<string, WorkflowWave2Page> = Object.fromEntries(
  WORKFLOWS_WAVE2_CONFIG.map((config) => [config.slug, buildWorkflowWave2Page(config)])
);
