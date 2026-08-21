/**
 * S2A — Unified Production Context contract.
 * Canonical generation-time creative truth. Not a billing/UI dump.
 */

export const UPC_VERSION = "s2a.1" as const;
export const PROMPT_ORCHESTRATOR_VERSION = "s2a.1" as const;
export const SCENE_EXECUTION_VERSION = "s2a.1" as const;

export type UpcVersion = typeof UPC_VERSION;

export type ProductionExactness = "MUST_PRESERVE" | "SHOULD_MATCH" | "STYLE_REFERENCE_ONLY";

export type ProductionEntityKind =
  | "character"
  | "location"
  | "prop"
  | "product"
  | "logo"
  | "world"
  | "source_image";

export type ProductionMissingClass = "HARD_MISSING" | "OPTIONAL_MISSING" | "STALE_REFERENCE";

export type ProductionReferenceAccounting =
  | "used"
  | "text_fallback"
  | "unsupported"
  | "missing";

export type ProductionReferenceAsset = {
  entityId: string;
  entityKind: ProductionEntityKind;
  label: string;
  role: string;
  url: string | null;
  exactness: ProductionExactness;
};

export type ProductionMissingIssue = {
  class: ProductionMissingClass;
  entityKind: ProductionEntityKind;
  entityId: string | null;
  sceneId: string | null;
  message: string;
};

export type UpcProjectMeta = {
  storyboardId: string;
  title: string;
  description: string;
  language: string;
  experienceId: string | null;
  intendedOutput: "storyboard_video" | "still" | "unknown";
  durationIntentSeconds: number | null;
  aspectRatio: string | null;
  commercialContext: boolean;
};

export type UpcStyleWorld = {
  storyboardStyleProfile: string;
  directorProfile: string;
  worldId: string | null;
  worldName: string | null;
  worldVisualStyle: string;
  worldTone: string;
  worldContinuityRules: string;
  forbiddenVisuals: string[];
  /** Deterministic merged summary — not a blind concatenation. */
  resolvedSummary: string;
  precedence: string[];
};

export type UpcVoiceIdentity = {
  enabled: boolean;
  locked: boolean;
  provider: string;
  profile: string;
  language: string;
};

export type UpcCharacter = {
  id: string;
  name: string;
  role: string;
  textIdentity: {
    description: string;
    appearanceMemory: string;
    visualKeywords: string;
    defaultClothing: string;
    defaultAccessories: string;
    personality: string;
    forbidden: string;
  };
  referenceIdentity: {
    primaryUrl: string | null;
    supportingUrls: Array<{ role: string; url: string }>;
  };
  voiceIdentity: UpcVoiceIdentity;
  identityStrength: string;
  continuityStrength: string;
  worldId: string | null;
};

export type UpcLocation = {
  id: string;
  name: string;
  category: string;
  visualIdentity: string;
  environmentKeywords: string;
  worldMemory: string;
  forbidden: string;
  referenceUrl: string | null;
  continuityStrength: string;
};

export type UpcProp = {
  id: string;
  name: string;
  category: string;
  kind: "prop" | "product" | "logo";
  visualDescription: string;
  brandingRules: string;
  referenceUrl: string | null;
  exactness: ProductionExactness;
  pixelPreservedStill: boolean;
  continuityStrength: string;
};

export type SceneContinuityState = {
  enteringNotes: string[];
  exitingNotes: string[];
  carriedPropIds: string[];
  characterIds: string[];
  wardrobeByCharacterId: Record<string, string>;
  heldPropByCharacterId: Record<string, string>;
  locationId: string | null;
  continuesFromPrevious: boolean;
};

export type UpcScene = {
  sceneId: string;
  order: number;
  title: string;
  description: string;
  action: string;
  emotion: string;
  camera: string;
  shotType: string;
  cameraMovement: string;
  sceneEnergy: string;
  durationSeconds: number;
  dialogue: string;
  locationId: string | null;
  characterIds: string[];
  propIds: string[];
  transitionToNext: string;
  selectedImageId: string | null;
  selectedImageUrl: string | null;
  generatedPrompt: string | null;
  promptVersion: number | null;
  generationVersion: number | null;
  continuity: SceneContinuityState;
  sceneContextHash: string;
  issues: ProductionMissingIssue[];
};

export type UpcAudioPlan = {
  voiceEnabled: boolean;
  voiceLanguage: string;
  voiceProfile: string;
  musicEnabled: boolean;
  musicStyle: string;
  soundEnabled: boolean;
  soundStyle: string;
  /** Planning only — mix remains static beds. */
  mixSemantics: "static_beds_not_timeline";
};

export type UnifiedProductionContext = {
  version: UpcVersion;
  upcHash: string;
  project: UpcProjectMeta;
  style: UpcStyleWorld;
  characters: UpcCharacter[];
  locations: UpcLocation[];
  props: UpcProp[];
  scenes: UpcScene[];
  audioPlan: UpcAudioPlan;
  references: ProductionReferenceAsset[];
  issues: ProductionMissingIssue[];
  source: "workspace" | "director" | "hc_orchestrator" | "legacy";
};

export type ProductionPromptTarget = "scene-image" | "motion" | "rerender";

export type ProductionPromptSectionId =
  | "safety"
  | "identity"
  | "product"
  | "user_override"
  | "continuity"
  | "action"
  | "location"
  | "camera"
  | "style"
  | "polish";

export type ProductionPromptSection = {
  id: ProductionPromptSectionId;
  priority: number;
  text: string;
};

export type ProductionInstructions = {
  orchestratorVersion: typeof PROMPT_ORCHESTRATOR_VERSION;
  executionVersion: typeof SCENE_EXECUTION_VERSION;
  target: ProductionPromptTarget;
  upcHash: string;
  sceneId: string;
  sceneContextHash: string;
  sections: ProductionPromptSection[];
  assembledPrompt: string;
  negatives: string[];
  references: ProductionReferenceAsset[];
  referenceAccounting: Array<{
    entityId: string;
    entityKind: ProductionEntityKind;
    accounting: ProductionReferenceAccounting;
    reason: string;
  }>;
  providerMode: string;
};

export type CompactProductionContextSnapshot = {
  productionContextVersion: UpcVersion;
  upcHash: string;
  storyboardId: string;
  scenes: Array<{
    sceneId: string;
    order: number;
    sceneContextHash: string;
    characterIds: string[];
    locationId: string | null;
    propIds: string[];
    carriedPropIds: string[];
    referenceEntityIds: string[];
  }>;
};
