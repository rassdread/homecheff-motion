export type InstantPremiumStylePreset = "food_promo" | "clean_business" | "social_boost";

export type InstantPremiumAspectRatio = "9:16" | "16:9";

export type InstantPremiumDurationSeconds = number;
export type InstantPremiumContinuityStrength = "balanced" | "strict";

/** Stable ids sent from client / stored in DB */
import { BAKED_TEXT_CLEANED_PROMPT_BLOCK } from "@/lib/baked-text-protection";
import {
  DEEVID_CRITICAL_TYPOGRAPHY_PROMPT_BLOCK,
  HYBRID_NO_TYPOGRAPHY_PROMPT_BLOCK,
  type TextRenderMode,
  usesCriticalTypographyPrompt,
  usesPosterMotionPreserve,
} from "@/lib/hybrid-motion-overlay";
import { premiumMotionProfileFromPosterSettings } from "@/lib/premium-motion-engine";
import { buildCompactViduMotionPrompt, buildCompactInstantStoryBlock } from "@/lib/vidu-prompt-budget";
import {
  buildComicStripSegmentBridgeHint,
  COMIC_STRIP_POWER_LINE,
  shouldUseComicStripWorldTransitions,
} from "@/lib/vidu-comic-strip-transitions";
import { buildExactFrameContinuationPromptLine } from "@/lib/exact-frame-continuity";
import type { AnimationStyleId } from "@/lib/animation-style-types";
import {
  parsePremiumPolishSettings,
  resolvePremiumPolishProfile,
} from "@/lib/premium-polish-settings";
import type { PremiumMotionProfile } from "@/lib/premium-motion-engine";
import {
  filterVisualOnlyChips,
  LOCKED_TEXT_SAFETY_BLOCK,
  isTextImplyingChipId,
} from "@/lib/locked-text-layer";
import type { InstantSceneText } from "@/lib/story-overlay-templates";
import { heroSourceText, normalizeSceneText } from "@/lib/story-overlay-templates";

export type InstantPremiumChipId =
  | "slow_zoom_in"
  | "cinematic_soft"
  | "subtle_pan"
  | "close_up_focus"
  | "focus_details"
  | "subject_centered"
  | "food_appetizing"
  | "more_dynamic"
  | "ai_decide";

export const INSTANT_PREMIUM_CHIP_IDS: readonly InstantPremiumChipId[] = [
  "slow_zoom_in",
  "cinematic_soft",
  "subtle_pan",
  "close_up_focus",
  "focus_details",
  "subject_centered",
  "food_appetizing",
  "more_dynamic",
  "ai_decide",
] as const;

export { isTextImplyingChipId, LOCKED_TEXT_SAFETY_BLOCK, filterVisualOnlyChips };

export const INSTANT_PREMIUM_STYLE_LABELS: Record<InstantPremiumStylePreset, string> = {
  food_promo: "Food Promo",
  clean_business: "Clean Business",
  social_boost: "Social Boost",
};

const STYLE_PROMPTS: Record<InstantPremiumStylePreset, string> = {
  food_promo:
    "Use a warm cinematic food style with soft lighting, appetizing tones, and a premium homemade feel.",
  clean_business:
    "Use a clean, minimal, modern style with smooth motion and professional pacing.",
  social_boost:
    "Use a slightly more dynamic and energetic style while staying controlled and premium.",
};

const CHIP_INSTRUCTIONS: Record<InstantPremiumChipId, string> = {
  slow_zoom_in: "Apply a slow, smooth zoom-in on each scene.",
  cinematic_soft:
    "Use gentle cinematic camera motion with subtle zoom and soft parallax.",
  subtle_pan: "Apply a subtle horizontal camera pan to create natural movement.",
  close_up_focus: "Emphasize close-up framing and focus on key elements.",
  focus_details: "Highlight fine details and textures.",
  subject_centered: "Keep the main subject centered and clearly visible.",
  food_appetizing:
    "Enhance food visuals with warmth, freshness, and texture emphasis.",
  more_dynamic:
    "Increase pacing slightly with more noticeable motion while staying smooth.",
  ai_decide: "",
};

export function isInstantPremiumChipId(value: string): value is InstantPremiumChipId {
  return (INSTANT_PREMIUM_CHIP_IDS as readonly string[]).includes(value) && !isTextImplyingChipId(value);
}

export function isInstantPremiumStylePreset(value: string): value is InstantPremiumStylePreset {
  return value === "food_promo" || value === "clean_business" || value === "social_boost";
}

export function chipInstructionLines(chipIds: string[]): string[] {
  const lines: string[] = [];
  for (const id of chipIds) {
    if (!isInstantPremiumChipId(id)) {
      continue;
    }
    const text = CHIP_INSTRUCTIONS[id].trim();
    if (text) {
      lines.push(text);
    }
  }
  return lines;
}

