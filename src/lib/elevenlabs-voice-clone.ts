/**
 * ElevenLabs Instant Voice Clone — runtime wrapper.
 */

import { formatClonedVoiceProfileRef } from "@/lib/studio-voice-profile-ref";
import type { VoiceCloneResult } from "@/types/studio-voice-clone";

export type VoiceCloneInput = {
  name: string;
  description?: string;
  sampleBuffer: Buffer;
  sampleFileName: string;
  sampleContentType: string;
  languageCode?: string;
};

export function parseCloneResponse(raw: unknown): VoiceCloneResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Invalid voice clone response.");
  }
  const body = raw as Record<string, unknown>;
  const voiceId = typeof body.voice_id === "string" ? body.voice_id.trim() : "";
  if (!voiceId) {
    throw new Error("Voice clone did not return a voice id.");
  }
  return {
    provider: "elevenlabs",
    providerVoiceId: voiceId,
    voiceProfileRef: formatClonedVoiceProfileRef(voiceId),
    status: "completed",
    requiresVerification: Boolean(body.requires_verification),
  };
}

export async function cloneElevenLabsVoice(input: VoiceCloneInput): Promise<VoiceCloneResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not configured.");
  }

  const form = new FormData();
  form.append("name", input.name.trim().slice(0, 120));
  if (input.description?.trim()) {
    form.append("description", input.description.trim().slice(0, 500));
  }
  if (input.languageCode?.trim()) {
    form.append(
      "labels",
      JSON.stringify({ language: input.languageCode.trim().slice(0, 2) })
    );
  }
  const blob = new Blob([new Uint8Array(input.sampleBuffer)], { type: input.sampleContentType });
  form.append("files", blob, input.sampleFileName);

  const res = await fetch("https://api.elevenlabs.io/v1/voices/add", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Voice clone failed (${res.status}). Check your sample and try again. ${detail.slice(0, 120)}`
    );
  }

  const json: unknown = await res.json();
  return parseCloneResponse(json);
}

export function cloneMockVoice(input: VoiceCloneInput): VoiceCloneResult {
  const slug = input.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24);
  const providerVoiceId = `mock-clone-${slug || "voice"}-${input.sampleBuffer.length}`;
  return {
    provider: "mock",
    providerVoiceId,
    voiceProfileRef: formatClonedVoiceProfileRef(providerVoiceId),
    status: "completed",
    requiresVerification: false,
  };
}
