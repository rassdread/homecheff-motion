/**
 * Merge prompt + image identity prefills with conflict detection.
 */

import type { CharacterIdentityFormValues } from "@/lib/studio-character-identity-fields";
import { buildCharacterVoiceHintFromPrefill } from "@/lib/studio-character-identity-voice-hints";
import {
  computeConfidence,
  computeMissingFields,
  normalizeHaystack,
} from "@/lib/studio-character-identity-prefill-matching";
import type {
  CharacterIdentityPrefillConflict,
  CharacterIdentityPrefillResult,
} from "@/types/studio-character-identity-prefill";

/** Fields where prompt intent should win when merging. */
const PROMPT_PRIORITY_FIELDS: Array<keyof CharacterIdentityFormValues> = [
  "personality",
  "usageContext",
  "forbiddenElements",
  "description",
  "name",
];

/** Fields where image observation should win when merging. */
const IMAGE_PRIORITY_FIELDS: Array<keyof CharacterIdentityFormValues> = [
  "visualStyle",
  "shapeLanguage",
  "colorTheme",
  "clothing",
  "accessories",
  "appearanceMemory",
  "energy",
];

const CONFLICT_FIELDS: Array<keyof CharacterIdentityFormValues> = [
  "colorTheme",
  "clothing",
  "visualStyle",
  "accessories",
];

function normalizeConflictValue(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function valuesConflict(a: unknown, b: unknown): boolean {
  const left = normalizeConflictValue(a);
  const right = normalizeConflictValue(b);
  if (!left || !right) {
    return false;
  }
  if (left === right) {
    return false;
  }
  if (left.includes(right) || right.includes(left)) {
    return false;
  }
  return true;
}

function detectConflicts(
  prompt: CharacterIdentityPrefillResult,
  image: CharacterIdentityPrefillResult
): CharacterIdentityPrefillConflict[] {
  const conflicts: CharacterIdentityPrefillConflict[] = [];
  for (const field of CONFLICT_FIELDS) {
    const promptValue = String(prompt.prefill[field] ?? "").trim();
    const imageValue = String(image.prefill[field] ?? "").trim();
    if (valuesConflict(promptValue, imageValue)) {
      conflicts.push({ field, promptValue, imageValue });
    }
  }
  return conflicts;
}

/** Combine prompt + image prefills; prompt drives intent, images drive visuals. */
export function mergeCharacterIdentityPrefills(params: {
  prompt: CharacterIdentityPrefillResult | null;
  image: CharacterIdentityPrefillResult | null;
}): CharacterIdentityPrefillResult {
  const { prompt, image } = params;

  if (!prompt && !image) {
    return {
      prefill: {},
      voiceDirectionHint: "",
      confidence: 0,
      missingFields: [],
      reasons: [],
      safetyNotes: [],
      conflicts: [],
    };
  }

  if (prompt && !image) {
    return { ...prompt, conflicts: [] };
  }

  if (image && !prompt) {
    return { ...image, conflicts: [] };
  }

  const merged: Partial<CharacterIdentityFormValues> = {
    ...image!.prefill,
    ...prompt!.prefill,
  };

  for (const field of PROMPT_PRIORITY_FIELDS) {
    const value = prompt!.prefill[field];
    if (value !== undefined && value !== null && String(value).trim()) {
      merged[field] = value as never;
    }
  }

  for (const field of IMAGE_PRIORITY_FIELDS) {
    const value = image!.prefill[field];
    if (value !== undefined && value !== null && String(value).trim()) {
      merged[field] = value as never;
    }
  }

  const conflicts = detectConflicts(prompt!, image!);
  const haystack = normalizeHaystack([
    prompt!.prefill.description,
    image!.prefill.description,
    prompt!.prefill.usageContext,
  ]);
  const voice = buildCharacterVoiceHintFromPrefill(merged, haystack);

  return {
    prefill: merged,
    voiceDirectionHint: voice.direction || prompt!.voiceDirectionHint || image!.voiceDirectionHint,
    voiceAccentHint: voice.accentFilterHint || prompt!.voiceAccentHint || image!.voiceAccentHint,
    confidence: computeConfidence(
      merged,
      Math.min(prompt!.confidence, image!.confidence) * 0.5 +
        Math.max(prompt!.confidence, image!.confidence) * 0.5
    ),
    missingFields: computeMissingFields(merged),
    reasons: [...(prompt!.reasons ?? []), ...(image!.reasons ?? []), "source:merged"],
    safetyNotes: [...new Set([...(prompt!.safetyNotes ?? []), ...(image!.safetyNotes ?? [])])],
    visualObservations: image!.visualObservations,
    conflicts,
  };
}

export function conflictMessageKey(field: keyof CharacterIdentityFormValues): string {
  if (field === "colorTheme") {
    return "studio.characters.prefill.conflict.colorTheme";
  }
  if (field === "clothing") {
    return "studio.characters.prefill.conflict.clothing";
  }
  if (field === "visualStyle") {
    return "studio.characters.prefill.conflict.visualStyle";
  }
  if (field === "accessories") {
    return "studio.characters.prefill.conflict.accessories";
  }
  return "studio.characters.prefill.conflict.generic";
}
