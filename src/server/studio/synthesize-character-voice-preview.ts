import { randomUUID } from "node:crypto";
import { buildVoiceRequest, validateVoiceSettings } from "@/lib/elevenlabs-voice";
import { defaultCharacterVoicePreviewLine } from "@/lib/studio-character-voice";
import { getVoiceProfilePreset, normalizeStudioVoiceProfileId } from "@/lib/studio-voice-profiles";
import { selectVoiceProvider } from "@/server/studio/voice/voice-provider";
import { uploadStoryboardVoiceAudio } from "@/server/studio/studio-voice-blob";
import type { ServiceError } from "@/server/studio/studio-storyboard-service";

function serviceError(code: string, message: string, httpStatus: number): ServiceError {
  return { code, message, httpStatus };
}

export type CharacterVoicePreviewSynthesisInput = {
  ownerId: string;
  characterName: string;
  voiceProfile: string;
  language: string;
  sampleLine?: string;
  /** Blob path scope — character id or draft id */
  storageAssetId: string;
  storageStoryboardId: string;
};

export type CharacterVoicePreviewSynthesisResult =
  | {
      ok: true;
      audioUrl: string;
      durationSeconds: number;
      provider: string;
      script: string;
      voiceProfile: string;
      language: string;
    }
  | { error: ServiceError };

export function resolveCharacterVoicePreviewScript(params: {
  characterName: string;
  language: string;
  sampleLine?: string;
}): string {
  const language = params.language.trim().toLowerCase().slice(0, 2);
  const trimmed = params.sampleLine?.trim();
  if (trimmed) {
    return trimmed.slice(0, 500);
  }
  const name = params.characterName.trim() || "Character";
  return defaultCharacterVoicePreviewLine(name, language);
}

export async function synthesizeCharacterVoicePreview(
  input: CharacterVoicePreviewSynthesisInput
): Promise<CharacterVoicePreviewSynthesisResult> {
  const language = input.language.trim().toLowerCase().slice(0, 2) || "en";
  const voiceProfile = normalizeStudioVoiceProfileId(input.voiceProfile || "warm_narrator");
  const script = resolveCharacterVoicePreviewScript({
    characterName: input.characterName,
    language,
    sampleLine: input.sampleLine,
  });

  if (!script.trim()) {
    return {
      error: serviceError("SAMPLE_LINE_REQUIRED", "Enter preview text before listening.", 400),
    };
  }

  const preset = getVoiceProfilePreset(voiceProfile);
  const validation = validateVoiceSettings({
    voiceEnabled: true,
    voiceLanguage: language,
    voiceProfile,
    narrationMode: "narrator",
    script,
  });
  if (!validation.ok) {
    return { error: serviceError(validation.code, validation.message, 400) };
  }

  const request = buildVoiceRequest({
    script,
    voiceProfile,
    voiceLanguage: language,
    narrationMode: "narrator",
    preset,
  });

  try {
    const provider = selectVoiceProvider();
    const synthesis = await provider.synthesize({
      request,
      voiceProfile,
      voiceLanguage: language,
    });
    const contentType = synthesis.provider === "mock" ? "audio/wav" : "audio/mpeg";
    const uploaded = await uploadStoryboardVoiceAudio({
      ownerId: input.ownerId,
      storyboardId: input.storageStoryboardId,
      language: `preview-${language}`,
      voiceAssetId: input.storageAssetId,
      audioBuffer: synthesis.audioBuffer,
      contentType,
    });
    return {
      ok: true,
      audioUrl: uploaded.audioUrl,
      durationSeconds: synthesis.durationSeconds,
      provider: synthesis.provider,
      script,
      voiceProfile,
      language,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Voice preview failed.";
    return { error: serviceError("VOICE_PREVIEW_FAILED", message, 502) };
  }
}

export function draftCharacterVoicePreviewStorageIds(ownerId: string): {
  storageStoryboardId: string;
  storageAssetId: string;
} {
  return {
    storageStoryboardId: `character-draft-${ownerId}`,
    storageAssetId: randomUUID(),
  };
}
