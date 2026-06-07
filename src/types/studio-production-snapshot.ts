/**
 * Studio V2 — Production configuration snapshots (no renders, blobs, or media).
 */

import type { StudioAssetDecisionRegistry } from "@/types/studio-asset-decision";
import type { StudioProductionBrief } from "@/types/studio-production-brief";

export type StudioSnapshotSceneConfig = {
  id: string;
  order: number;
  title: string;
  description: string;
  action: string;
  emotion: string;
  durationSeconds: number;
  shotType: string;
  cameraMovement: string;
  sceneEnergy: string;
  locationId: string | null;
  characterIds: string[];
  propIds: string[];
};

export type StudioSnapshotStoryboardConfig = {
  title: string;
  description: string;
  aiDirectorPrompt: string;
  promptStyleProfile: string;
  directorProfile: string;
  aiDirectorStyleStrength: string;
  voiceEnabled: boolean;
  voiceLanguage: string;
  voiceProfile: string;
  narrationMode: string;
  musicEnabled: boolean;
  musicStyle: string;
  soundEnabled: boolean;
  soundStyle: string;
};

export type StudioSnapshotIdentitySummary = {
  id: string;
  kind: "character" | "location" | "prop" | "world";
  name: string;
  completenessScore: number;
  completenessStatus: "complete" | "almost" | "missing";
};

export type StudioSnapshotPlannerSummary = {
  estimatedSceneCount: number;
  estimatedShotCount: number;
  estimatedDurationSeconds: number;
  renderStrategy: string;
  readinessScore: number;
};

export type StudioSnapshotCreationAssistantSummary = {
  projectStatus: string;
  completedCount: number;
  totalCount: number;
  percent: number;
  readinessScore: number;
};

export type StudioProductionSnapshot = {
  version: 1;
  id: string;
  storyboardId: string;
  savedAt: string;
  source: "manual" | "checkpoint";
  storyboardUpdatedAt: string;
  labelKey: string;
  labelParams: Record<string, string>;
  storyboard: StudioSnapshotStoryboardConfig;
  scenes: StudioSnapshotSceneConfig[];
  assetDecisionRegistry: StudioAssetDecisionRegistry;
  productionBrief: StudioProductionBrief | null;
  identitySummaries: StudioSnapshotIdentitySummary[];
  plannerSummary: StudioSnapshotPlannerSummary;
  creationAssistantSummary: StudioSnapshotCreationAssistantSummary;
};

export type StudioSnapshotHistoryEntry = {
  id: string;
  at: string;
  kind: "snapshot_created" | "snapshot_restored";
  snapshotId: string;
  labelKey: string;
  labelParams: Record<string, string>;
};

export type StudioSnapshotHistory = {
  version: 1;
  storyboardId: string;
  updatedAt: string;
  snapshots: StudioProductionSnapshot[];
  entries: StudioSnapshotHistoryEntry[];
};

export type BuildStudioSnapshotInput = {
  storyboard: import("@/types/studio-api").StudioStoryboardDetail;
  characters?: import("@/types/studio-api").StudioCharacterListItem[];
  locations?: import("@/types/studio-api").StudioLocationListItem[];
  props?: import("@/types/studio-api").StudioPropListItem[];
  worlds?: import("@/types/studio-api").StudioWorldProfileListItem[];
  projectMemory?: import("@/types/studio-project-memory").StudioProjectMemorySnapshot;
  assetDecisionRegistry?: StudioAssetDecisionRegistry;
  productionBrief?: StudioProductionBrief | null;
  source?: "manual" | "checkpoint";
  labelKey?: string;
  labelParams?: Record<string, string>;
};

export type StudioSnapshotCompareLine = {
  id: string;
  labelKey: string;
  labelParams: Record<string, string>;
  category: "scene" | "asset" | "duration" | "shot" | "render" | "general";
};

export type StudioSnapshotCompareResult = {
  fromSnapshotId: string;
  toSnapshotId: string;
  lines: StudioSnapshotCompareLine[];
  hasChanges: boolean;
};

export type StudioSnapshotRecoveryPoint = {
  snapshotId: string;
  savedAt: string;
  labelKey: string;
  labelParams: Record<string, string>;
  sceneCount: number;
  isStale: boolean;
};

export type StudioSnapshotContext = {
  latestSnapshot: StudioProductionSnapshot | null;
  recoveryPoint: StudioSnapshotRecoveryPoint | null;
  contextLines: string[];
  recommendationKeys: string[];
};

export type StudioSnapshotRestoreResult = {
  ok: boolean;
  snapshotId: string;
  restoredAt: string;
  restoredAssetDecisions: boolean;
  storyboardFieldsRestored: string[];
  scenesRestored: number;
  errorKey?: string;
};
