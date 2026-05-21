/**
 * Premium smart automation — orchestrates motion intelligence from preset + scene + segment.
 */

import { buildCinematicDirectingBlock } from "@/lib/premium-cinematic-directing";
import { buildCameraIntelligenceBlock } from "@/lib/premium-camera-intelligence";
import { buildFacialActingPromptBlock } from "@/lib/premium-facial-acting";
import { buildGlobalMascotAnimationPromptBlock } from "@/lib/premium-mascot-animation-preset";
import { buildForegroundSegmentationPromptBlock } from "@/lib/premium-foreground-intelligence";
import {
  buildMotionVariationEngineBlock,
  buildMotionVariationSegmentHint,
  resolveMotionVariationPhase,
} from "@/lib/premium-motion-variation";
import { deriveMotionMemoryState, buildMotionMemoryPromptBlock } from "@/lib/premium-motion-memory";
import { buildTemporalContinuityBlock } from "@/lib/premium-temporal-continuity";
import { buildSocialPolishBlock, shouldApplySocialPolish } from "@/lib/premium-social-polish";
import { buildPrimarySharedGroupPlan, buildPrimarySharedGroupPromptBlock } from "@/lib/primary-shared-group";
import { shouldUseSharedGroupDirecting } from "@/lib/animation-style-identity";
import type { ResolvedPremiumPolishProfile } from "@/lib/premium-polish-settings";
import type { SceneIntelligenceSnapshot } from "@/lib/scene-intelligence";

export type MotionIntelligenceContext = {
  profile: ResolvedPremiumPolishProfile;
  scene?: SceneIntelligenceSnapshot | null;
  transitionOrder: number;
  transitionTotal: number;
};

export function resolveMotionIntelligenceContext(params: {
  profile: ResolvedPremiumPolishProfile;
  scene?: SceneIntelligenceSnapshot | null;
  transitionOrder?: number;
  transitionTotal?: number;
}): MotionIntelligenceContext {
  return {
    profile: params.profile,
    scene: params.scene,
    transitionOrder: params.transitionOrder ?? 0,
    transitionTotal: Math.max(1, params.transitionTotal ?? 1),
  };
}

/** Full advanced motion intelligence stack for Vidu (prompt-only; no pipeline change). */
export function buildAdvancedMotionIntelligenceBlocks(ctx: MotionIntelligenceContext): string {
  const { profile, scene, transitionOrder, transitionTotal } = ctx;
  const roles = scene?.detectedRoles ?? [];
  const segmentPhase = resolveMotionVariationPhase(transitionOrder, transitionTotal);

  const memory = deriveMotionMemoryState({
    animationStyleId: profile.animationStyleId,
    motionEnergy: profile.motionEnergy,
    transitionOrder,
    transitionTotal,
    roles,
    focusHint: scene?.focusHint,
    emotionalActingPreset: profile.emotionalActingPreset,
    focusCycle: buildPrimarySharedGroupPlan(roles).focusCycle,
  });

  const sharedPlan = buildPrimarySharedGroupPlan(roles);
  const useSharedGroup = shouldUseSharedGroupDirecting(profile.animationStyleId);
  const sharedBlock =
    useSharedGroup ?
      buildPrimarySharedGroupPromptBlock({ plan: sharedPlan, transitionOrder, transitionTotal })
    : "";

  const mascotGlobalBlock = buildGlobalMascotAnimationPromptBlock({
    roles,
    scene,
    compact: false,
  });

  const facialBlock = buildFacialActingPromptBlock({
    roles,
    emotionalActingPreset: profile.emotionalActingPreset,
    motionEnergy: profile.motionEnergy,
    segmentPhase,
    skipGlobalFacialCore: Boolean(mascotGlobalBlock),
    excludeMascotRolesFromRoleHints: Boolean(mascotGlobalBlock),
  });

  const parts = [
    buildForegroundSegmentationPromptBlock(),
    buildCinematicDirectingBlock({
      animationStyleId: profile.animationStyleId,
      roles,
      focusHint: scene?.focusHint,
      transitionOrder,
      transitionTotal,
      sharedPlan,
    }),
    mascotGlobalBlock,
    facialBlock,
    buildMotionVariationEngineBlock({
      roles,
      motionEnergy: profile.motionEnergy,
      transitionOrder,
      transitionTotal,
      avoidGestureBeats: memory.priorGestureBeats,
    }),
    buildTemporalContinuityBlock(memory),
    buildMotionMemoryPromptBlock(memory),
    sharedBlock,
    buildCameraIntelligenceBlock({
      cameraPreset: profile.cameraPreset,
      motionEnergy: profile.motionEnergy,
      emotionalActingPreset: profile.emotionalActingPreset,
      segmentPhase,
      memory,
    }),
  ];

  if (shouldApplySocialPolish(profile.animationStyleId)) {
    parts.push(
      buildSocialPolishBlock({
        animationStyleId: profile.animationStyleId,
        motionEnergy: profile.motionEnergy,
        segmentPhase,
      })
    );
  }

  return parts.filter(Boolean).join("\n\n");
}

/** Per-segment tail hints for animation-jobs (memory + variation). */
export function buildMotionIntelligenceSegmentHints(ctx: MotionIntelligenceContext): string {
  const { profile, scene, transitionOrder, transitionTotal } = ctx;
  const memory = deriveMotionMemoryState({
    animationStyleId: profile.animationStyleId,
    motionEnergy: profile.motionEnergy,
    transitionOrder,
    transitionTotal,
    roles: scene?.detectedRoles ?? [],
    focusHint: scene?.focusHint,
    emotionalActingPreset: profile.emotionalActingPreset,
    focusCycle: buildPrimarySharedGroupPlan(scene?.detectedRoles ?? []).focusCycle,
  });

  return [
    buildMotionMemoryPromptBlock(memory),
    buildMotionVariationSegmentHint({
      transitionOrder,
      transitionTotal,
      motionEnergy: profile.motionEnergy,
      avoidGestureBeats: memory.priorGestureBeats,
    }),
  ].join("\n\n");
}
