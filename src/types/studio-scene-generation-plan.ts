/**
 * Studio V2 — Scene Generation Orchestrator (planning only, no image generation).
 */

import type { UnifiedReadinessLevel } from "@/lib/studio-unified-readiness";
import type { StudioToolId } from "@/lib/studio-tool-id";
import type { AnimationRequiredImageRole } from "@/types/studio-animation-plan";

export type SceneGenerationImagePriority = "required" | "recommended" | "optional";

export type SceneGenerationImageStatus = "present" | "missing" | "blocked";

export type SceneGenerationAssetDependency = {
  kind: "character" | "location" | "prop" | "world";
  name: string;
  status: "present" | "missing" | "recommended";
  labelKey: string;
};

export type SceneGenerationPlanImage = {
  id: string;
  sceneId: string;
  sceneOrder: number;
  sceneTitle: string;
  shotIndex: number;
  actionBeat: string;
  imageRole: AnimationRequiredImageRole;
  priority: SceneGenerationImagePriority;
  status: SceneGenerationImageStatus;
  /** Suggested creation order (1 = first). */
  orderIndex: number;
  roleLabelKey: string;
  assetDependencies: SceneGenerationAssetDependency[];
  blockedReasonKey?: string;
  toolId: StudioToolId;
};

export type SceneGenerationPlanStep = {
  order: number;
  itemIds: string[];
  summaryKey: string;
  summaryParams?: Record<string, string>;
};

export type SceneGenerationMissingAsset = {
  id: string;
  kind: "character" | "location" | "prop" | "world";
  name: string;
  reasonKey: string;
  reasonParams?: Record<string, string>;
  toolId: StudioToolId;
  sceneOrders: number[];
};

export type SceneGenerationRecommendation = {
  id: string;
  messageKey: string;
  messageParams?: Record<string, string>;
  toolId?: StudioToolId;
  priority: "high" | "medium" | "low";
};

export type SceneGenerationPlanReadiness = {
  level: UnifiedReadinessLevel;
  score: number;
  readyToRender: boolean;
  requiredMissing: number;
  recommendedMissing: number;
  optionalMissing: number;
  blockedCount: number;
};

export type StudioSceneGenerationPlan = {
  guidanceKey: string;
  guidanceParams: Record<string, string>;
  requiredImages: SceneGenerationPlanImage[];
  recommendedImages: SceneGenerationPlanImage[];
  optionalImages: SceneGenerationPlanImage[];
  generationSteps: SceneGenerationPlanStep[];
  missingAssets: SceneGenerationMissingAsset[];
  recommendations: SceneGenerationRecommendation[];
  readiness: SceneGenerationPlanReadiness;
  totalRequired: number;
  totalRecommended: number;
  totalOptional: number;
  totalPresent: number;
  totalMissing: number;
  directorContextLines: string[];
};

export type StudioSceneGenerationPlanInput = {
  storyboard: import("@/types/studio-api").StudioStoryboardDetail;
  characters?: import("@/types/studio-api").StudioCharacterListItem[];
  locations?: import("@/types/studio-api").StudioLocationListItem[];
  props?: import("@/types/studio-api").StudioPropListItem[];
  worlds?: import("@/types/studio-api").StudioWorldProfileListItem[];
  projectMemory?: import("@/types/studio-project-memory").StudioProjectMemorySnapshot;
  styleProfile?: string;
  directorProfile?: string;
  productionPlan?: import("@/types/studio-production-plan").StudioProductionPlan;
  animationPlan?: import("@/types/studio-animation-plan").StudioAnimationPlan;
  renderStrategyPlan?: import("@/types/studio-render-strategy").StudioRenderStrategyPlan;
  actionShotDistributions?: import("@/types/studio-action-shot-distribution").StoryboardActionShotDistribution;
  assetDecisionRegistry?: import("@/types/studio-asset-decision").StudioAssetDecisionRegistry;
};