export type BuildInstantVideoPromptInput = {
  stylePreset: InstantPremiumStylePreset;
  duration: InstantPremiumDurationSeconds;
  aspectRatio: InstantPremiumAspectRatio;
  userIntent: string | null;
  selectedChips: string[];
  continuityStrength?: InstantPremiumContinuityStrength;
  /** When true (default for instant premium), append Vidu text-safety rules. */
  lockedTextMode?: boolean;
  /** When true, source images had baked-in text masked before Vidu. */
  bakedTextProtectionActive?: boolean;
  /** Hybrid overlay pipeline: scene-only AI + post reprojection. */
  hybridOverlayActive?: boolean;
  /** DeeVid-style / text-safe: critical Vidu typography rules. */
  textRenderMode?: TextRenderMode;
  /** Poster base preserved; Vidu animates foreground only. */
  posterMotionActive?: boolean;
  /** Phase 1 premium motion direction (defaults to expressive). */
  motionProfile?: PremiumMotionProfile;
  /** Full premium polish profile (preset, camera, FX, comic). */
  polishSettingsRaw?: unknown;
  /** Per-segment directing (multi-character focus cycle). */
  transitionOrder?: number;
  transitionTotal?: number;
  /** Segment B starts on same keyframe as segment A ended — continuation mode. */
  exactFrameContinuation?: boolean;
};

const CONTINUITY_MARKER_RE = /^\[hc_continuity:(balanced|strict)\]\s*\n?/i;

export function normalizeInstantPremiumContinuityStrength(
  value: unknown
): InstantPremiumContinuityStrength {
  return value === "strict" ? "strict" : "balanced";
}

export function composeStoredInstantUserIntent(params: {
  continuityStrength: InstantPremiumContinuityStrength;
  text: string;
}): string {
  const marker = `[hc_continuity:${params.continuityStrength}]`;
  const clean = params.text.trim();
  return clean ? `${marker}\n${clean}` : marker;
}

export function parseStoredInstantUserIntent(raw: string | null | undefined): {
  continuityStrength: InstantPremiumContinuityStrength;
  text: string;
} {
  const input = raw?.trim() ?? "";
  if (!input) {
    return { continuityStrength: "balanced", text: "" };
  }
  const match = input.match(CONTINUITY_MARKER_RE);
  if (!match) {
    return { continuityStrength: "balanced", text: input };
  }
  const continuityStrength = normalizeInstantPremiumContinuityStrength(match[1]?.toLowerCase());
  const text = input.replace(CONTINUITY_MARKER_RE, "").trim();
  return { continuityStrength, text };
}

/**
 * Single structured prompt for instant premium multi-image video (used as base for each transition segment).
 */
export function buildInstantVideoPrompt(input: BuildInstantVideoPromptInput): string {
  const styleLine = STYLE_PROMPTS[input.stylePreset];
  const visualChips = filterVisualOnlyChips(input.selectedChips);
  const chipLines = chipInstructionLines(visualChips);
  const chipBlock =
    chipLines.length > 0 ? chipLines.map((l) => `- ${l}`).join(" ") : "(none — rely on defaults above.)";

  const intentTrimmed = input.userIntent?.trim() ?? "";
  const intentBlock =
    intentTrimmed.length > 0
      ? intentTrimmed
      : "(none — follow defaults and chip directions only.)";
  const continuityStrength = normalizeInstantPremiumContinuityStrength(input.continuityStrength);
  const continuityLine =
    continuityStrength === "strict"
      ? "Strict continuity across keyframes."
      : "Balanced continuity with subtle variation.";

  const polishProfile = resolvePremiumPolishProfile(
    input.polishSettingsRaw ?? input.motionProfile
  );
  const motionProfile =
    input.motionProfile ??
    premiumMotionProfileFromPosterSettings(input.polishSettingsRaw);
  const parsedPolish = parsePremiumPolishSettings(input.polishSettingsRaw);
  const premiumMotionBlock = buildCompactViduMotionPrompt(
    {
      ...polishProfile,
      motionEnergy: motionProfile.motionEnergy,
      characterMotion: motionProfile.characterMotion ?? polishProfile.characterMotion,
    },
    {
      sceneIntelligence: parsedPolish.sceneIntelligence,
      transitionOrder: input.transitionOrder,
      transitionTotal: input.transitionTotal,
      userIntent: input.userIntent,
      exactFrameContinuation: input.exactFrameContinuation,
    }
  );

  const storyBlock = buildCompactInstantStoryBlock({
    aspectRatio: input.aspectRatio,
    duration: input.duration,
    styleLine,
    chipSummary: chipBlock,
    continuityLine,
    userIntent: intentBlock,
  });

  const usePosterPreserve =
    input.posterMotionActive || (input.textRenderMode && usesPosterMotionPreserve(input.textRenderMode));

  const tailBlocks: string[] = [];
  if (!usePosterPreserve && input.lockedTextMode !== false) {
    tailBlocks.push(LOCKED_TEXT_SAFETY_BLOCK.split("\n").slice(0, 3).join("\n"));
  }
  if (
    input.bakedTextProtectionActive &&
    input.textRenderMode &&
    usesCriticalTypographyPrompt(input.textRenderMode)
  ) {
    tailBlocks.push(DEEVID_CRITICAL_TYPOGRAPHY_PROMPT_BLOCK.split("\n").slice(0, 4).join("\n"));
  } else if (input.hybridOverlayActive) {
    tailBlocks.push(HYBRID_NO_TYPOGRAPHY_PROMPT_BLOCK.split("\n").slice(0, 3).join("\n"));
  } else if (input.bakedTextProtectionActive) {
    tailBlocks.push(BAKED_TEXT_CLEANED_PROMPT_BLOCK.split("\n").slice(0, 3).join("\n"));
  }

  const transitionTotal = Math.max(1, input.transitionTotal ?? 1);
  const powerLine =
    shouldUseComicStripWorldTransitions(polishProfile.animationStyleId, transitionTotal) ?
      COMIC_STRIP_POWER_LINE
    : "";

  return [storyBlock, premiumMotionBlock, ...tailBlocks, powerLine].filter(Boolean).join("\n\n");
}

