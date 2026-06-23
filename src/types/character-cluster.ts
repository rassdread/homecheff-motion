/** Character Cluster — canonical routes and shared flow types. */

export const CHARACTER_CLUSTER_ROUTES = ["new", "from-reference", "motion-ready"] as const;

export type CharacterClusterRoute = (typeof CHARACTER_CLUSTER_ROUTES)[number];

export const CHARACTER_CLUSTER_FLOW_IDS = [
  "character_new",
  "character_reference",
  "character_motion_ready",
] as const;

export type CharacterClusterFlowId = (typeof CHARACTER_CLUSTER_FLOW_IDS)[number];

export type CharacterClusterAnalyticsEvent = "started" | "completed" | "abandoned";

export type CharacterReferenceMode = "exact" | "custom_variant" | "new_character";

export type CharacterDynamicQuestionType = "choice" | "text" | "boolean";

export type CharacterDynamicQuestion = {
  id: string;
  labelKey: string;
  type: CharacterDynamicQuestionType;
  options?: Array<{ id: string; labelKey: string }>;
  aiSuggestionKey?: string;
  aiSuggestionValue?: string;
  required?: boolean;
};

export type CharacterDynamicAnswers = Record<string, string | boolean | undefined>;

export type CharacterClusterProjectContext = {
  projectId?: string | null;
  projectTitle?: string | null;
  storyboardId?: string | null;
  sceneId?: string | null;
  hcProject?: string | null;
  sourceImage?: string | null;
  sourceAsset?: string | null;
  sourceName?: string | null;
  returnTo?: string | null;
  advanced?: boolean;
  characterId?: string | null;
  mode?: "exact" | "custom_variant" | "new_character";
  requirementId?: string | null;
  /** Character Studio hub flow id — motion_ready | full_body */
  flow?: string | null;
};

export const DEPRECATED_CHARACTER_ENTRY_PATHS = [
  "derive_from_reference",
  "prepare_for_animation",
  "existing_asset",
] as const;

export type DeprecatedCharacterEntryPath = (typeof DEPRECATED_CHARACTER_ENTRY_PATHS)[number];
