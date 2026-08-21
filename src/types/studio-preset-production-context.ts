/**
 * S2C — Universal PresetProductionContext bridge into canonical Studio production.
 * Bridge only — does not replace UPC. No Prisma schema.
 */

import type { ImageTransformationIntent } from "@/types/studio-image-transformation";

export const PRESET_PRODUCTION_CONTEXT_VERSION = "s2c.1" as const;

export type StudioPresetLifecycleClass =
  | "QUICK_ONE_SHOT"
  | "QUICK_WITH_CONTINUE"
  | "CANONICAL_SINGLE_SCENE"
  | "CANONICAL_MULTI_SCENE"
  | "ADVANCED_STORY"
  | "MOTION_ONLY"
  | "IMAGE_ONLY"
  | "LEGACY"
  | "BLOCKED"
  | "MISSING_INPUT";

export type StudioPresetSourceType =
  | "EXPERIENCE_PACK"
  | "MOTION_PRESET"
  | "FUSION_WIZARD"
  | "MORPH_ACTION"
  | "CHARACTER_STUDIO"
  | "DIRECTOR"
  | "HOMECHEFF"
  | "LEGACY";

export type StudioPresetMaterializationMode =
  | "NONE"
  | "DEFERRED_CONTINUE"
  | "SINGLE_SCENE_NOW"
  | "MULTI_SCENE_NOW"
  | "STORY_NOW"
  | "LINK_RESULT_ONLY";

export type StudioPresetRoleTaggedAsset = {
  role:
    | "person"
    | "outfit"
    | "location"
    | "background"
    | "product"
    | "logo"
    | "style"
    | "object"
    | "source_image"
    | "result_still"
    | "result_video"
    | "other";
  assetId?: string | null;
  /** Opaque pointer — never log as signed URL. */
  pointer?: string | null;
  url?: string | null;
  name?: string | null;
  exactness?: "MUST_PRESERVE" | "SHOULD_MATCH" | "STYLE_REFERENCE_ONLY" | null;
  required?: boolean;
};

export type StudioPresetScenePlanBeat = {
  order: number;
  title: string;
  action?: string;
  camera?: string;
  emotion?: string;
  durationSeconds?: number;
  locationHint?: string | null;
  characterHints?: string[];
  transitionToNext?: string | null;
  audioHints?: {
    musicMood?: string | null;
    sfx?: string[];
    voice?: string | null;
  };
};

export type StudioPresetAudioHints = {
  voiceEnabled?: boolean;
  musicMood?: string | null;
  sfxSuggestions?: string[];
  subtitleIntent?: string | null;
  translationIntent?: string | null;
};

export type StudioPresetOrigin = {
  sourceType: StudioPresetSourceType;
  sourceId: string;
  experienceId?: string | null;
  presetId?: string | null;
  wizardId?: string | null;
  morphId?: string | null;
  sourceQuickProjectId?: string | null;
  returnUrl?: string | null;
  homecheffItemId?: string | null;
  homecheffItemType?: string | null;
  growthLeadId?: string | null;
};

export type StudioPresetProductionContext = {
  version: typeof PRESET_PRODUCTION_CONTEXT_VERSION;
  origin: StudioPresetOrigin;
  lifecycleClass: StudioPresetLifecycleClass;
  materializationMode: StudioPresetMaterializationMode;
  continuationSupported: boolean;
  displayTitle: string;
  userIntent?: string | null;
  styleHints: string[];
  worldHints: string[];
  assets: StudioPresetRoleTaggedAsset[];
  transformationIntent?: ImageTransformationIntent | null;
  scenePlan: StudioPresetScenePlanBeat[];
  motionHints: string[];
  audioHints: StudioPresetAudioHints;
  /** Fingerprint for idempotent materialization (no media bytes). */
  idempotencyKey: string;
};

export type StudioPresetMaterializationRecord = {
  version: typeof PRESET_PRODUCTION_CONTEXT_VERSION;
  sourceType: StudioPresetSourceType;
  sourceId: string;
  lifecycleClass: StudioPresetLifecycleClass;
  materializationMode: StudioPresetMaterializationMode;
  storyboardId: string;
  characterIds: string[];
  locationIds: string[];
  propIds: string[];
  sceneIds: string[];
  resultAssetIds: string[];
  transformationIntentPreserved: boolean;
  upcReady: boolean;
  providerCalls: number;
  creditsDebited: number;
  materializedAt: string;
};

export type StudioPresetCoverageStatus =
  | "FULLY_CANONICAL"
  | "QUICK_WITH_CANONICAL_CONTINUE"
  | "QUICK_ONE_SHOT_VALID"
  | "CANONICAL_MULTI_SCENE"
  | "CANONICAL_SINGLE_SCENE"
  | "LEGACY_SUPPORTED"
  | "MISSING_INPUT"
  | "BLOCKED";

export type StudioPresetCoverageRow = {
  id: string;
  displayName: string;
  sourceType: StudioPresetSourceType;
  family: string;
  currentRoute: string;
  currentResultType: string;
  lifecycleClass: StudioPresetLifecycleClass;
  canonicalProject: boolean;
  continueSupported: boolean;
  materializationMode: StudioPresetMaterializationMode;
  entityCreation: string;
  sceneCreation: string;
  transformationIntentPreserved: boolean;
  upcReady: boolean;
  audioHintsPreserved: boolean;
  status: StudioPresetCoverageStatus;
  nextGap: string | null;
};
