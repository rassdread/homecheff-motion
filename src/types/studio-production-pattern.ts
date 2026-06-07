/**
 * Studio V2 — Production Pattern Intelligence (advisory, no ML).
 */

import type {
  ProductionMemoryPattern,
  ProductionMemoryPatternId,
  ProductionMemoryRecurringEntry,
} from "@/types/studio-production-memory";
import type { StudioProductionTimeline } from "@/types/studio-production-timeline";

export type ProductionPatternAssetCombination = {
  id: string;
  characterId: string;
  characterName: string;
  worldId?: string;
  worldName?: string;
  storyboardCount: number;
  labelKey: string;
  params: Record<string, string>;
};

export type ProductionPatternStructureSummary = {
  averageSceneCount: number;
  averageShotCount: number;
  averageDurationSeconds: number;
  labelKey: string;
  params: Record<string, string>;
};

export type ProductionPatternProfile = {
  version: 1;
  totalProductions: number;
  currentProductionType: ProductionMemoryPatternId | null;
  currentProductionTypeLabelKey: string | null;
  recurringProductionTypes: ProductionMemoryPattern[];
  recurringStructures: ProductionMemoryRecurringEntry[];
  recurringRenderStrategies: ProductionMemoryRecurringEntry[];
  recurringWorlds: ProductionMemoryRecurringEntry[];
  recurringAssetCombinations: ProductionPatternAssetCombination[];
  recurringDurations: ProductionMemoryRecurringEntry[];
  recurringShotCounts: ProductionMemoryRecurringEntry[];
  recurringCharacters: ProductionMemoryRecurringEntry[];
  recurringProps: ProductionMemoryRecurringEntry[];
  structureSummary: ProductionPatternStructureSummary | null;
  directorContextLines: string[];
};

export type BuildProductionPatternProfileInput = {
  projectMemory?: import("@/types/studio-project-memory").StudioProjectMemorySnapshot;
  timeline?: StudioProductionTimeline;
  storyboard?: import("@/types/studio-api").StudioStoryboardDetail;
  characters?: import("@/types/studio-api").StudioCharacterListItem[];
  locations?: import("@/types/studio-api").StudioLocationListItem[];
  props?: import("@/types/studio-api").StudioPropListItem[];
  worlds?: import("@/types/studio-api").StudioWorldProfileListItem[];
  assetDecisionRegistry?: import("@/types/studio-asset-decision").StudioAssetDecisionRegistry;
  currentIdea?: string;
};

export type ProductionPatternContext = {
  profile: ProductionPatternProfile;
  contextLines: string[];
  recommendationKeys: string[];
};
