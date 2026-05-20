import { buildCameraPromptBlock } from "@/lib/premium-camera-presets";
import { buildComicPromptBlock } from "@/lib/premium-comic-presets";
import { buildFxPromptBlock } from "@/lib/premium-fx-presets";
import {
  buildPremiumMotionPromptBlocks,
  type PremiumMotionProfile,
} from "@/lib/premium-motion-engine";
import type { ResolvedPremiumPolishProfile } from "@/lib/premium-polish-settings";

const TEXT_PRESERVATION_BLOCK = `TYPOGRAPHY & BRANDING (non-negotiable):
- Never redraw, translate, regenerate, or morph on-screen text, logos, UI, or speech bubbles.
- Stabilize text/logo/UI regions; animate mascots, products, faces, hands, and foreground subjects only.`;

export function buildPremiumPolishViduPromptBlocks(profile: ResolvedPremiumPolishProfile): string {
  const motionProfile: PremiumMotionProfile = {
    motionEnergy: profile.motionEnergy,
    characterMotion: profile.characterMotion,
  };
  const parts = [
    buildPremiumMotionPromptBlocks(motionProfile),
    buildCameraPromptBlock(profile.cameraPreset),
    buildFxPromptBlock(profile.fxPreset),
    buildComicPromptBlock(profile.comicPreset),
  ];
  if (profile.textPreservation) {
    parts.push(TEXT_PRESERVATION_BLOCK);
  }
  return parts.filter(Boolean).join("\n\n");
}
