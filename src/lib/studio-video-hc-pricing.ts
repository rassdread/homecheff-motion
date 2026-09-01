import { STUDIO_NL_HC_ACTION_TARGETS } from "@/lib/studio-nl-b2c-catalog";
import { resolveAuthoritativeHcForAction } from "@/server/studio-account/hc-central-adapter";

/** Legacy preset estimate (~60 SC for 5s@720p standard). */
export function legacyMotionRenderCreditsEstimate(estimatedCredits: number): number {
  return estimatedCredits;
}

/** When central HC ready, return certified 80 HC for 5s 720p turbo action. */
export function motionRenderAuthoritativeCredits(legacyEstimate: number): number {
  const hc = resolveAuthoritativeHcForAction("motion_render_5s_720p_turbo");
  if (hc != null) return hc;
  return legacyMotionRenderCreditsEstimate(legacyEstimate);
}

export const VIDEO_HC_TARGET = STUDIO_NL_HC_ACTION_TARGETS.motion_render_5s_720p_turbo;
