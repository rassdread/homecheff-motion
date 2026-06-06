/**
 * Shared fixtures for Motion / Instant / Handoff test types.
 */
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type { PosterMotionSettings } from "@/lib/poster-motion-preserve";
import { PROMPT_BUILDER_VERSION } from "@/types/studio-prompt-builder";
import type { PromptVersionMetadata } from "@/types/studio-prompt-builder";

export function promptVersionMetadata(
  partial: Partial<PromptVersionMetadata> = {}
): PromptVersionMetadata {
  return {
    promptVersion: PROMPT_BUILDER_VERSION,
    generatedAt: partial.generatedAt ?? "2026-01-01T00:00:00.000Z",
    sceneId: partial.sceneId ?? "scene-1",
    generatedPrompt: partial.generatedPrompt ?? "prompt",
    styleProfile: partial.styleProfile ?? "commercial",
    qualityScore: partial.qualityScore ?? 80,
    qualityTier: partial.qualityTier ?? "strong",
  };
}

export function posterMotionSettings(
  partial: Partial<PosterMotionSettings> = {}
): PosterMotionSettings {
  return {
    version: partial.version ?? 1,
    animationStyleId: partial.animationStyleId ?? "cartoon_animation",
    animateMascot: partial.animateMascot ?? true,
    animateProduct: partial.animateProduct ?? true,
    animateForegroundOnly: partial.animateForegroundOnly ?? false,
    preserveAllText: partial.preserveAllText ?? true,
    cinematicCameraMotion: partial.cinematicCameraMotion ?? false,
    particlesGlow: partial.particlesGlow ?? false,
    floatingGeneratedObject: partial.floatingGeneratedObject ?? false,
  };
}

/** Minimal MotionHandoffPayload shell — extend per test with spread. */
export function motionHandoffPayload(
  partial: Partial<MotionHandoffPayload> & { scenes?: MotionHandoffPayload["scenes"] }
): MotionHandoffPayload {
  return {
    version: MOTION_HANDOFF_PAYLOAD_VERSION,
    storyboardId: partial.storyboardId ?? "sb-1",
    title: partial.title ?? "Test",
    description: partial.description ?? "",
    promptStyleProfile: partial.promptStyleProfile ?? "commercial",
    directorProfile: partial.directorProfile ?? "commercial",
    shotDiversityScore: partial.shotDiversityScore ?? 0,
    characterMemory: partial.characterMemory ?? [],
    locationMemory: partial.locationMemory ?? null,
    propMemory: partial.propMemory ?? [],
    worldMemory: partial.worldMemory ?? null,
    continuityStrength: partial.continuityStrength ?? "strong",
    consistencyReport: partial.consistencyReport ?? null,
    overallConsistencyScore: partial.overallConsistencyScore ?? 0,
    driftWarnings: partial.driftWarnings ?? [],
    correctionRecommendations: partial.correctionRecommendations ?? [],
    consistencyHistory: partial.consistencyHistory ?? [],
    latestImprovementScore: partial.latestImprovementScore ?? null,
    visionReport: partial.visionReport ?? null,
    overallVisionScore: partial.overallVisionScore ?? 0,
    visionWarnings: partial.visionWarnings ?? [],
    characterConsistencyReport: partial.characterConsistencyReport ?? null,
    overallCharacterConsistencyScore: partial.overallCharacterConsistencyScore ?? 0,
    characterDriftWarnings: partial.characterDriftWarnings ?? [],
    perSceneCharacterIdentityScores: partial.perSceneCharacterIdentityScores ?? [],
    scenes: partial.scenes ?? [],
    ...partial,
  } as MotionHandoffPayload;
}
