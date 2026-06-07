/**
 * Studio V2 — Creation Assistant (project-level task consolidation, advisory only).
 */

import type { UnifiedReadinessLevel } from "@/lib/studio-unified-readiness";
import type { StudioToolId } from "@/lib/studio-tool-id";

export type CreationAssistantProjectStatus =
  | "started"
  | "building"
  | "almost_ready"
  | "ready_for_render";

export type CreationAssistantTaskCategory =
  | "asset"
  | "image"
  | "audio"
  | "story"
  | "render"
  | "fix"
  | "general";

export type CreationAssistantTaskTier = "now" | "next" | "optional" | "completed";

export type CreationAssistantActionKind =
  | "open"
  | "openLibrary"
  | "createNew"
  | "useSuggestion";

export type CreationAssistantTaskSource =
  | "readiness_fix"
  | "creation_guidance"
  | "creative_review"
  | "generation_plan"
  | "domain_check"
  | "production_plan"
  | "asset_decision"
  | "production_timeline"
  | "story_architect"
  | "director_decision";

export type CreationAssistantTask = {
  id: string;
  category: CreationAssistantTaskCategory;
  tier: CreationAssistantTaskTier;
  messageKey: string;
  messageParams?: Record<string, string>;
  toolId?: StudioToolId;
  actionKind: CreationAssistantActionKind;
  suggestedAssetId?: string;
  suggestedLabel?: string;
  sceneOrder?: number;
  source: CreationAssistantTaskSource;
  priority: "high" | "medium" | "low";
};

export type CreationAssistantCompletionProgress = {
  completedCount: number;
  totalCount: number;
  percent: number;
  domainsPassed: number;
  domainsTotal: number;
  projectStatus: CreationAssistantProjectStatus;
  projectStatusKey: string;
  readinessLevel: UnifiedReadinessLevel;
  readinessScore: number;
};

export type CreationAssistantRecoveryPoint = {
  snapshotId: string;
  savedAt: string;
  labelKey: string;
  labelParams: Record<string, string>;
  sceneCount: number;
  isStale: boolean;
};

export type StudioCreationAssistantView = {
  version: 1;
  nowTasks: CreationAssistantTask[];
  nextTasks: CreationAssistantTask[];
  optionalTasks: CreationAssistantTask[];
  completedItems: CreationAssistantTask[];
  blockers: CreationAssistantTask[];
  completionProgress: CreationAssistantCompletionProgress;
  directorContextLines: string[];
  directorLearningKeys: string[];
  recoveryPoint: CreationAssistantRecoveryPoint | null;
};

export type CreationAssistantContext = {
  view: StudioCreationAssistantView;
  contextLines: string[];
  openTaskKeys: string[];
};

export type StudioCreationAssistantInput = {
  storyboard: import("@/types/studio-api").StudioStoryboardDetail;
  characters?: import("@/types/studio-api").StudioCharacterListItem[];
  locations?: import("@/types/studio-api").StudioLocationListItem[];
  props?: import("@/types/studio-api").StudioPropListItem[];
  worlds?: import("@/types/studio-api").StudioWorldProfileListItem[];
  projectMemory?: import("@/types/studio-project-memory").StudioProjectMemorySnapshot;
  styleProfile?: string;
  directorProfile?: string;
  currentIdea?: string;
  assetDecisionRegistry?: import("@/types/studio-asset-decision").StudioAssetDecisionRegistry;
  productionTimeline?: import("@/types/studio-production-timeline").StudioProductionTimeline;
};
