/**
 * Studio V2 — Production Timeline & History (project-level, advisory only).
 */

import type { AssetDecisionKind, AssetDecisionMode, StudioAssetDecisionRegistry } from "@/types/studio-asset-decision";
import type { StudioProductionBrief } from "@/types/studio-production-brief";
import type { StudioToolId } from "@/lib/studio-tool-id";

export type ProductionTimelineEventKind =
  | "production_started"
  | "idea_captured"
  | "style_selected"
  | "goal_set"
  | "asset_decision"
  | "asset_created"
  | "asset_linked"
  | "director_prompt_updated"
  | "director_applied"
  | "scene_added"
  | "production_updated"
  | "memory_pattern"
  | "snapshot_created"
  | "snapshot_restored";

export type ProductionTimelineEventSource =
  | "storyboard"
  | "asset_decision"
  | "scene"
  | "memory"
  | "derived";

export type ProductionTimelineEventCategory =
  | "brief"
  | "asset"
  | "director"
  | "evolution"
  | "memory";

export type ProductionTimelineEvent = {
  id: string;
  at: string;
  kind: ProductionTimelineEventKind;
  source: ProductionTimelineEventSource;
  category: ProductionTimelineEventCategory;
  titleKey: string;
  titleParams?: Record<string, string>;
  toolId?: StudioToolId;
};

export type ProductionTimelineMilestone = {
  id: string;
  at: string;
  titleKey: string;
  titleParams?: Record<string, string>;
  toolId?: StudioToolId;
  patternHintKey?: string;
  patternHintParams?: Record<string, string>;
};

export type ProductionTimelineDecision = {
  id: string;
  at: string;
  kind: AssetDecisionKind;
  mode: AssetDecisionMode;
  name: string;
  titleKey: string;
  titleParams?: Record<string, string>;
  fulfilledAt?: string;
  existingId?: string;
};

export type ProductionTimelineEvolutionPoint = {
  id: string;
  at: string;
  titleKey: string;
  titleParams: Record<string, string>;
};

export type StudioProductionTimeline = {
  version: 1;
  timelineEvents: ProductionTimelineEvent[];
  milestones: ProductionTimelineMilestone[];
  decisionHistory: ProductionTimelineDecision[];
  productionEvolution: ProductionTimelineEvolutionPoint[];
  recentCompletedKeys: string[];
  directorContextLines: string[];
};

export type BuildProductionTimelineInput = {
  storyboard: import("@/types/studio-api").StudioStoryboardDetail;
  characters?: import("@/types/studio-api").StudioCharacterListItem[];
  locations?: import("@/types/studio-api").StudioLocationListItem[];
  props?: import("@/types/studio-api").StudioPropListItem[];
  worlds?: import("@/types/studio-api").StudioWorldProfileListItem[];
  projectMemory?: import("@/types/studio-project-memory").StudioProjectMemorySnapshot;
  assetDecisionRegistry?: StudioAssetDecisionRegistry;
  productionBrief?: StudioProductionBrief | null;
  snapshotTimelineEvents?: ProductionTimelineEvent[];
};

export type ProductionTimelineContext = {
  timeline: StudioProductionTimeline;
  contextLines: string[];
  recentCompletedKeys: string[];
};
