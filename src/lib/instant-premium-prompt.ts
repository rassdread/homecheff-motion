export type InstantPremiumStylePreset = "food_promo" | "clean_business" | "social_boost";

export type InstantPremiumAspectRatio = "9:16" | "16:9";

export type InstantPremiumDurationSeconds = 8 | 15;
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
import { POSTER_MOTION_PRESERVE_PROMPT_BLOCK } from "@/lib/poster-motion-preserve";
import {
  buildPremiumMotionPromptBlocks,
  type PremiumMotionProfile,
  premiumMotionProfileFromPosterSettings,
} from "@/lib/premium-motion-engine";
import {
  filterVisualOnlyChips,
  LOCKED_TEXT_SAFETY_BLOCK,
  isTextImplyingChipId,
} from "@/lib/locked-text-layer";

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
    chipLines.length > 0 ? chipLines.map((l) => `- ${l}`).join("\n") : "(none — rely on defaults above.)";

  const intentTrimmed = input.userIntent?.trim() ?? "";
  const intentBlock =
    intentTrimmed.length > 0
      ? intentTrimmed
      : "(none — follow defaults and chip directions only.)";
  const continuityStrength = normalizeInstantPremiumContinuityStrength(input.continuityStrength);
  const continuityLine =
    continuityStrength === "strict"
      ? "Continuity priority: strict. Keep one unbroken evolving shot language across all keyframes."
      : "Continuity priority: balanced. Keep a coherent flow while allowing subtle style variation.";

  const motionProfile =
    input.motionProfile ?? premiumMotionProfileFromPosterSettings(undefined);
  const premiumMotionBlock = buildPremiumMotionPromptBlocks(motionProfile);

  return `Create one continuous premium short-form video using the provided images in their exact uploaded order as keyframes. Output format: ${input.aspectRatio}. Total duration: ${input.duration} seconds.

Treat this as a single evolving visual story, not separate scenes. No hard cuts between images.

Preserve the same subject identity, environment feeling, lighting direction, and camera language across the full sequence. Avoid unrealistic warping or sudden style jumps.

Apply smooth cinematic motion with natural temporal continuity from one keyframe to the next.

Style direction:
${styleLine}

Additional motion direction:
${chipBlock}

Continuity control:
${continuityLine}

User intent:
${intentBlock}

If user intent is present, subtly incorporate it without breaking realism or consistency.

Maintain balanced pacing and a coherent flow. Avoid static sections, chaotic motion, and abrupt resets.

The final result should feel like a polished, premium, ready-to-use social media video.

${premiumMotionBlock}${
    input.posterMotionActive || (input.textRenderMode && usesPosterMotionPreserve(input.textRenderMode))
      ? `

${POSTER_MOTION_PRESERVE_PROMPT_BLOCK}`
      : ""
  }${
    input.lockedTextMode !== false && !input.posterMotionActive
      ? `

${LOCKED_TEXT_SAFETY_BLOCK}`
      : ""
  }${
    input.bakedTextProtectionActive &&
    input.textRenderMode &&
    usesCriticalTypographyPrompt(input.textRenderMode)
      ? `

${DEEVID_CRITICAL_TYPOGRAPHY_PROMPT_BLOCK}`
      : input.hybridOverlayActive
        ? `

${HYBRID_NO_TYPOGRAPHY_PROMPT_BLOCK}`
        : input.bakedTextProtectionActive
          ? `

${BAKED_TEXT_CLEANED_PROMPT_BLOCK}`
          : ""
  }`;
}

export function instantPremiumTransitionSegmentHint(params: {
  transitionOrder: number;
  transitionTotal: number;
  imageCount: number;
}): string {
  const { transitionOrder, transitionTotal, imageCount } = params;
  const from = transitionOrder + 1;
  const to = transitionOrder + 2;
  return `This segment is keyframe transition ${transitionOrder + 1} of ${transitionTotal}, connecting image ${from} to image ${to} out of ${imageCount}. Continue directly from the previous motion state and prepare seamlessly for the next one, without looking like a standalone clip.`;
}
