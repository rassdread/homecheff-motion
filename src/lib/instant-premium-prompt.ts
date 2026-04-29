export type InstantPremiumStylePreset = "food_promo" | "clean_business" | "social_boost";

export type InstantPremiumAspectRatio = "9:16" | "16:9";

export type InstantPremiumDurationSeconds = 8 | 15;

/** Stable ids sent from client / stored in DB */
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
  return (INSTANT_PREMIUM_CHIP_IDS as readonly string[]).includes(value);
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
};

/**
 * Single structured prompt for instant premium multi-image video (used as base for each transition segment).
 */
export function buildInstantVideoPrompt(input: BuildInstantVideoPromptInput): string {
  const styleLine = STYLE_PROMPTS[input.stylePreset];
  const chipLines = chipInstructionLines(input.selectedChips);
  const chipBlock =
    chipLines.length > 0 ? chipLines.map((l) => `- ${l}`).join("\n") : "(none — rely on defaults above.)";

  const intentTrimmed = input.userIntent?.trim() ?? "";
  const intentBlock =
    intentTrimmed.length > 0
      ? intentTrimmed
      : "(none — follow defaults and chip directions only.)";

  return `Create a premium short-form video using the provided images in their exact uploaded order. Output format: ${input.aspectRatio}. Total duration: ${input.duration} seconds.

Use each image as a distinct scene with a clear structure:
- First image: strong visual hook
- Middle images: detail and context
- Final image: ending or call-to-action

Preserve all original subjects, faces, food, products, and composition. Do not distort or morph anything. Avoid unrealistic transformations.

Apply smooth cinematic motion and clean transitions. Keep motion natural and controlled.

Style direction:
${styleLine}

Additional motion direction:
${chipBlock}

User intent:
${intentBlock}

If user intent is present, subtly incorporate it without breaking realism or consistency.

Maintain balanced pacing. Avoid static or chaotic scenes.

The final result should feel like a polished, premium, ready-to-use social media video.`;
}

export function instantPremiumTransitionSegmentHint(params: {
  transitionOrder: number;
  transitionTotal: number;
  imageCount: number;
}): string {
  const { transitionOrder, transitionTotal, imageCount } = params;
  const from = transitionOrder + 1;
  const to = transitionOrder + 2;
  return `This segment connects scene ${from} to scene ${to} of ${imageCount} ordered images (${transitionOrder + 1} of ${transitionTotal} motion segments). Keep continuity with the overall arc and the instructions above.`;
}
