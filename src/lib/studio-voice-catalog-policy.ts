/**
 * Public voice-catalog eligibility.
 * A saved character voice profile is not a catalog row and is never removed here.
 */

import { canonicalAccentForVoice } from "@/lib/studio-voice-accent-model";
import type { VoiceLibraryEntry } from "@/lib/studio-voice-library-catalog";
import { canonicalVoiceAge, canonicalVoiceLanguage } from "@/lib/studio-voice-language";

export const STUDIO_VOICE_PROVIDER = "elevenlabs";
export const SYNTHESIS_MODEL_ID = "eleven_multilingual_v2";

export type VoiceEligibilityStatus =
  | "ELIGIBLE"
  | "EXCLUDED_NO_SAMPLE"
  | "EXCLUDED_INVALID_ID"
  | "EXCLUDED_INVALID_METADATA";

export type VoiceAvailabilityStatus = "AVAILABILITY_UNKNOWN" | "UNAVAILABLE_CONFIRMED";

const SAFE_LANGUAGE = /^[a-z0-9-]{0,16}$/;

export type VoiceCatalogEligibilityInput = {
  providerVoiceId: string;
  previewUrl: string;
  language?: string;
  name?: string;
  confirmedUnavailable?: boolean;
};

export type VoiceCatalogEligibility = {
  eligibilityStatus: VoiceEligibilityStatus;
  availabilityStatus: VoiceAvailabilityStatus;
};

export function isSafePreviewUrl(url: string): boolean {
  const value = url.trim();
  if (!value.startsWith("https://")) {
    return false;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

export function isValidProviderVoiceId(id: string): boolean {
  const value = id.trim();
  return value.length > 0 && value.length <= 128 && !/\s/.test(value);
}

export function classifyVoiceCatalogEligibility(
  input: VoiceCatalogEligibilityInput
): VoiceCatalogEligibility {
  const availabilityStatus: VoiceAvailabilityStatus = input.confirmedUnavailable
    ? "UNAVAILABLE_CONFIRMED"
    : "AVAILABILITY_UNKNOWN";
  if (!isValidProviderVoiceId(input.providerVoiceId)) {
    return { eligibilityStatus: "EXCLUDED_INVALID_ID", availabilityStatus };
  }
  const language = canonicalVoiceLanguage(input.language ?? "");
  if (!SAFE_LANGUAGE.test(language)) {
    return { eligibilityStatus: "EXCLUDED_INVALID_METADATA", availabilityStatus };
  }
  if (!isSafePreviewUrl(input.previewUrl)) {
    return { eligibilityStatus: "EXCLUDED_NO_SAMPLE", availabilityStatus };
  }
  if (!(input.name ?? "").trim()) {
    return { eligibilityStatus: "EXCLUDED_INVALID_METADATA", availabilityStatus };
  }
  return { eligibilityStatus: "ELIGIBLE", availabilityStatus };
}

export type VoiceCatalogDraft = {
  provider: string;
  providerVoiceId: string;
  name: string;
  canonicalLanguage: string;
  originalLanguage: string;
  locale: string;
  accent: string;
  accentId: string;
  gender: string;
  age: string;
  category: string;
  description: string;
  descriptive: string;
  useCase: string;
  labelsJson: Record<string, string>;
  previewUrl: string;
  catalogSource: string;
  eligibilityStatus: VoiceEligibilityStatus;
  availabilityStatus: VoiceAvailabilityStatus;
  modelCompatibility: string;
  sampleStatus: "present" | "invalid";
};

function compactLabels(labels: Record<string, string>): Record<string, string> {
  const kept: Record<string, string> = {};
  for (const key of ["language", "provider_language", "accent", "gender", "age", "use_case", "descriptive", "locale", "catalog_source", "verified_locale"]) {
    const value = labels[key]?.trim();
    if (value) {
      kept[key] = value.slice(0, 200);
    }
  }
  return kept;
}

export function voiceCatalogDraftFromLibraryEntry(
  voice: VoiceLibraryEntry,
  options?: { confirmedUnavailable?: boolean; modelId?: string }
): VoiceCatalogDraft {
  const originalLanguage = (voice.labels.provider_language || voice.language || "").trim();
  const decision = classifyVoiceCatalogEligibility({
    providerVoiceId: voice.id,
    previewUrl: voice.previewUrl,
    language: voice.language,
    name: voice.name,
    confirmedUnavailable: options?.confirmedUnavailable,
  });
  const accent = canonicalAccentForVoice(voice);
  return {
    provider: STUDIO_VOICE_PROVIDER,
    providerVoiceId: voice.id.trim(),
    name: voice.name.trim().slice(0, 200),
    canonicalLanguage: canonicalVoiceLanguage(voice.language),
    originalLanguage: originalLanguage.slice(0, 64),
    locale: (voice.labels.locale || voice.labels.verified_locale || "").trim().slice(0, 32),
    accent: (voice.accent || "").trim().slice(0, 80),
    accentId: accent?.id ?? "",
    gender: (voice.gender || "").trim().toLowerCase().slice(0, 32),
    age: canonicalVoiceAge(voice.age || "").slice(0, 32),
    category: (voice.category || "").trim().toLowerCase().slice(0, 40),
    description: voice.description.trim().slice(0, 500),
    descriptive: (voice.labels.descriptive || "").trim().slice(0, 80),
    useCase: (voice.labels.use_case || voice.labels.useCase || "").trim().slice(0, 80),
    labelsJson: compactLabels(voice.labels),
    previewUrl: isSafePreviewUrl(voice.previewUrl) ? voice.previewUrl.trim() : "",
    catalogSource: (voice.labels.catalog_source || "").trim().slice(0, 32),
    eligibilityStatus: decision.eligibilityStatus,
    availabilityStatus: decision.availabilityStatus,
    modelCompatibility: options?.modelId === SYNTHESIS_MODEL_ID ? SYNTHESIS_MODEL_ID : "",
    sampleStatus: decision.eligibilityStatus === "EXCLUDED_NO_SAMPLE" ? "invalid" : "present",
  };
}
