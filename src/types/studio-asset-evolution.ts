/**
 * Studio V2 — asset evolution model (planning only, no auto-create).
 */

export type AssetEvolutionKind = "character" | "location" | "prop" | "world";

export type AssetEvolutionStatus = "present" | "recommended" | "missing";

export type AssetEvolutionEntry = {
  id: string;
  name: string;
  status: AssetEvolutionStatus;
  reasonKeys: string[];
  existingId?: string;
  isNewSuggestion?: boolean;
  usageStoryboardCount?: number;
  usageRenderCount?: number;
  sceneOrders?: number[];
};

export type AssetEvolutionSection = {
  kind: AssetEvolutionKind;
  present: AssetEvolutionEntry[];
  recommended: AssetEvolutionEntry[];
  missing: AssetEvolutionEntry[];
};

export type AssetEvolutionAdvice = {
  code: string;
  kind: AssetEvolutionKind;
  messageKey: string;
  sceneOrders: number[];
  reasonParams?: Record<string, string>;
};

export type StoryboardAssetEvolution = {
  sections: AssetEvolutionSection[];
  continuityAdvice: AssetEvolutionAdvice[];
  visualGaps: AssetEvolutionAdvice[];
  shotAdvice: AssetEvolutionAdvice[];
};

export type AssetEvolutionCompare = {
  current: StoryboardAssetEvolution;
  proposed: StoryboardAssetEvolution;
};
