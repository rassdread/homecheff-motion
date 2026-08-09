/**
 * S.6E — Prompt Matrix public surface.
 */

export {
  STUDIO_PROMPT_MATRIX_VERSION,
  STUDIO_PROVIDER_TRANSFORM_VERSION,
  STUDIO_RUNTIME_PROVIDER_CAPABILITIES,
  type StudioMatrixCompliance,
  type StudioMatrixDetailLevel,
  type StudioRuntimeProviderId,
} from "@/lib/studio-prompt-matrix/types";

export {
  STUDIO_CREATIVE_EXPERIENCE_IDS,
  resolveCanonicalExperienceId,
  type StudioCreativeExperienceId,
} from "@/lib/studio-prompt-matrix/experience-ids";

export {
  STUDIO_EXPERIENCE_REGISTRY,
  getExperienceRegistryEntry,
  listExperiencesByCompliance,
  type StudioExperienceRegistryEntry,
  type StudioExperienceFamily,
} from "@/lib/studio-prompt-matrix/experience-registry";

export {
  resolveContinuityBundleFromPromptInput,
  resolveStandaloneSourceContinuityBundle,
  emptyContinuityBundle,
  assertMandatoryContinuityPresent,
  inspectContinuityModulePresence,
  requiredContinuityModules,
  type ContinuityBundle,
} from "@/lib/studio-prompt-matrix/continuity-bundle";

export {
  assembleCreativeSpecification,
  type AssembleCreativeSpecificationInput,
  type MatrixUserSelections,
} from "@/lib/studio-prompt-matrix/assemble";

export {
  emptyCreativeSpecification,
  type CreativeSpecification,
} from "@/lib/studio-prompt-matrix/creative-specification";

export { resolveDuration, type ResolvedDuration } from "@/lib/studio-prompt-matrix/duration-resolution";
export { resolveAspect, type ResolvedAspect } from "@/lib/studio-prompt-matrix/aspect-resolution";
export {
  mapOptionToSpecPath,
  applyMappedOption,
  mapCanonicalPlatform,
  mapLegacyCameraToShot,
} from "@/lib/studio-prompt-matrix/option-maps";
export {
  applyBrandOverlay,
  applyPromptPresetOverlay,
  sanitizePresetCreative,
  type PromptPresetOverlay,
} from "@/lib/studio-prompt-matrix/overlays";
export { buildSceneStillViaMatrix, type SceneStillMatrixResult } from "@/lib/studio-prompt-matrix/scene-still";
export { inspectMatrixAssembly, type StudioMatrixDebugInspection } from "@/lib/studio-prompt-matrix/debug";

export { transformOpenAiImageFromSceneStill } from "@/lib/studio-prompt-matrix/transforms/openai-image";
export { wrapFusionTransform } from "@/lib/studio-prompt-matrix/transforms/fusion";
export { wrapViduTransform } from "@/lib/studio-prompt-matrix/transforms/vidu";
export {
  mapVoiceTransform,
  mapAudioTransform,
} from "@/lib/studio-prompt-matrix/transforms/elevenlabs";
