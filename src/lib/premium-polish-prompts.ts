import { buildCompactViduMotionPrompt } from "@/lib/vidu-prompt-budget";
import type { SceneIntelligenceSnapshot } from "@/lib/scene-intelligence";
import type { ResolvedPremiumPolishProfile } from "@/lib/premium-polish-settings";

const TEXT_PRESERVATION_BLOCK = `TYPOGRAPHY & BRANDING (non-negotiable):
- Never redraw, translate, regenerate, or morph on-screen text, logos, UI, or speech bubbles.
- Stabilize text/logo/UI regions; animate mascots, products, faces, hands, and foreground subjects only.`;

/** @deprecated Verbose stack — use buildCompactViduMotionPrompt via this export. */
export { TEXT_PRESERVATION_BLOCK };

/**
 * Compact premium polish for Vidu (replaces verbose multi-block stack).
 */
export function buildPremiumPolishViduPromptBlocks(
  profile: ResolvedPremiumPolishProfile,
  options?: {
    sceneIntelligence?: SceneIntelligenceSnapshot | null;
    transitionOrder?: number;
    transitionTotal?: number;
    userIntent?: string | null;
  }
): string {
  return buildCompactViduMotionPrompt(profile, options);
}