export type BuildInstantStoryModePromptInput = {
  userIntent: string | null;
  imageCount: number;
  sceneTexts: InstantSceneText[];
  transitionSeconds: number;
  stylePreset?: InstantPremiumStylePreset;
};

/**
 * Single Vidu multiframe prompt — scene titles are narrative context only, never rendered in-video.
 */
export function buildInstantStoryModePrompt(input: BuildInstantStoryModePromptInput): string {
  const styleLine =
    input.stylePreset && isInstantPremiumStylePreset(input.stylePreset) ?
      STYLE_PROMPTS[input.stylePreset]
    : STYLE_PROMPTS.food_promo;

  const sceneLines: string[] = [];
  for (let i = 0; i < input.imageCount; i += 1) {
    const scene = normalizeSceneText(input.sceneTexts[i]);
    const parts: string[] = [];
    const hero = heroSourceText(scene);
    if (hero) {
      parts.push(`story beat: ${hero}`);
    }
    if (scene.title) {
      parts.push(`title context: ${scene.title}`);
    }
    if (scene.subtitle) {
      parts.push(`subtitle context: ${scene.subtitle}`);
    }
    const context =
      parts.length > 0 ? parts.join("; ") : "visual continuity from the keyframe only";
    sceneLines.push(`Scene ${i + 1}: ${context}`);
  }

  const intentBlock =
    input.userIntent?.trim() ?
      `User direction: ${input.userIntent.trim()}`
    : "Follow cinematic defaults and preserve subject identity across all keyframes.";

  return [
    "Create one continuous cinematic vertical video using the uploaded images in the exact order as keyframes.",
    "Treat each image as a fixed visual anchor.",
    "Preserve the same characters, mascot identity, clothing, logo placement, body shape, colors, and visual style.",
    "Smoothly transition from image 1 to image 2, then image 2 to image 3, until the final image.",
    "Do not generate any visible text, letters, captions, subtitles, logos, UI words, or typography inside the video.",
    "Text overlays will be added after generation. Leave clean space for post-production captions.",
    "Keep motion cinematic, natural, and coherent.",
    "The full video should feel like one complete story from beginning to end.",
    styleLine,
    intentBlock,
    `Target pacing: approximately ${input.transitionSeconds} seconds per transition between keyframes.`,
    "Scene list (narrative context only — do not render these words as visible text):",
    ...sceneLines,
    LOCKED_TEXT_SAFETY_BLOCK.split("\n").slice(0, 4).join("\n"),
  ].join("\n\n");
}

export function instantPremiumTransitionSegmentHint(params: {
  transitionOrder: number;
  transitionTotal: number;
  imageCount: number;
  animationStyleId?: AnimationStyleId;
  exactFrameContinuation?: boolean;
}): string {
  const { transitionOrder, transitionTotal, imageCount } = params;
  const from = transitionOrder + 1;
  const to = transitionOrder + 2;
  const base = `Segment ${transitionOrder + 1}/${transitionTotal}: image ${from}→${to} of ${imageCount}. Continue prior motion; seamless next frame.`;
  const comicBridge =
    params.animationStyleId ?
      buildComicStripSegmentBridgeHint({
        animationStyleId: params.animationStyleId,
        transitionOrder,
        transitionTotal,
      })
    : "";
  const continuation =
    params.exactFrameContinuation ?
      buildExactFrameContinuationPromptLine("continuation")
    : "";
  return [base, comicBridge, continuation].filter(Boolean).join(" ");
}
