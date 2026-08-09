/**
 * S.6E — Prompt Matrix shared types (provider-neutral).
 * Continuity owns identity; Matrix assembles; Transform is last.
 */

export const STUDIO_PROMPT_MATRIX_VERSION = "6e.1" as const;
export const STUDIO_PROVIDER_TRANSFORM_VERSION = "6e.1" as const;

export type StudioMatrixDetailLevel = "QUICK" | "PROFESSIONAL" | "DIRECTOR";

export type StudioMatrixCompliance =
  | "MATRIX_NATIVE"
  | "MATRIX_WRAPPED"
  | "MATRIX_PARTIAL"
  | "LEGACY_UNMIGRATED"
  | "EXPERIMENTAL";

export type StudioMatrixModality =
  | "image"
  | "video"
  | "audio"
  | "voice"
  | "fusion"
  | "export"
  | "planning";

export type StudioRuntimeProviderId =
  | "openai_image"
  | "openai_vision"
  | "vidu_motion"
  | "elevenlabs_tts"
  | "elevenlabs_clone"
  | "elevenlabs_music"
  | "elevenlabs_sfx"
  | "elevenlabs_stt"
  | "mock";

export type StudioProviderCapabilityMeta = {
  providerId: StudioRuntimeProviderId;
  supportsImageReference: boolean;
  supportsMultipleReferences: boolean;
  supportsNegativePrompt: boolean;
  supportsMotion: boolean;
  supportsDuration: boolean;
  supportedAspects: string[];
  supportsSeed: boolean;
  supportsCancel: boolean;
};

export const STUDIO_RUNTIME_PROVIDER_CAPABILITIES: Record<
  StudioRuntimeProviderId,
  StudioProviderCapabilityMeta
> = {
  openai_image: {
    providerId: "openai_image",
    supportsImageReference: true,
    supportsMultipleReferences: true,
    supportsNegativePrompt: false,
    supportsMotion: false,
    supportsDuration: false,
    supportedAspects: ["1:1", "16:9", "9:16"],
    supportsSeed: false,
    supportsCancel: false,
  },
  openai_vision: {
    providerId: "openai_vision",
    supportsImageReference: true,
    supportsMultipleReferences: true,
    supportsNegativePrompt: false,
    supportsMotion: false,
    supportsDuration: false,
    supportedAspects: [],
    supportsSeed: false,
    supportsCancel: false,
  },
  vidu_motion: {
    providerId: "vidu_motion",
    supportsImageReference: true,
    supportsMultipleReferences: true,
    supportsNegativePrompt: true,
    supportsMotion: true,
    supportsDuration: true,
    supportedAspects: ["9:16", "16:9"],
    supportsSeed: false,
    supportsCancel: false,
  },
  elevenlabs_tts: {
    providerId: "elevenlabs_tts",
    supportsImageReference: false,
    supportsMultipleReferences: false,
    supportsNegativePrompt: false,
    supportsMotion: false,
    supportsDuration: true,
    supportedAspects: [],
    supportsSeed: false,
    supportsCancel: false,
  },
  elevenlabs_clone: {
    providerId: "elevenlabs_clone",
    supportsImageReference: false,
    supportsMultipleReferences: false,
    supportsNegativePrompt: false,
    supportsMotion: false,
    supportsDuration: false,
    supportedAspects: [],
    supportsSeed: false,
    supportsCancel: false,
  },
  elevenlabs_music: {
    providerId: "elevenlabs_music",
    supportsImageReference: false,
    supportsMultipleReferences: false,
    supportsNegativePrompt: false,
    supportsMotion: false,
    supportsDuration: true,
    supportedAspects: [],
    supportsSeed: false,
    supportsCancel: false,
  },
  elevenlabs_sfx: {
    providerId: "elevenlabs_sfx",
    supportsImageReference: false,
    supportsMultipleReferences: false,
    supportsNegativePrompt: false,
    supportsMotion: false,
    supportsDuration: true,
    supportedAspects: [],
    supportsSeed: false,
    supportsCancel: false,
  },
  elevenlabs_stt: {
    providerId: "elevenlabs_stt",
    supportsImageReference: false,
    supportsMultipleReferences: false,
    supportsNegativePrompt: false,
    supportsMotion: false,
    supportsDuration: true,
    supportedAspects: [],
    supportsSeed: false,
    supportsCancel: false,
  },
  mock: {
    providerId: "mock",
    supportsImageReference: true,
    supportsMultipleReferences: true,
    supportsNegativePrompt: true,
    supportsMotion: true,
    supportsDuration: true,
    supportedAspects: ["9:16", "16:9", "1:1"],
    supportsSeed: true,
    supportsCancel: true,
  },
};
