import type { CharacterIdentityFormValues } from "@/lib/studio-character-identity-fields";

/** Unified prefill result — prompt, image, or merged. */
export type CharacterIdentityPrefillResult = {
  prefill: Partial<CharacterIdentityFormValues>;
  voiceDirectionHint: string;
  voiceAccentHint?: string;
  confidence: number;
  missingFields: string[];
  reasons: string[];
  safetyNotes: string[];
  visualObservations?: string[];
  conflicts?: CharacterIdentityPrefillConflict[];
};

export type CharacterIdentityPrefillConflict = {
  field: keyof CharacterIdentityFormValues;
  promptValue: string;
  imageValue: string;
};

export type CharacterIdentityPromptPrefillInput = {
  prompt: string;
  usageContext?: string;
  brandRules?: string;
};
