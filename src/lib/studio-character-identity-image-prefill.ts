/**
 * Character reference image → Identity Builder prefill (no auto-save).
 */

import type { CharacterIdentityFormValues } from "@/lib/studio-character-identity-fields";
import { buildCharacterVoiceHintFromPrefill } from "@/lib/studio-character-identity-voice-hints";
import {
  computeConfidence,
  computeMissingFields,
  labelForPreset,
  matchAccessoryPreset,
  matchCharacterIdentityFromText,
  matchOutfitPreset,
  matchPersonalityPresets,
  normalizeHaystack,
} from "@/lib/studio-character-identity-prefill-matching";
import type { CharacterIdentityPrefillResult } from "@/types/studio-character-identity-prefill";
import type {
  CharacterIdentityImagePrefillInput,
  CharacterReferenceImageAnalysis,
} from "@/types/studio-character-identity-image-prefill";

function mergeDescriptionParts(
  analysis: CharacterReferenceImageAnalysis,
  input: CharacterIdentityImagePrefillInput
): string {
  const parts = [
    input.userDescription?.trim(),
    analysis.appearanceMemory?.trim(),
    input.imageUrls.length > 1 ? `Based on ${input.imageUrls.length} reference images.` : "",
  ].filter(Boolean);
  return parts.join(" ").slice(0, 500);
}

/** Map vision extraction + user context → identity form prefill (no persistence). */
export function buildCharacterIdentityPrefillFromImages(params: {
  analysis: CharacterReferenceImageAnalysis;
  input: CharacterIdentityImagePrefillInput;
  locale?: "en" | "nl";
}): CharacterIdentityPrefillResult {
  const { analysis, input } = params;
  const locale = params.locale ?? "en";
  const haystack = normalizeHaystack([
    analysis.name,
    analysis.role,
    analysis.characterType,
    analysis.visualStyle,
    analysis.shapeLanguage,
    analysis.energy,
    analysis.personality,
    analysis.clothing,
    analysis.accessories,
    analysis.colorTheme,
    analysis.colorNotes,
    analysis.appearanceMemory,
    analysis.usageContext,
    analysis.voiceDirection,
    input.userDescription,
    input.intendedUsage,
  ]);

  const matched = matchCharacterIdentityFromText({
    haystack,
    locale,
    description: mergeDescriptionParts(analysis, input),
    usageContext: [input.intendedUsage?.trim(), analysis.usageContext?.trim()]
      .filter(Boolean)
      .join(" — ")
      .slice(0, 400),
    forbiddenOverride: analysis.forbiddenElements?.trim(),
    name: analysis.name?.trim(),
    explicitConfidence: analysis.confidence,
  });

  const outfitPreset = matchOutfitPreset(normalizeHaystack([analysis.clothing, haystack]));
  const accessoryPreset = matchAccessoryPreset(normalizeHaystack([analysis.accessories, haystack]));
  const personalityPresets = matchPersonalityPresets(normalizeHaystack([analysis.personality, haystack]));

  const prefill: Partial<CharacterIdentityFormValues> = {
    ...matched.prefill,
    clothing:
      analysis.clothing?.trim() ||
      (outfitPreset ? labelForPreset("outfit", outfitPreset, locale) : matched.prefill.clothing),
    accessories:
      analysis.accessories?.trim() ||
      (accessoryPreset ? labelForPreset("accessory", accessoryPreset, locale) : matched.prefill.accessories),
    personality:
      analysis.personality?.trim() ||
      personalityPresets.map((id) => labelForPreset("personality", id, locale)).filter(Boolean).join(", ") ||
      matched.prefill.personality,
    appearanceMemory: analysis.appearanceMemory?.trim() ?? "",
    visualStyle: matched.prefill.visualStyle || analysis.visualStyle?.trim() || "",
    colorTheme: matched.prefill.colorTheme || "",
  };

  const voice = buildCharacterVoiceHintFromPrefill(
    prefill,
    normalizeHaystack([haystack, analysis.voiceDirection])
  );

  const visualObservations = [
    analysis.appearanceMemory?.trim(),
    analysis.colorNotes?.trim(),
    analysis.clothing?.trim(),
    analysis.accessories?.trim(),
  ].filter(Boolean) as string[];

  const safetyNotes = [...(analysis.safetyNotes ?? [])];

  return {
    prefill,
    voiceDirectionHint: analysis.voiceDirection?.trim() || voice.direction,
    voiceAccentHint: voice.accentFilterHint,
    confidence: computeConfidence(prefill, analysis.confidence),
    missingFields: computeMissingFields(prefill),
    reasons: [`source:image`, ...matched.reasons],
    safetyNotes,
    visualObservations,
  };
}

/** @deprecated use CharacterIdentityPrefillResult from studio-character-identity-prefill types */
export type CharacterIdentityImagePrefillResult = CharacterIdentityPrefillResult;
