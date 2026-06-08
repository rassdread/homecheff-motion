/**
 * Voice direction hints from identity prefill — advisory only, no auto-select.
 */

import type { CharacterIdentityFormValues } from "@/lib/studio-character-identity-fields";
import { extractAccentHint, matchOutfitPreset } from "@/lib/studio-character-identity-prefill-matching";

export type CharacterVoiceHint = {
  direction: string;
  accentFilterHint?: string;
  personaHint?: string;
};

export function buildCharacterVoiceHintFromPrefill(
  prefill: Partial<CharacterIdentityFormValues>,
  haystack: string
): CharacterVoiceHint {
  const text = [
    haystack,
    prefill.clothing,
    prefill.personality,
    prefill.usageContext,
    prefill.characterType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const outfit = matchOutfitPreset(text);
  let direction = "";
  let personaHint: string | undefined;

  if (outfit === "chef") {
    direction = "Warm chef / friendly narrator";
    personaHint = "warm_narrator or British chef persona";
  } else if (outfit === "garden") {
    direction = "Calm community voice";
    personaHint = "calm community narrator";
  } else if (outfit === "designer") {
    direction = "Creative / fashion-forward voice";
    personaHint = "creative presenter";
  } else if (/\bnarrator\b|\bverteller\b|\bhost\b/.test(text)) {
    direction = "Friendly narrator";
  } else if (/\bwarm\b|\bvriendelijk\b/.test(text)) {
    direction = "Warm, welcoming voice";
  } else if (/\bpremium\b|\bmodern\b|\bzelfverzekerd\b/.test(text)) {
    direction = "Confident premium presenter";
  }

  const accentFilterHint = extractAccentHint(text);

  return {
    direction,
    accentFilterHint,
    personaHint,
  };
}
