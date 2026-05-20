/**
 * Vidu prompt — smooth strip / comic-strip world transitions (multi-image → one flow).
 * Aligned with Premium Comic-Strip Engine infographic (compact for Vidu limits).
 */

import type { AnimationStyleId } from "@/lib/animation-style-types";
import { deduplicatePromptText } from "@/lib/vidu-prompt-budget";

/** Full comic-strip world merge — cartoon, character, marketplace, fast social. */
export const FULL_COMIC_STRIP_STYLE_IDS: readonly AnimationStyleId[] = [
  "cartoon_animation",
  "character_animation",
  "marketplace_story",
  "fast_social_animation",
];

const FULL_COMIC_STRIP_STYLES: ReadonlySet<AnimationStyleId> = new Set(FULL_COMIC_STRIP_STYLE_IDS);

/** Infographic “prompt power line” — appended last; avoid “expressive” (dedupe sig). */
export const COMIC_STRIP_POWER_LINE =
  "Make this a smooth, cinematic comic-strip animation where all images merge into one continuous world. Keep all text, UI and logos exactly as in the images. Animate characters with natural acting. Transitions must be fluid, creative and invisible. One world, one story, one flow.";

const COMIC_STRIP_AVOID_LINE =
  "Avoid: hard cuts, static or robotic motion, text popping in/out, no transitions, slideshow feeling.";

/** Six transition techniques — rotate per segment (infographic order). */
const TRANSITION_BRIDGES = [
  "camera push/pan — move forward, pan, or turn to reveal the next scene",
  "character bridge — characters walk, move, or look toward the next scene and lead the viewer",
  "light sweep — glow, sweep, or flash carries into the next scene",
  "foreground pass — object or foreground element passes close to the camera",
  "parallax depth — layers move at different speeds for natural depth",
  "particle bridge — particles, sparkles, or energy carry flow into the next scene",
] as const;

export function shouldUseComicStripWorldTransitions(
  _animationStyleId: AnimationStyleId,
  transitionTotal: number
): boolean {
  return transitionTotal > 1;
}

export function shouldUseFullComicStripMode(animationStyleId: AnimationStyleId): boolean {
  return FULL_COMIC_STRIP_STYLES.has(animationStyleId);
}

export function pickComicStripTransitionBridge(transitionOrder: number): string {
  return TRANSITION_BRIDGES[transitionOrder % TRANSITION_BRIDGES.length]!;
}

/** Compact world-merge block for multi-keyframe Vidu segments. */
export function buildComicStripWorldTransitionBlock(params: {
  animationStyleId: AnimationStyleId;
  transitionOrder: number;
  transitionTotal: number;
}): string {
  const { animationStyleId, transitionOrder, transitionTotal } = params;
  if (!shouldUseComicStripWorldTransitions(animationStyleId, transitionTotal)) {
    return "";
  }

  const bridge = pickComicStripTransitionBridge(transitionOrder);

  if (shouldUseFullComicStripMode(animationStyleId)) {
    return deduplicatePromptText(
      [
        "COMIC-STRIP WORLD (merge images into one continuous animated world):",
        "Transitions: smooth merges only — same comic style, line work, lighting; motion like a living comic-strip movie.",
        "Characters: natural acting, eye tracking, anticipation; smooth body motion, never frozen slides.",
        "World: environments evolve, not cut; natural perspective and parallax between layers.",
        `This segment bridge: ${bridge}.`,
        COMIC_STRIP_AVOID_LINE,
      ].join("\n")
    );
  }

  return deduplicatePromptText(
    [
      "MULTI-IMAGE FLOW (lighter merge):",
      `Prefer camera moves or object passes when fitting; bridge with ${bridge}.`,
      "One continuous world, consistent identity — no hard cuts.",
      COMIC_STRIP_AVOID_LINE,
    ].join("\n")
  );
}

/** Short segment tail hint (pairs with instantPremiumTransitionSegmentHint). */
export function buildComicStripSegmentBridgeHint(params: {
  animationStyleId: AnimationStyleId;
  transitionOrder: number;
  transitionTotal: number;
}): string {
  if (!shouldUseComicStripWorldTransitions(params.animationStyleId, params.transitionTotal)) {
    return "";
  }
  const bridge = pickComicStripTransitionBridge(params.transitionOrder);
  const goal =
    shouldUseFullComicStripMode(params.animationStyleId) ?
      "Segment flows into the next like a comic-strip movie; world stays alive."
    : "Natural merge into next keyframe.";
  return `${goal} Bridge: ${bridge.split(" — ")[0]}.`;
}
