/**
 * S2A — Mode-aware capabilities for active still/Vidu generation paths.
 * Distinct from V41 studio-provider-capabilities (planning matrix).
 * Does not claim unsupported reference conditioning.
 */

import {
  openAiImageEditSupportsMultiReference,
  openAiImageModelSupportsEdit,
  resolveOpenAiImageEditModel,
  resolveOpenAiImageModel,
} from "@/lib/openai-image-generation";

export type ImageGenerationModeClass =
  | "TEXT_ONLY"
  | "IMAGE_EDIT"
  | "MULTI_REFERENCE"
  | "UNSUPPORTED_FOR_REFERENCES";

export type ViduModeId = "start_end" | "multiframe";

export type SceneStillCapability = {
  provider: "openai_image";
  primaryModel: string;
  editModel: string;
  generationsClass: ImageGenerationModeClass;
  editsClass: ImageGenerationModeClass;
  /** True when scene stills with refs should use the edit endpoint. */
  useReferenceEdit: boolean;
  supportsNegativePrompt: false;
};

export type ViduModeCapability = {
  mode: ViduModeId;
  supportsMultipleImages: boolean;
  supportsPerFramePrompt: boolean;
  supportsGlobalPrompt: boolean;
  supportsAspectRatioField: boolean;
  supportsNegativePrompt: boolean;
  supportsDuration: boolean;
  maxPromptChars: number;
  identityVia: "start_end_frames" | "keyframes_plus_prompt";
};

export function resolveSceneStillCapability(): SceneStillCapability {
  const primaryModel = resolveOpenAiImageModel();
  const editModel = resolveOpenAiImageEditModel();
  const generationsClass: ImageGenerationModeClass = openAiImageModelSupportsEdit(primaryModel)
    ? "IMAGE_EDIT"
    : "TEXT_ONLY";
  const editsClass: ImageGenerationModeClass = openAiImageEditSupportsMultiReference(editModel)
    ? "MULTI_REFERENCE"
    : openAiImageModelSupportsEdit(editModel)
      ? "IMAGE_EDIT"
      : "UNSUPPORTED_FOR_REFERENCES";

  const env = process.env.STUDIO_SCENE_IMAGE_REFERENCE_EDIT?.trim().toLowerCase();
  const envForcedOff = env === "0" || env === "false" || env === "off";
  const envForcedOn = env === "1" || env === "true" || env === "on";
  const useReferenceEdit =
    !envForcedOff &&
    editsClass !== "UNSUPPORTED_FOR_REFERENCES" &&
    (envForcedOn || openAiImageModelSupportsEdit(primaryModel));

  return {
    provider: "openai_image",
    primaryModel,
    editModel,
    generationsClass,
    editsClass,
    useReferenceEdit,
    supportsNegativePrompt: false,
  };
}

export function resolveViduModeCapability(mode: ViduModeId): ViduModeCapability {
  if (mode === "multiframe") {
    return {
      mode,
      supportsMultipleImages: true,
      supportsPerFramePrompt: true,
      supportsGlobalPrompt: true,
      supportsAspectRatioField: false,
      supportsNegativePrompt: false,
      supportsDuration: true,
      maxPromptChars: 3500,
      identityVia: "keyframes_plus_prompt",
    };
  }
  return {
    mode: "start_end",
    supportsMultipleImages: true,
    supportsPerFramePrompt: false,
    supportsGlobalPrompt: true,
    supportsAspectRatioField: false,
    supportsNegativePrompt: false,
    supportsDuration: true,
    maxPromptChars: 3500,
    identityVia: "start_end_frames",
  };
}
