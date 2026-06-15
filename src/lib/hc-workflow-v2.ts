import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";
import type { PublishChangePlan } from "@/lib/publish-change-plan";
import type { StudioGeneratedStoryline } from "@/lib/studio-story-generator";

export type HcWorkflowV2Phase =
  | "collect"
  | "inventory"
  | "analyze"
  | "plan"
  | "approve"
  | "generate";

export type HcStudioWorkflowV2State = {
  phase: HcWorkflowV2Phase;
  idea?: string;
  goal?: string;
  style?: string;
  targetAudience?: string;
  characterStrategy?: "existing" | "manual" | "ai";
  animationStyle?: string;
  productionRoute?: import("@/types/studio-production-brief-v3").StudioProductionRoute;
  briefSelections?: import("@/types/studio-production-brief-v3").StudioProductionBriefSelections;
  storyPlan?: import("@/types/studio-production-brief-v3").StudioStoryPlan;
  inventorySummary?: {
    available: string[];
    missing: string[];
    optional: string[];
  };
  briefAssetRequirements?: import("@/lib/studio-brief-asset-wizards").BriefAssetRequirement[];
  v10StoryPlanning?: import("@/types/studio-v10-story-planning").StudioV10StoryPlanningState;
  v11DirectorWizard?: import("@/types/studio-v11-director-wizard").StudioV11DirectorWizardState;
  storyline?: StudioGeneratedStoryline;
  approvedAt?: string;
};

export type HcPublishWorkflowV2State = {
  phase: HcWorkflowV2Phase;
  intent?: string;
  analysisComplete?: boolean;
  changePlanId?: string;
};

export type HcAiEverythingState = {
  analysis?: Record<string, unknown>;
  assetRequirements?: unknown[];
  storyRequirements?: string[];
  productionRequirements?: Record<string, unknown>;
  voiceRequirements?: unknown[];
  musicRequirements?: Record<string, unknown>;
  estimatedCredits?: number;
  completedAt?: string | null;
};

export type HcWorkflowV2Root = {
  studio?: HcStudioWorkflowV2State;
  publish?: HcPublishWorkflowV2State;
  aiEverything?: HcAiEverythingState;
  changePlans?: Record<string, PublishChangePlan>;
  assetConcepts?: Record<string, unknown>;
  generatedBriefAssets?: Record<string, import("@/lib/studio-brief-asset-generation").GeneratedBriefAsset>;
};

const WORKFLOW_KEY = "aiWorkflowV2";

export function readHcWorkflowV2(project: HomeCheffProjectPackage): HcWorkflowV2Root {
  const raw = project.workflowState[WORKFLOW_KEY];
  if (!raw || typeof raw !== "object") return {};
  return raw as HcWorkflowV2Root;
}

export function writeHcWorkflowV2(
  project: HomeCheffProjectPackage,
  patch: Partial<HcWorkflowV2Root>
): HomeCheffProjectPackage {
  const current = readHcWorkflowV2(project);
  return {
    ...project,
    workflowState: {
      ...project.workflowState,
      [WORKFLOW_KEY]: { ...current, ...patch },
    },
    updatedAt: new Date().toISOString(),
  };
}

export function storePublishChangePlanInHc(
  project: HomeCheffProjectPackage,
  plan: PublishChangePlan
): HomeCheffProjectPackage {
  const root = readHcWorkflowV2(project);
  return writeHcWorkflowV2(project, {
    changePlans: { ...root.changePlans, [plan.projectId]: plan },
    publish: {
      ...root.publish,
      phase: "approve",
      changePlanId: plan.projectId,
    },
  });
}

export function loadPublishChangePlanFromHc(
  project: HomeCheffProjectPackage,
  publishProjectId: string
): PublishChangePlan | null {
  const root = readHcWorkflowV2(project);
  return root.changePlans?.[publishProjectId] ?? null;
}

export function storeStudioWorkflowInHc(
  project: HomeCheffProjectPackage,
  studio: Partial<HcStudioWorkflowV2State>
): HomeCheffProjectPackage {
  const root = readHcWorkflowV2(project);
  return writeHcWorkflowV2(project, {
    studio: { ...root.studio, phase: root.studio?.phase ?? "collect", ...studio },
  });
}

export function storeProductionRouteInHc(
  project: HomeCheffProjectPackage,
  route: import("@/types/studio-production-brief-v3").StudioProductionRoute
): HomeCheffProjectPackage {
  const root = readHcWorkflowV2(project);
  return writeHcWorkflowV2(project, {
    studio: { ...root.studio, phase: "approve", productionRoute: route },
  });
}

export function collectBriefFromHcProject(project: HomeCheffProjectPackage): Record<string, unknown> {
  const wf = readHcWorkflowV2(project);
  return {
    title: project.title,
    description: project.description,
    prompts: project.prompts,
    metadata: project.metadata,
    studioIdea: wf.studio?.idea,
    publishIntent: wf.publish?.intent ?? project.servicePayload.publish?.publishIntent,
    hasEditor: Boolean(project.servicePayload.editor),
    hasMotion: Boolean(project.servicePayload.motion),
    hasPublish: Boolean(project.servicePayload.publish),
    hasStudio: Boolean(project.servicePayload.studio),
    assetCount: project.assetReferences.length,
  };
}
