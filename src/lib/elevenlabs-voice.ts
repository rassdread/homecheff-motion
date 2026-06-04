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

/** Default ElevenLabs voice IDs per Studio profile (override via ELEVENLABS_VOICE_ID). */
const PROFILE_VOICE_IDS: Record<string, string> = {
  warm_narrator: "21m00Tcm4TlvDq8ikWAM",
  documentary: "ErXwobaYiN019PkySvjV",
  commercial: "EXAVITQu4vr4xnSDxMaL",
  inspirational_founder: "pNInz6obpgDQGcFmaJgB",
  premium_brand: "onwK4e9ZLuTAKqWW03F9",
  educational: "VR6AewLTigWG4xSOukaG",
};

export function resolveElevenLabsVoiceId(voiceProfile: string): string {
  const envDefault = process.env.ELEVENLABS_VOICE_ID?.trim();
  if (envDefault) {
    return envDefault;
  }
  const profile = normalizeStudioVoiceProfileId(voiceProfile);
  return PROFILE_VOICE_IDS[profile] ?? PROFILE_VOICE_IDS.warm_narrator;
}

export function estimateMp3DurationSeconds(buffer: Buffer, bitrateKbps = 128): number {
  if (buffer.length <= 0) {
    return 0;
  }
  const bytesPerSecond = (bitrateKbps * 1000) / 8;
  return Math.max(0.5, buffer.length / bytesPerSecond);
}

export type ElevenLabsSynthesisResult = {
  audioBuffer: Buffer;
  durationSeconds: number;
  providerVoiceId: string;
  providerModelId: string;
  characterCount: number;
};

export async function synthesizeElevenLabsSpeech(params: {
  request: ElevenLabsVoiceRequest;
  voiceProfile: string;
}): Promise<ElevenLabsSynthesisResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not configured.");
  }
  const voiceId = resolveElevenLabsVoiceId(params.voiceProfile);
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: params.request.text,
      model_id: params.request.model_id,
      voice_settings: params.request.voice_settings,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `ElevenLabs TTS failed (${res.status}): ${detail.slice(0, 200) || res.statusText}`
    );
  }
  const arrayBuffer = await res.arrayBuffer();
  const audioBuffer = Buffer.from(arrayBuffer);
  return {
    audioBuffer,
    durationSeconds: estimateMp3DurationSeconds(audioBuffer),
    providerVoiceId: voiceId,
    providerModelId: params.request.model_id,
    characterCount: params.request.metadata.estimatedCharacters,
  };
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
