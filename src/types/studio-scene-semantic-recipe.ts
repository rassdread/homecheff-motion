/** Compact, lossless per-scene semantic recipe for Motion handoff (V26). */

export const SCENE_SEMANTIC_RECIPE_VERSION = 1 as const;

export type SceneSemanticRecipeAssetRef = {
  assetId: string;
  kind: "character" | "prop" | "location" | "world";
  name: string;
  objectType?: string;
  brandIdentity?: string;
  visualStyle?: string;
  shapeDna?: string;
  keyFeatures?: string[];
  preserveRules?: string[];
  continuityNotes?: string;
};

export type SceneCrossAssetRelation = {
  type: "character_prop" | "character_location" | "character_world" | "location_world" | "prop_brand";
  fromId: string;
  toId: string;
  label?: string;
};

export type SceneAudioSemanticLayer = {
  voiceIdentity?: string;
  characterVoice?: string;
  sceneEmotion?: string;
  sceneEnergy?: string;
  narrativeImportance?: string;
};

export type ScenePromptLineage = {
  selectedSceneImageId: string | null;
  promptHash: string;
  promptVersion: number | null;
  semanticRecipeVersion: typeof SCENE_SEMANTIC_RECIPE_VERSION;
  summarySource: "selected_scene_image" | "rebuilt";
  handoffVersion: number;
};

export type SceneSemanticRecipe = {
  version: typeof SCENE_SEMANTIC_RECIPE_VERSION;
  recipeId: string;
  sceneId: string;
  narrativeGoal?: string;
  emotion?: string;
  visualStyle?: string;
  preserveRules?: string[];
  continuityRules?: string;
  keyFeatures?: string[];
  characters: SceneSemanticRecipeAssetRef[];
  props: SceneSemanticRecipeAssetRef[];
  location?: SceneSemanticRecipeAssetRef;
  world?: SceneSemanticRecipeAssetRef;
  audio?: SceneAudioSemanticLayer;
  crossAssetRelations?: SceneCrossAssetRelation[];
  promptLineage?: ScenePromptLineage;
};
