import type { CharacterMotionProfile } from "@/lib/premium-motion-engine";
import type { MotionEnergy } from "@/lib/premium-motion-engine";

/** Emotional acting presets — shapes Vidu character direction without changing assembly. */
export type EmotionalActingPresetId =
  | "excited_seller"
  | "playful_mascot"
  | "confident_presenter"
  | "energetic_creator"
  | "luxury_showcase"
  | "dramatic_comic_reveal";

export const EMOTIONAL_ACTING_PRESET_IDS: readonly EmotionalActingPresetId[] = [
  "excited_seller",
  "playful_mascot",
  "confident_presenter",
  "energetic_creator",
  "luxury_showcase",
  "dramatic_comic_reveal",
] as const;

export const DEFAULT_EMOTIONAL_ACTING_PRESET: EmotionalActingPresetId = "confident_presenter";

export type EmotionalActingPresetConfig = {
  id: EmotionalActingPresetId;
  labelKey: string;
  descriptionKey: string;
  motionEnergy: MotionEnergy;
  characterMotion: CharacterMotionProfile;
  actingPromptBlock: string;
};

export const EMOTIONAL_ACTING_PRESETS: Record<
  EmotionalActingPresetId,
  EmotionalActingPresetConfig
> = {
  excited_seller: {
    id: "excited_seller",
    labelKey: "instant.emotional.excitedSeller.title",
    descriptionKey: "instant.emotional.excitedSeller.desc",
    motionEnergy: "energetic",
    characterMotion: {
      emotion: "excited and welcoming",
      personality: "enthusiastic marketplace seller",
      energy: "high presentation energy",
      motionStyle: "expressive sales host with varied gestures",
    },
    actingPromptBlock: `EXCITED SELLER ACTING:
- Bright eyes, open posture, inviting hand gestures toward product or audience.
- Vary gesture timing; avoid repeating the same wave or nod loop.
- Keep speech bubbles, price tags, and logos perfectly static.`,
  },
  playful_mascot: {
    id: "playful_mascot",
    labelKey: "instant.emotional.playfulMascot.title",
    descriptionKey: "instant.emotional.playfulMascot.desc",
    motionEnergy: "expressive",
    characterMotion: {
      emotion: "playful and cheerful",
      personality: "friendly brand mascot",
      energy: "bouncy but controlled",
      motionStyle: "cartoon presenter with personality",
    },
    actingPromptBlock: `PLAYFUL MASCOT ACTING:
- Light bounce in body, asymmetric head tilt, spontaneous micro-gestures.
- Blink and eye-line shifts; shoulders and cloth react to motion.
- Never stiff looping sway; each beat should feel fresh.`,
  },
  confident_presenter: {
    id: "confident_presenter",
    labelKey: "instant.emotional.confidentPresenter.title",
    descriptionKey: "instant.emotional.confidentPresenter.desc",
    motionEnergy: "expressive",
    characterMotion: {
      emotion: "confident and assured",
      personality: "premium presenter",
      energy: "steady professional charisma",
      motionStyle: "cinematic host with clear body language",
    },
    actingPromptBlock: `CONFIDENT PRESENTER ACTING:
- Grounded stance, deliberate gestures, steady gaze with subtle expression changes.
- Presentation energy without chaotic flailing; premium affiliate ad tone.`,
  },
  energetic_creator: {
    id: "energetic_creator",
    labelKey: "instant.emotional.energeticCreator.title",
    descriptionKey: "instant.emotional.energeticCreator.desc",
    motionEnergy: "viral",
    characterMotion: {
      emotion: "energetic and engaging",
      personality: "social creator / UGC host",
      energy: "scroll-stopping",
      motionStyle: "TikTok-native creator energy",
    },
    actingPromptBlock: `ENERGETIC CREATOR ACTING:
- Punchy gestures, expressive face, creator-style pacing — still physically plausible.
- Prioritize face and hands; background stays secondary.`,
  },
  luxury_showcase: {
    id: "luxury_showcase",
    labelKey: "instant.emotional.luxuryShowcase.title",
    descriptionKey: "instant.emotional.luxuryShowcase.desc",
    motionEnergy: "cinematic",
    characterMotion: {
      emotion: "refined and aspirational",
      personality: "luxury brand showcase",
      energy: "elegant restraint",
      motionStyle: "premium slow-motion presenter",
    },
    actingPromptBlock: `LUXURY SHOWCASE ACTING:
- Measured gestures, soft breathing, minimal but expressive micro-motion on face.
- Cinematic timing with anticipation; no jitter or aggressive camera shake.`,
  },
  dramatic_comic_reveal: {
    id: "dramatic_comic_reveal",
    labelKey: "instant.emotional.dramaticComicReveal.title",
    descriptionKey: "instant.emotional.dramaticComicReveal.desc",
    motionEnergy: "expressive",
    characterMotion: {
      emotion: "dramatic surprise",
      personality: "comic panel character",
      energy: "impact beat",
      motionStyle: "manga dramatic reveal",
    },
    actingPromptBlock: `DRAMATIC COMIC REVEAL ACTING:
- One clear impact pose per beat; speed-line energy on subject only.
- Typography and speech bubbles remain frozen; panel layout unchanged.`,
  },
};

export function isEmotionalActingPresetId(value: string): value is EmotionalActingPresetId {
  return (EMOTIONAL_ACTING_PRESET_IDS as readonly string[]).includes(value);
}

export function normalizeEmotionalActingPresetId(
  value: unknown
): EmotionalActingPresetId | undefined {
  if (typeof value === "string" && isEmotionalActingPresetId(value.trim())) {
    return value.trim() as EmotionalActingPresetId;
  }
  return undefined;
}

export function getEmotionalActingPreset(
  id: EmotionalActingPresetId
): EmotionalActingPresetConfig {
  return EMOTIONAL_ACTING_PRESETS[id] ?? EMOTIONAL_ACTING_PRESETS.confident_presenter;
}

export function buildEmotionalActingPromptBlock(
  presetId: EmotionalActingPresetId | undefined
): string {
  if (!presetId) {
    return "";
  }
  return EMOTIONAL_ACTING_PRESETS[presetId]?.actingPromptBlock ?? "";
}
