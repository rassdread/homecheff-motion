/**
 * S.7C — Character-linked voice variants (not separate identities).
 * Variants remain owned by Character; casting may select a variant for a role.
 */

import type { StudioVoiceEmotion } from "@/lib/studio-voice-emotion";

export const STUDIO_VOICE_VARIANT_IDS = [
  "default",
  "happy",
  "angry",
  "whisper",
  "narrator",
  "commercial",
  "story",
] as const;

export type StudioVoiceVariantId = (typeof STUDIO_VOICE_VARIANT_IDS)[number];

export type StudioVoiceVariant = {
  id: StudioVoiceVariantId;
  /** Always the owning Character id */
  characterId: string;
  label: string;
  emotionHint: StudioVoiceEmotion | null;
  /** Optional overlay on base Character voiceProfile — never replaces locked identity silently */
  voiceProfileOverlay: string | null;
  speakingSpeed: number | null;
  pitch: number | null;
  energy: string | null;
};

const VARIANT_DEFAULTS: Record<
  StudioVoiceVariantId,
  { label: string; emotionHint: StudioVoiceEmotion | null }
> = {
  default: { label: "Default", emotionHint: "neutral" },
  happy: { label: "Happy", emotionHint: "happy" },
  angry: { label: "Angry", emotionHint: "angry" },
  whisper: { label: "Whisper", emotionHint: "calm" },
  narrator: { label: "Narrator", emotionHint: "storytelling" },
  commercial: { label: "Commercial", emotionHint: "motivational" },
  story: { label: "Story", emotionHint: "storytelling" },
};

export function isStudioVoiceVariantId(value: string | null | undefined): value is StudioVoiceVariantId {
  return Boolean(value && (STUDIO_VOICE_VARIANT_IDS as readonly string[]).includes(value));
}

/** Canonical set of variants for one Character — all linked to the same identity. */
export function buildCharacterVoiceVariants(characterId: string): StudioVoiceVariant[] {
  return STUDIO_VOICE_VARIANT_IDS.map((id) => ({
    id,
    characterId,
    label: VARIANT_DEFAULTS[id].label,
    emotionHint: VARIANT_DEFAULTS[id].emotionHint,
    voiceProfileOverlay: null,
    speakingSpeed: null,
    pitch: null,
    energy: null,
  }));
}

export function resolveCharacterVoiceVariant(
  characterId: string,
  variantId: string | null | undefined
): StudioVoiceVariant {
  const id = isStudioVoiceVariantId(variantId) ? variantId : "default";
  return buildCharacterVoiceVariants(characterId).find((v) => v.id === id)!;
}
