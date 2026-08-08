/**
 * SHARED_PURE — Capability registry for Studio generation (S.4).
 * Maps product capabilities → credit actionType + execution mode + scope.
 * Provider adapter selection stays server-side.
 */

import type { StudioGenerationStatus } from "@/lib/studio-generation-status";

export const STUDIO_GENERATION_CAPABILITIES = [
  "IMAGE_GENERATE",
  "IMAGE_EDIT",
  "VIDEO_GENERATE",
  "VOICE_TTS",
  "VOICE_CLONE",
  "MUSIC_GENERATE",
  "SFX_GENERATE",
  "TRANSLATE",
  "SUBTITLE_GENERATE",
  "RENDER",
  "FUSION_RENDER",
  "VISION_ANALYZE",
] as const;

export type StudioGenerationCapability = (typeof STUDIO_GENERATION_CAPABILITIES)[number];

export type StudioGenerationExecutionMode =
  | "sync"
  | "async_poll"
  | "async_callback"
  | "local_process";

export type StudioGenerationTargetScope = "scene" | "project" | "user";

export type StudioGenerationCapabilityDef = {
  capability: StudioGenerationCapability;
  /** Maps to STUDIO_ACTION_COST_REGISTRY actionType */
  actionType: string;
  executionMode: StudioGenerationExecutionMode;
  targetScope: StudioGenerationTargetScope;
  supportsCancellation: boolean;
  /** Default adapter id (server may override by env) */
  defaultAdapterId: string;
};

export const STUDIO_GENERATION_CAPABILITY_REGISTRY: Record<
  StudioGenerationCapability,
  StudioGenerationCapabilityDef
> = {
  IMAGE_GENERATE: {
    capability: "IMAGE_GENERATE",
    actionType: "scene_generation",
    executionMode: "sync",
    targetScope: "scene",
    supportsCancellation: false,
    defaultAdapterId: "openai_image",
  },
  IMAGE_EDIT: {
    capability: "IMAGE_EDIT",
    actionType: "image_edit",
    executionMode: "sync",
    targetScope: "scene",
    supportsCancellation: false,
    defaultAdapterId: "openai_image",
  },
  VIDEO_GENERATE: {
    capability: "VIDEO_GENERATE",
    actionType: "motion_render",
    executionMode: "async_poll",
    targetScope: "project",
    supportsCancellation: false,
    defaultAdapterId: "vidu_motion",
  },
  VOICE_TTS: {
    capability: "VOICE_TTS",
    actionType: "voice_generation",
    executionMode: "sync",
    targetScope: "project",
    supportsCancellation: false,
    defaultAdapterId: "elevenlabs_tts",
  },
  VOICE_CLONE: {
    capability: "VOICE_CLONE",
    actionType: "voice_clone",
    executionMode: "sync",
    targetScope: "user",
    supportsCancellation: false,
    defaultAdapterId: "elevenlabs_clone",
  },
  MUSIC_GENERATE: {
    capability: "MUSIC_GENERATE",
    actionType: "music_generation",
    executionMode: "sync",
    targetScope: "project",
    supportsCancellation: false,
    defaultAdapterId: "elevenlabs_music",
  },
  SFX_GENERATE: {
    capability: "SFX_GENERATE",
    actionType: "sfx_generation",
    executionMode: "sync",
    targetScope: "scene",
    supportsCancellation: false,
    defaultAdapterId: "elevenlabs_sfx",
  },
  TRANSLATE: {
    capability: "TRANSLATE",
    actionType: "translation_export",
    executionMode: "sync",
    targetScope: "project",
    supportsCancellation: false,
    defaultAdapterId: "openai_translate",
  },
  SUBTITLE_GENERATE: {
    capability: "SUBTITLE_GENERATE",
    actionType: "subtitle_transcription",
    executionMode: "sync",
    targetScope: "project",
    supportsCancellation: false,
    defaultAdapterId: "elevenlabs_stt",
  },
  RENDER: {
    capability: "RENDER",
    actionType: "motion_render",
    executionMode: "async_poll",
    targetScope: "project",
    supportsCancellation: false,
    defaultAdapterId: "vidu_motion",
  },
  FUSION_RENDER: {
    capability: "FUSION_RENDER",
    actionType: "fusion_render",
    executionMode: "sync",
    targetScope: "user",
    supportsCancellation: false,
    defaultAdapterId: "openai_image",
  },
  VISION_ANALYZE: {
    capability: "VISION_ANALYZE",
    actionType: "vision_analysis",
    executionMode: "sync",
    targetScope: "scene",
    supportsCancellation: false,
    defaultAdapterId: "openai_vision",
  },
};

export function getStudioGenerationCapability(
  capability: StudioGenerationCapability
): StudioGenerationCapabilityDef {
  return STUDIO_GENERATION_CAPABILITY_REGISTRY[capability];
}

export type StudioGenerationUiContract = {
  jobId: string;
  capability: StudioGenerationCapability;
  status: StudioGenerationStatus;
  /** Only when provider supplies real progress; never invent percentages. */
  progress: number | null;
  safeMessage: string;
  creditCost: number;
  creditsCharged: number;
  chargeFinalized: boolean;
  storyboardId: string | null;
  sceneId: string | null;
  outputAssetId: string | null;
  supportsCancellation: boolean;
};
