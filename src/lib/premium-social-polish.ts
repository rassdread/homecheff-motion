/**
 * Social / TikTok polish — engagement timing when preset identity allows.
 */

import type { AnimationStyleId } from "@/lib/animation-style-types";
import { getAnimationStyleIdentity } from "@/lib/animation-style-identity";
import type { MotionEnergy } from "@/lib/premium-motion-engine";
import type { MotionVariationSegmentPhase } from "@/lib/premium-motion-variation";

const SOCIAL_STYLES: ReadonlySet<AnimationStyleId> = new Set([
  "cartoon_animation",
  "fast_social_animation",
  "character_animation",
  "marketplace_story",
]);

export function shouldApplySocialPolish(animationStyleId: AnimationStyleId): boolean {
  return SOCIAL_STYLES.has(animationStyleId);
}

export function buildSocialPolishBlock(params: {
  animationStyleId: AnimationStyleId;
  motionEnergy: MotionEnergy;
  segmentPhase: MotionVariationSegmentPhase;
}): string {
  if (!shouldApplySocialPolish(params.animationStyleId)) {
    return "";
  }

  const cinematic = getAnimationStyleIdentity(params.animationStyleId).cinematic;
  const parts: string[] = [
    `SOCIAL / TIKTOK POLISH (${cinematic.pacingLabel}):`,
    "- Subtle timing accents on hook beats — energy spike then settle, not chaotic jitter.",
    "- Creator-style pacing: presentation rhythm readable in 3–5 second social loops.",
    "- Scene emphasis: foreground subject pops on beat; background stays atmospheric.",
  ];

  if (params.animationStyleId === "fast_social_animation") {
    parts.push(
      "- Fast social: scroll-stopping micro-beat at segment start — punchy expression + gesture, then breathe."
    );
  } else if (params.animationStyleId === "cartoon_animation") {
    parts.push("- Comic social: playful beat accents sync with mascot presentation energy.");
  } else if (params.animationStyleId === "marketplace_story") {
    parts.push("- Community story: warm engagement rhythm — inviting, not hype-chaotic.");
  }

  if (params.segmentPhase === "opening") {
    parts.push("Hook emphasis: strongest social energy in first 1–2 seconds of this segment.");
  }

  if (params.motionEnergy === "viral" || params.motionEnergy === "energetic") {
    parts.push("Energy tier: allow slightly stronger accent timing — still brand-safe and smooth.");
  }

  return parts.join("\n");
}
