import {
  buildAnimationStyleIdentityPromptBlock,
} from "@/lib/animation-style-identity";
import { buildAdvancedMotionIntelligenceBlocks, resolveMotionIntelligenceContext } from "@/lib/premium-motion-automation";
import { buildComicPromptBlock } from "@/lib/premium-comic-presets";
import {
  buildEmotionalActingPromptBlock,
  getEmotionalActingPreset,
} from "@/lib/premium-emotional-presets";
import { buildFxPromptBlock } from "@/lib/premium-fx-presets";
import {
  buildPremiumMotionPromptBlocks,
  type PremiumMotionProfile,
} from "@/lib/premium-motion-engine";
import { buildSegmentTransitionContinuityBlock } from "@/lib/segment-transition-types";
import { buildCharacterRoleEnginePromptBlock } from "@/lib/character-role-engine";
import type { SceneIntelligenceSnapshot } from "@/lib/scene-intelligence";
import type { ResolvedPremiumPolishProfile } from "@/lib/premium-polish-settings";

const TEXT_PRESERVATION_BLOCK = `TYPOGRAPHY & BRANDING (non-negotiable):
- Never redraw, translate, regenerate, or morph on-screen text, logos, UI, or speech bubbles.
- Stabilize text/logo/UI regions; animate mascots, products, faces, hands, and foreground subjects only.`;

export function buildPremiumPolishViduPromptBlocks(
  profile: ResolvedPremiumPolishProfile,
  options?: {
    sceneIntelligence?: SceneIntelligenceSnapshot | null;
    transitionOrder?: number;
    transitionTotal?: number;
  }
): string {
  const emotionalConfig = profile.emotionalActingPreset
    ? getEmotionalActingPreset(profile.emotionalActingPreset)
    : null;
  const motionProfile: PremiumMotionProfile = {
    motionEnergy: emotionalConfig?.motionEnergy ?? profile.motionEnergy,
    characterMotion: profile.characterMotion ?? emotionalConfig?.characterMotion,
  };
  const scene = options?.sceneIntelligence;
  const roles = scene?.detectedRoles ?? [];
  const intelligenceCtx = resolveMotionIntelligenceContext({
    profile,
    scene,
    transitionOrder: options?.transitionOrder,
    transitionTotal: options?.transitionTotal,
  });

  const parts = [
    buildAnimationStyleIdentityPromptBlock(profile.animationStyleId),
    buildPremiumMotionPromptBlocks(motionProfile),
    buildAdvancedMotionIntelligenceBlocks(intelligenceCtx),
    buildEmotionalActingPromptBlock(profile.emotionalActingPreset),
    buildCharacterRoleEnginePromptBlock(roles),
    buildFxPromptBlock(profile.fxPreset),
    buildComicPromptBlock(profile.comicPreset),
    buildSegmentTransitionContinuityBlock(profile.segmentTransitionType),
  ];
  if (profile.textPreservation) {
    parts.push(TEXT_PRESERVATION_BLOCK);
  }
  return parts.filter(Boolean).join("\n\n");
}
