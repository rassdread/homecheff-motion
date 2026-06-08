/**
 * Prompt / description → Character Identity Builder prefill (heuristic, no auto-save).
 */

import type { CharacterIdentityFormValues } from "@/lib/studio-character-identity-fields";
import {
  buildCharacterVoiceHintFromPrefill,
} from "@/lib/studio-character-identity-voice-hints";
import {
  computeConfidence,
  computeMissingFields,
  matchCharacterIdentityFromText,
  normalizeHaystack,
} from "@/lib/studio-character-identity-prefill-matching";
import type {
  CharacterIdentityPrefillResult,
  CharacterIdentityPromptPrefillInput,
} from "@/types/studio-character-identity-prefill";

function suggestNameFromPrompt(prompt: string): string {
  const quoted = prompt.match(/["“]([^"”]+)["”]/);
  if (quoted?.[1]?.trim()) {
    return quoted[1].trim().slice(0, 80);
  }
  const named = prompt.match(/\b(?:named|called|naam)\s+([A-Z][a-zA-Z\s]{1,30})/);
  if (named?.[1]?.trim()) {
    return named[1].trim();
  }
  return "";
}

/** Map user prompt → identity form prefill using existing presets (no persistence). */
export function buildCharacterIdentityPrefillFromPrompt(params: {
  input: CharacterIdentityPromptPrefillInput;
  locale?: "en" | "nl";
}): CharacterIdentityPrefillResult {
  const { input } = params;
  const locale = params.locale ?? "en";
  const prompt = input.prompt.trim();
  const haystack = normalizeHaystack([prompt, input.usageContext, input.brandRules]);

  const { prefill, reasons } = matchCharacterIdentityFromText({
    haystack,
    locale,
    description: prompt.slice(0, 500),
    usageContext: input.usageContext?.trim() || extractUsageFromPrompt(prompt),
    forbiddenOverride: input.brandRules?.trim()
      ? [input.brandRules.trim(), extractForbiddenFromPrompt(prompt)].filter(Boolean).join("; ")
      : extractForbiddenFromPrompt(prompt),
    name: suggestNameFromPrompt(prompt),
  });

  const voice = buildCharacterVoiceHintFromPrefill(prefill, haystack);
  const missingFields = computeMissingFields(prefill);

  return {
    prefill,
    voiceDirectionHint: voice.direction,
    voiceAccentHint: voice.accentFilterHint,
    confidence: computeConfidence(prefill),
    missingFields,
    reasons: [`source:prompt`, ...reasons],
    safetyNotes: [],
  };
}

function extractUsageFromPrompt(prompt: string): string {
  const promo = prompt.match(/\b(?:promo|promo's|promotie|tutorial|reclame|food|fashion|design)[^.]{0,60}/i);
  return promo?.[0]?.trim().slice(0, 400) ?? "";
}

function extractForbiddenFromPrompt(prompt: string): string {
  const avoid = prompt.match(/(?:avoid|vermijden|zonder|geen)[^.!?]{0,80}/gi);
  if (!avoid?.length) {
    return "";
  }
  return avoid.join("; ").slice(0, 300);
}

/** Quick check whether prompt yields any identity signal. */
export function promptHasIdentitySignals(prompt: string): boolean {
  const result = buildCharacterIdentityPrefillFromPrompt({
    input: { prompt },
  });
  return result.missingFields.length < 10;
}

export type { CharacterIdentityFormValues };
