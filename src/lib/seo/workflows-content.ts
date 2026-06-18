import type { SeoContentLink } from "@/lib/seo/seo-content-types";
import { enrichSeoContentPage } from "@/lib/seo/seo-internal-link-enricher";
import { WORKFLOW_WAVE1_SLUGS, WORKFLOWS_WAVE1_CONTENT } from "@/lib/seo/seo-wave1-content";
import { WORKFLOW_WAVE2_SLUGS, WORKFLOWS_WAVE2_CONTENT } from "@/lib/seo/seo-wave2-content";

export type WorkflowHub = (typeof WORKFLOWS_WAVE1_CONTENT)[string] & {
  linkedGuides: SeoContentLink[];
  linkedAlternatives: SeoContentLink[];
  productLinks: SeoContentLink[];
};

export const WORKFLOW_SLUGS = [...WORKFLOW_WAVE1_SLUGS, ...WORKFLOW_WAVE2_SLUGS] as const;

export type WorkflowSlug = (typeof WORKFLOW_SLUGS)[number];

const RAW_WORKFLOWS: Record<WorkflowSlug, WorkflowHub> = {
  ...(WORKFLOWS_WAVE1_CONTENT as Record<WorkflowSlug, WorkflowHub>),
  ...(WORKFLOWS_WAVE2_CONTENT as Record<WorkflowSlug, WorkflowHub>),
};

export const WORKFLOWS_CONTENT: Record<WorkflowSlug, WorkflowHub> = Object.fromEntries(
  Object.entries(RAW_WORKFLOWS).map(([slug, page]) => [
    slug,
    enrichSeoContentPage(page, "workflow") as WorkflowHub,
  ])
) as Record<WorkflowSlug, WorkflowHub>;

export function getWorkflow(slug: string): WorkflowHub | null {
  if (!(slug in WORKFLOWS_CONTENT)) return null;
  return WORKFLOWS_CONTENT[slug as WorkflowSlug];
}

export const WORKFLOW_PATHS = WORKFLOW_SLUGS.map((s) => `/workflows/${s}` as const);
