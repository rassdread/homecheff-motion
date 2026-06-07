/**
 * Studio V2 — Character Capabilities & Action Intelligence (planning only, no DB).
 */

export type CharacterCapabilityId =
  | "cook"
  | "taste"
  | "serve"
  | "explain"
  | "greet"
  | "plant"
  | "harvest"
  | "water"
  | "carry"
  | "draw"
  | "create"
  | "sew"
  | "present"
  | "run"
  | "jump"
  | "kick"
  | "celebrate"
  | "deliver"
  | "sell"
  | "shop"
  | "work"
  | "talk"
  | "walk"
  | "point"
  | "observe"
  | "design"
  | "learn"
  | "play"
  | "travel"
  | "stir"
  | "hold"
  | "shoot"
  | "cheer"
  | "collaborate";

export type CharacterCapabilityTier = "expected" | "supported" | "possible";

export type CharacterCapabilitySourceKind =
  | "outfit"
  | "accessory"
  | "world"
  | "prop"
  | "personality"
  | "role"
  | "type";

export type CharacterCapabilityEntry = {
  id: CharacterCapabilityId;
  labelKey: string;
  tier: CharacterCapabilityTier;
  sources: Array<{
    kind: CharacterCapabilitySourceKind;
    label: string;
  }>;
};

export type CharacterCapabilitiesPlan = {
  characterId: string;
  characterName: string;
  expected: CharacterCapabilityId[];
  supported: CharacterCapabilityId[];
  possible: CharacterCapabilityId[];
  entries: CharacterCapabilityEntry[];
};

export type SceneActionClassificationLevel =
  | "supported"
  | "possible"
  | "unusual"
  | "unsupported";

export type ClassifiedSceneAction = {
  fragment: string;
  capabilityId: CharacterCapabilityId | null;
  classification: SceneActionClassificationLevel;
  suggestionKey?: string;
  suggestionParams?: Record<string, string>;
};

export type SceneActionClassification = {
  sceneId: string;
  sceneOrder: number;
  characterId: string | null;
  characterName: string | null;
  actionText: string;
  actions: ClassifiedSceneAction[];
  dominantClassification: SceneActionClassificationLevel;
};

export type ActionShotHint = {
  sceneId: string;
  capabilityId: CharacterCapabilityId;
  shotPreferenceKey: string;
  movementPreferenceKey?: string;
  reasonKey: string;
};

export type StoryboardActionIntelligence = {
  characterPlans: CharacterCapabilitiesPlan[];
  sceneClassifications: SceneActionClassification[];
  shotHints: ActionShotHint[];
  visualProductionHints: Array<{
    messageKey: string;
    messageParams?: Record<string, string>;
  }>;
  renderComplexityBoost: number;
};

export type ProjectActionMemoryTrend = {
  capabilityId: CharacterCapabilityId;
  labelKey: string;
  sceneCount: number;
};
