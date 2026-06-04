/**
 * Studio V28 — ElevenLabs request planning (no API calls).
 */

import {
  getVoiceProfilePreset,
  normalizeStudioNarrationMode,
  normalizeStudioVoiceProfileId,
  type StudioVoiceProfilePreset,
} from "@/lib/studio-voice-profiles";
import { cleanVoiceScript } from "@/lib/studio-voice-script-builder";

export type ElevenLabsVoiceSettings = {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost?: boolean;
};

export type ElevenLabsVoiceRequest = {
  text: string;
  model_id: string;
  voice_id_recommendation: string;
  language_code: string;
  voice_settings: ElevenLabsVoiceSettings;
  metadata: {
    narrationMode: string;
    voiceProfile: string;
    estimatedCharacters: number;
  };
};

export type VoiceSettingsValidation =
  | { ok: true }
  | { ok: false; code: string; message: string };

const SUPPORTED_LANGUAGES = new Set(["en", "nl", "de", "fr", "es", "it", "pt"]);

export function validateVoiceSettings(params: {
  voiceEnabled: boolean;
  voiceLanguage: string;
  voiceProfile: string;
  narrationMode: string;
  script: string;
}): VoiceSettingsValidation {
  if (!params.voiceEnabled) {
    return { ok: true };
  }
  const lang = params.voiceLanguage.trim().toLowerCase().slice(0, 2);
  if (!SUPPORTED_LANGUAGES.has(lang)) {
    return { ok: false, code: "UNSUPPORTED_LANGUAGE", message: "Voice language is not supported." };
  }
  normalizeStudioVoiceProfileId(params.voiceProfile);
  normalizeStudioNarrationMode(params.narrationMode);
  if (!params.script.trim()) {
    return { ok: false, code: "SCRIPT_REQUIRED", message: "Narration script is required when voice is enabled." };
  }
  if (params.script.length > 12_000) {
    return { ok: false, code: "SCRIPT_TOO_LONG", message: "Narration script exceeds planning limit." };
  }
  return { ok: true };
}

export function estimateVoiceCredits(characterCount: number): {
  estimatedCredits: number;
  characters: number;
} {
  const chars = Math.max(0, characterCount);
  const estimatedCredits = Math.max(1, Math.ceil(chars / 500));
  return { estimatedCredits, characters: chars };
}

export function buildVoiceRequest(params: {
  script: string;
  voiceProfile: string;
  voiceLanguage: string;
  narrationMode: string;
  preset?: StudioVoiceProfilePreset;
}): ElevenLabsVoiceRequest {
  const preset = params.preset ?? getVoiceProfilePreset(params.voiceProfile);
  const text = cleanVoiceScript(params.script);
  const lang = params.voiceLanguage.trim().toLowerCase().slice(0, 2) || "en";

  return {
    text,
    model_id: "eleven_multilingual_v2",
    voice_id_recommendation: preset.elevenLabsVoiceRecommendation,
    language_code: lang,
    voice_settings: {
      stability: preset.stability,
      similarity_boost: preset.similarity,
      style: preset.style,
      use_speaker_boost: true,
    },
    metadata: {
      narrationMode: normalizeStudioNarrationMode(params.narrationMode),
      voiceProfile: preset.id,
      estimatedCharacters: text.length,
    },
  };
}
