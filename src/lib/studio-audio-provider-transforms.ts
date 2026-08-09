/**
 * S.7B — ElevenLabs provider transform boundary.
 * Provider-specific fields live here — not in Creative Director / Matrix assembly.
 * Wraps existing Matrix ElevenLabs mappers; does not rewrite ElevenLabs SDKs.
 */

import type { AudioSpecification } from "@/lib/studio-audio-specification";
import {
  mapAudioTransform,
  mapVoiceTransform,
  type ElevenLabsAudioMapping,
  type ElevenLabsVoiceMapping,
} from "@/lib/studio-prompt-matrix/transforms/elevenlabs";
import type { ContinuityBundle } from "@/lib/studio-prompt-matrix/continuity-bundle";
import type { CreativeSpecification } from "@/lib/studio-prompt-matrix/creative-specification";

export type ElevenLabsCapability =
  | "TTS"
  | "CLONE"
  | "MUSIC"
  | "SFX"
  | "STT";

/** Provider request shape after transform — still not raw SDK payload. */
export type ElevenLabsProviderRequest = {
  capability: ElevenLabsCapability;
  voiceId: string | null;
  model: string | null;
  stability: number | null;
  similarity: number | null;
  language: string | null;
  durationSeconds: number | null;
  /** Opaque provider-owned fields — never invent in Matrix. */
  providerFields: Record<string, unknown>;
  matrixMapping: ElevenLabsVoiceMapping | ElevenLabsAudioMapping | null;
};

export function elevenLabsCapabilityFromAudioSpec(
  capability: AudioSpecification["capability"]
): ElevenLabsCapability | null {
  switch (capability) {
    case "VOICE_TTS":
      return "TTS";
    case "VOICE_CLONE":
      return "CLONE";
    case "MUSIC_GENERATE":
      return "MUSIC";
    case "SFX_GENERATE":
      return "SFX";
    case "SUBTITLE_TRANSCRIBE":
      return "STT";
    default:
      return null;
  }
}

/**
 * Build provider-boundary request from Matrix CreativeSpecification.
 * Creative Director must not call ElevenLabs directly — this is the last step.
 */
export function transformAudioSpecToElevenLabs(input: {
  capability: ElevenLabsCapability;
  specification: CreativeSpecification;
  continuity: ContinuityBundle;
  /** Optional provider overrides resolved outside Matrix (voice ID, model, etc.). */
  providerOverrides?: {
    voiceId?: string | null;
    model?: string | null;
    stability?: number | null;
    similarity?: number | null;
    language?: string | null;
    durationSeconds?: number | null;
  };
}): ElevenLabsProviderRequest {
  const overrides = input.providerOverrides ?? {};
  let matrixMapping: ElevenLabsVoiceMapping | ElevenLabsAudioMapping | null = null;

  if (input.capability === "TTS" || input.capability === "CLONE") {
    matrixMapping = mapVoiceTransform({
      specification: input.specification,
      continuity: input.continuity,
      mode: input.capability === "CLONE" ? "clone" : "tts",
    });
  } else if (input.capability === "MUSIC" || input.capability === "SFX") {
    matrixMapping = mapAudioTransform({
      specification: input.specification,
      continuity: input.continuity,
      kind: input.capability === "MUSIC" ? "music" : "sfx",
    });
  }

  return {
    capability: input.capability,
    voiceId: overrides.voiceId ?? null,
    model: overrides.model ?? null,
    stability: overrides.stability ?? null,
    similarity: overrides.similarity ?? null,
    language:
      overrides.language ??
      (matrixMapping && "language" in matrixMapping ? matrixMapping.language : null),
    durationSeconds:
      overrides.durationSeconds ??
      (matrixMapping && "durationSeconds" in matrixMapping
        ? matrixMapping.durationSeconds
        : null),
    providerFields: {},
    matrixMapping,
  };
}
