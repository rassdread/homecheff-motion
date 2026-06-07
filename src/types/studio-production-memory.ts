/**
 * Studio V2 — Production Memory & Learning (advisory only, no ML).
 */

import type { StudioRenderStrategy } from "@/types/studio-render-strategy";

/** One completed or in-progress storyboard summarized for pattern learning. */
export type ProductionMemoryRecord = {
  storyboardId: string;
  title: string;
  ideaText: string;
  directorProfile: string;
  promptStyleProfile: string;
  sceneCount: number;
  shotCount: number;
  durationSeconds: number;
  renderStrategy?: StudioRenderStrategy;
  voiceProfile?: string;
  audioStyle?: string;
  musicStyle?: string;
  soundStyle?: string;
  dominantWorldIds: string[];
  characterIds: string[];
  hasCtaScene: boolean;
};

export type ProductionMemoryPatternId =
  | "homecheff_promo"
  | "garden_promo"
  | "designer_promo"
  | "affiliate_promo"
  | "sports_promo"
  | "tutorial_promo"
  | "community_promo"
  | "generic_commercial";

export type ProductionMemoryPattern = {
  id: ProductionMemoryPatternId;
  labelKey: string;
  matchCount: number;
  confidence: "high" | "medium" | "low";
  averageDurationSeconds: number;
  averageShotCount: number;
  averageSceneCount: number;
  signalKeys: string[];
};

export type ProductionMemoryRecurringEntry = {
  id: string;
  label: string;
  labelKey?: string;
  count: number;
  storyboardCount: number;
  params?: Record<string, string>;
};

export type ProductionMemoryVoiceEntry = {
  profileId: string;
  labelKey: string;
  storyboardCount: number;
  characterCount: number;
};

export type ProductionMemoryAudioStyleEntry = {
  id: string;
  labelKey: string;
  kind: "voice" | "music" | "sound" | "narration";
  count: number;
};

export type ProductionMemoryCreationGuidance = {
  id: string;
  patternId?: ProductionMemoryPatternId;
  patternLabelKey?: string;
  similarProductionCount: number;
  averageDurationSeconds: number;
  averageShotCount: number;
  averageSceneCount: number;
  suggestedWorldName?: string;
  suggestedWorldId?: string;
  suggestedCharacterName?: string;
  suggestedCharacterId?: string;
  suggestedRenderStrategy?: StudioRenderStrategy;
  suggestedStyleLabelKey?: string;
  messageKey: string;
  messageParams: Record<string, string>;
  startWithSuggestionKey?: string;
  startWithParams?: Record<string, string>;
};

export type ProductionMemoryProfile = {
  version: 1;
  totalProductions: number;
  averageDurationSeconds: number;
  averageShotCount: number;
  averageSceneCount: number;
  productionPatterns: ProductionMemoryPattern[];
  recurringStyles: ProductionMemoryRecurringEntry[];
  recurringWorlds: ProductionMemoryRecurringEntry[];
  recurringStructures: ProductionMemoryRecurringEntry[];
  recurringRenderStrategies: ProductionMemoryRecurringEntry[];
  recurringDurations: ProductionMemoryRecurringEntry[];
  recurringShotCounts: ProductionMemoryRecurringEntry[];
  recurringAssetTypes: ProductionMemoryRecurringEntry[];
  recurringVoiceTypes: ProductionMemoryVoiceEntry[];
  recurringAudioStyles: ProductionMemoryAudioStyleEntry[];
  topCharacters: ProductionMemoryRecurringEntry[];
  creationGuidance: ProductionMemoryCreationGuidance | null;
  directorContextLines: string[];
};

export type ProductionMemoryContext = {
  profile: ProductionMemoryProfile;
  contextLines: string[];
  recommendationKeys: string[];
};

export type BuildProductionMemoryProfileInput = {
  memory: import("@/types/studio-project-memory").StudioProjectMemorySnapshot;
  currentIdea?: string;
  libraries?: {
    characters?: import("@/types/studio-api").StudioCharacterListItem[];
    worlds?: import("@/types/studio-api").StudioWorldProfileListItem[];
  };
};
