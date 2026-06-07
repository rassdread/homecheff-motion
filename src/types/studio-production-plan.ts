/**
 * Studio V2 — Production Planner (project-level planning, no execution).
 */

import type { UnifiedReadinessLevel } from "@/lib/studio-unified-readiness";
import type { StudioToolId } from "@/lib/studio-tool-id";
import type { ActionComplexityLevel, StudioRenderStrategy } from "@/types/studio-render-strategy";

export type ProductionReadinessLevel = UnifiedReadinessLevel;

export type StoryStructurePhaseId = "intro" | "setup" | "development" | "climax" | "ending";

export type StoryStructurePhaseStatus = "present" | "missing" | "weak" | "strong";

export type ProductionMissingItemKind =
  | "character"
  | "location"
  | "prop"
  | "world"
  | "image"
  | "audio"
  | "shot";

export type ProductionMissingItem = {
  id: string;
  kind: ProductionMissingItemKind;
  label: string;
  reasonKey: string;
  reasonParams?: Record<string, string>;
  toolId?: StudioToolId;
  createNew?: boolean;
};

export type ProductionRecommendation = {
  id: string;
  messageKey: string;
  messageParams?: Record<string, string>;
  toolId?: StudioToolId;
  priority: "high" | "medium" | "low";
};

export type ProductionStoryStructurePhase = {
  phase: StoryStructurePhaseId;
  status: StoryStructurePhaseStatus;
  sceneOrders: number[];
  labelKey: string;
};

export type ProductionAssetEntry = {
  id: string;
  name: string;
  kind: "character" | "location" | "prop" | "world";
  status: "present" | "missing" | "recommended";
  reasonKey?: string;
};

export type ProductionAssetPlanning = {
  characters: ProductionAssetEntry[];
  locations: ProductionAssetEntry[];
  props: ProductionAssetEntry[];
  worlds: ProductionAssetEntry[];
  requiredCount: number;
  presentCount: number;
  missingCount: number;
};

export type ProductionActionPlanning = {
  totalActionSteps: number;
  recommendedShotCount: number;
  complexity: ActionComplexityLevel;
  scenesWithActionChain: number;
  durationMismatchScenes: number;
};

export type ProductionImagePlanning = {
  requiredCount: number;
  presentCount: number;
  missingCount: number;
  recommendedCount: number;
};

export type ProductionGenerationPlanning = {
  requiredCount: number;
  recommendedCount: number;
  optionalCount: number;
  missingRequiredCount: number;
  missingRecommendedCount: number;
  missingAssetCount: number;
  readyToRender: boolean;
  readinessLevel: ProductionReadinessLevel;
  readinessScore: number;
  generationStepCount: number;
};

export type ProductionAudioStatus = "ready" | "partial" | "missing";

export type ProductionAudioPlanning = {
  narration: ProductionAudioStatus;
  transcript: ProductionAudioStatus;
  music: ProductionAudioStatus;
  sound: ProductionAudioStatus;
  voiceEnabled: boolean;
  musicEnabled: boolean;
  soundEnabled: boolean;
};

export type ProductionRenderPlanning = {
  recommendedStrategy: StudioRenderStrategy;
  strategyLabelKey: string;
  strategyExplanationKey: string;
  reasonKeys: string[];
  confidence: string;
};

export type ProductionDomainReadiness = {
  id: "story" | "assets" | "images" | "audio" | "render";
  messageKey: string;
  passed: boolean;
};

export type StudioProductionPlan = {
  productionGoalKey: string;
  productionGoalParams: Record<string, string>;
  estimatedDurationSeconds: number;
  estimatedShotCount: number;
  estimatedSceneCount: number;
  estimatedAssetCount: number;
  readiness: ProductionReadinessLevel;
  readinessScore: number;
  missingItems: ProductionMissingItem[];
  recommendations: ProductionRecommendation[];
  creationGuidance: ProductionMissingItem[];
  storyStructure: ProductionStoryStructurePhase[];
  assetPlanning: ProductionAssetPlanning;
  actionPlanning: ProductionActionPlanning;
  imagePlanning: ProductionImagePlanning;
  generationPlanning: ProductionGenerationPlanning;
  audioPlanning: ProductionAudioPlanning;
  renderPlanning: ProductionRenderPlanning;
  domainReadiness: ProductionDomainReadiness[];
  directorContextLines: string[];
};

export type StudioProductionPlanInput = {
  storyboard: import("@/types/studio-api").StudioStoryboardDetail;
  characters?: import("@/types/studio-api").StudioCharacterListItem[];
  locations?: import("@/types/studio-api").StudioLocationListItem[];
  props?: import("@/types/studio-api").StudioPropListItem[];
  worlds?: import("@/types/studio-api").StudioWorldProfileListItem[];
  projectMemory?: import("@/types/studio-project-memory").StudioProjectMemorySnapshot;
  styleProfile?: string;
  directorProfile?: string;
  productionBrief?: import("@/types/studio-production-brief").StudioProductionBrief;
  assetDecisionRegistry?: import("@/types/studio-asset-decision").StudioAssetDecisionRegistry;
};
