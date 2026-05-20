/**
 * Vidu prompt — Premium Comic-Strip Engine (smooth strip world transitions).
 * Multi-image → one continuous animated world. Compact for Vidu limits.
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

const COMIC_STRIP_CORE_LINE =
  "One world, one story, one flow — natural acting; cinematic depth, light, motion, and atmosphere; emotion in every moment.";

const COMIC_STRIP_AVOID_LINE =
  "Avoid: hard cuts, static motion, text popping in/out, no transitions, slideshow feeling.";

/**
 * Six bridges — order matches infographic example (character → camera → light → particle …).
 */
const TRANSITION_BRIDGES = [
  "character bridge — characters move or look toward the next scene and lead the viewer",
  "camera push/pan — camera moves forward, pans, or turns to reveal the next scene",
  "light sweep — glow, sweep, or flash carries into the next scene",
  "particle bridge — particles, sparkles, or energy carry flow into the next scene",
  "foreground pass — object or foreground element passes close to the camera",
  "parallax depth — layers move at different speeds for natural depth",
] as const;

/** Rotating acting beats — “what to show” panel (no “expressive” — dedupe sig). */
const ACTING_BEATS = [
  "happy or excited — bright smile, alive eyes",
  "curious or interested — raised eyebrows, attentive look",
  "surprised or amazed — wide eyes, open mouth",
  "thinking or focused — subtle look, eye tracking",
  "laughing or joyful — natural laugh, relaxed face",
  "encouraging or engaging — speaking energy, welcoming gesture",
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

export function pickComicStripActingBeat(transitionOrder: number): string {
  return ACTING_BEATS[transitionOrder % ACTING_BEATS.length]!;
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
    const acting = pickComicStripActingBeat(transitionOrder);
    return deduplicatePromptText(
      [
        "PREMIUM COMIC-STRIP ENGINE (smooth strip world transitions):",
        COMIC_STRIP_CORE_LINE,
        "Merge: smooth transitions only — same comic style, line work, lighting, spatial logic; cinematic flow frame to frame.",
        "Performance: eye tracking, anticipation, micro-expressions; smooth body motion.",
        `Acting this segment: ${acting}.`,
        `Bridge: ${bridge}.`,
        COMIC_STRIP_AVOID_LINE,
      ].join("\n")
    );
  }

  return deduplicatePromptText(
    [
      "MULTI-IMAGE FLOW (lighter merge):",
      "Use camera moves, light sweeps, or object passes when fitting.",
      `Bridge: ${bridge}; one continuous world — no hard cuts.`,
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
  const bridgeLabel = pickComicStripTransitionBridge(params.transitionOrder).split(" — ")[0]!;
  const goal =
    shouldUseFullComicStripMode(params.animationStyleId) ?
      "Cinematic flow — segment leads into the next; world stays alive."
    : "Natural merge into next keyframe.";
  const acting =
    shouldUseFullComicStripMode(params.animationStyleId) ?
      ` Acting: ${pickComicStripActingBeat(params.transitionOrder).split(" — ")[0]}.`
    : "";
  return `${goal} Bridge: ${bridgeLabel}.${acting}`;
}
