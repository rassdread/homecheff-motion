/**
 * Premium motion engine — Phase 1 direction layer for Vidu prompts.
 * Vidu segments remain primary; this module only shapes generation quality.
 */

export type MotionEnergy = "calm" | "cinematic" | "expressive" | "energetic" | "viral";

export const MOTION_ENERGY_LEVELS: readonly MotionEnergy[] = [
  "calm",
  "cinematic",
  "expressive",
  "energetic",
  "viral",
] as const;

export const DEFAULT_MOTION_ENERGY: MotionEnergy = "expressive";

/** Character / mascot acting direction passed into Vidu prompts. */
export type CharacterMotionProfile = {
  emotion?: string;
  energy?: string;
  personality?: string;
  motionStyle?: string;
};

export type PremiumMotionProfile = {
  motionEnergy: MotionEnergy;
  characterMotion?: CharacterMotionProfile;
};

/** Non-negotiable pipeline rules (matches final-assembly + poster preserve). */
export const PREMIUM_MOTION_PIPELINE = {
  primarySource: "vidu_segments" as const,
  assemblyDefault: "raw_motion_concat" as const,
  useRawAnimatedSegments: true,
  preserveViduMotion: true,
  compositorMode: "minimal" as const,
  allowPosterOverlay: false,
  allowStaticFallbackTimeline: false,
  allowFullFrameBlend: false,
  allowHeavyZoompan: false,
  allowOcrRedraw: false,
  foregroundPriority: ["mascot", "face", "hands", "featured_product"] as const,
  stabilizeOnly: ["ocr_text", "logo", "ui_panel"] as const,
};

const MOTION_ENERGY_PROMPTS: Record<MotionEnergy, string> = {
  calm:
    "Keep motion gentle and restrained: slow breathing, micro-expressions, minimal gesture amplitude. Premium calm social ad pacing.",
  cinematic:
    "Cinematic acting: measured gestures, smooth weight shifts, film-like timing with anticipation and follow-through. Elegant, not flashy.",
  expressive:
    "Expressive mascot/character performance: clear emotion, lively face and hands, presentation energy suitable for premium Reels/TikTok. Natural asymmetry in timing.",
  energetic:
    "High presentation energy: dynamic gestures, engaged expression, upbeat body language. Stay believable — no chaotic flailing or jitter.",
  viral:
    "Social-native energy: punchy gestures, strong expression, scroll-stopping presence. Still physically plausible and brand-safe.",
};

const SECONDARY_MOTION_BLOCK = `SECONDARY MOTION (premium acting):
- Include subtle blink cycles, breathing in chest/shoulders, natural head tilt, and eye line shifts.
- Add cloth/hair reactivity, light shoulder sway, and small weight shifts — not a frozen mannequin.
- Use anticipation before gestures and follow-through after — avoid robotic start/stop.
- Do NOT loop the same hand wave, smile, or sway cycle; vary timing and gesture shape across the clip.`;

const FOREGROUND_PRIORITY_BLOCK = `FOREGROUND PRIORITY:
- Prioritize alive motion on mascots, faces, hands, and hero products.
- Background may move subtly for depth; do not steal attention from the featured subject.
- Never freeze the face while only the background moves.`;

const EMOTIONAL_ACTING_BLOCK = `EMOTIONAL ACTING:
- Perform like a premium animated poster / social presenter, not a generic AI morph.
- Show readable emotion through posture, gaze, and gesture — cinematic acting cues.
- Avoid stiff, repetitive, or mechanical motion; favor organic variation and personality.`;

export function normalizeMotionEnergy(value: unknown): MotionEnergy {
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if ((MOTION_ENERGY_LEVELS as readonly string[]).includes(v)) {
      return v as MotionEnergy;
    }
  }
  return DEFAULT_MOTION_ENERGY;
}

export function parseCharacterMotionProfile(raw: unknown): CharacterMotionProfile | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const o = raw as Record<string, unknown>;
  const emotion = typeof o.emotion === "string" ? o.emotion.trim() : "";
  const energy = typeof o.energy === "string" ? o.energy.trim() : "";
  const personality = typeof o.personality === "string" ? o.personality.trim() : "";
  const motionStyle = typeof o.motionStyle === "string" ? o.motionStyle.trim() : "";
  if (!emotion && !energy && !personality && !motionStyle) {
    return undefined;
  }
  return {
    ...(emotion ? { emotion } : {}),
    ...(energy ? { energy } : {}),
    ...(personality ? { personality } : {}),
    ...(motionStyle ? { motionStyle } : {}),
  };
}

/** Parse motion profile from poster settings JSON or create payload fields. */
export function parsePremiumMotionProfile(raw: unknown): PremiumMotionProfile {
  if (!raw || typeof raw !== "object") {
    return { motionEnergy: DEFAULT_MOTION_ENERGY };
  }
  const o = raw as Record<string, unknown>;
  const motionEnergy = normalizeMotionEnergy(o.motionEnergy);
  const characterMotion =
    parseCharacterMotionProfile(o.characterMotion) ??
    parseCharacterMotionProfile(o.characterMotionDirection);
  return {
    motionEnergy,
    ...(characterMotion ? { characterMotion } : {}),
  };
}

/** Build profile from stored poster motion settings (instant projects). */
export function premiumMotionProfileFromPosterSettings(
  posterMotionSettings: unknown
): PremiumMotionProfile {
  return parsePremiumMotionProfile(posterMotionSettings);
}

export function buildCharacterMotionDirectionBlock(profile?: CharacterMotionProfile): string {
  if (!profile) {
    return "";
  }
  const lines: string[] = [];
  if (profile.personality) {
    lines.push(`Personality: ${profile.personality}`);
  }
  if (profile.emotion) {
    lines.push(`Emotion: ${profile.emotion}`);
  }
  if (profile.energy) {
    lines.push(`Performance energy: ${profile.energy}`);
  }
  if (profile.motionStyle) {
    lines.push(`Motion style: ${profile.motionStyle}`);
  }
  if (lines.length === 0) {
    return "";
  }
  return `CHARACTER MOTION DIRECTION:\n${lines.map((l) => `- ${l}`).join("\n")}`;
}

export function buildPremiumMotionPromptBlocks(profile: PremiumMotionProfile): string {
  const parts: string[] = [
    "PREMIUM MOTION ENGINE (Vidu performance layer):",
    MOTION_ENERGY_PROMPTS[profile.motionEnergy],
    SECONDARY_MOTION_BLOCK,
    FOREGROUND_PRIORITY_BLOCK,
    EMOTIONAL_ACTING_BLOCK,
  ];
  const characterBlock = buildCharacterMotionDirectionBlock(profile.characterMotion);
  if (characterBlock) {
    parts.push(characterBlock);
  }
  return parts.join("\n\n");
}

/** Per-segment hint to reduce robotic repetition across a multi-image sequence. */
export function premiumMotionSegmentVariationHint(params: {
  transitionOrder: number;
  transitionTotal: number;
}): string {
  const { transitionOrder, transitionTotal } = params;
  const phase =
    transitionOrder === 0
      ? "opening beat — establish presence with a fresh gesture and expression."
      : transitionOrder >= transitionTotal - 1
        ? "closing beat — resolve energy with a distinct finishing gesture, not a repeat of earlier moves."
        : "mid-sequence beat — change gesture timing and facial emphasis; avoid repeating the prior segment's motion loop.";
  return `MOTION VARIATION (segment ${transitionOrder + 1}/${transitionTotal}): ${phase}`;
}
