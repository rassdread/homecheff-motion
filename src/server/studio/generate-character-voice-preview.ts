import { buildVoiceRequest, validateVoiceSettings } from "@/lib/elevenlabs-voice";
import { defaultCharacterVoicePreviewLine } from "@/lib/studio-character-voice";
import { getVoiceProfilePreset } from "@/lib/studio-voice-profiles";
import { prisma } from "@/lib/prisma";
import { selectVoiceProvider } from "@/server/studio/voice/voice-provider";
import { uploadStoryboardVoiceAudio } from "@/server/studio/studio-voice-blob";
import type { ServiceError } from "@/server/studio/studio-storyboard-service";
import { mapStudioCharacterToDetail } from "@/server/studio/studio-character-service";
import { characterVoiceSnapshotFromRow, resolveCharacterVoiceForLanguage } from "@/lib/studio-character-voice";

function serviceError(code: string, message: string, httpStatus: number): ServiceError {
  return { code, message, httpStatus };
}

export async function generateCharacterVoicePreview(params: {
  characterId: string;
  ownerId: string;
  language?: string;
  sampleLine?: string;
}): Promise<
  | { ok: true; audioUrl: string; durationSeconds: number; provider: string }
  | { error: ServiceError }
> {
  const row = await prisma.studioCharacter.findFirst({
    where: { id: params.characterId, ownerId: params.ownerId },
  });
  if (!row) {
    return { error: serviceError("NOT_FOUND", "Character not found.", 404) };
  }

  const language = (params.language ?? row.voiceLanguage ?? "en").trim().toLowerCase().slice(0, 2);
  const snap = resolveCharacterVoiceForLanguage(characterVoiceSnapshotFromRow(row), language);
  if (!snap.voiceEnabled && !snap.voiceProfile) {
    return {
      error: serviceError("VOICE_DISABLED", "Enable a voice profile on this character first.", 400),
    };
  }

  const voiceProfile = snap.voiceProfile || "warm_narrator";
  const preset = getVoiceProfilePreset(voiceProfile);
  const script =
    params.sampleLine?.trim() ||
    defaultCharacterVoicePreviewLine(mapStudioCharacterToDetail(row).name, language);

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
      ownerId: params.ownerId,
      storyboardId: `character-${row.id}`,
      language: `preview-${language}`,
      voiceAssetId: row.id,
      audioBuffer: synthesis.audioBuffer,
      contentType,
    });
    return {
      ok: true,
      audioUrl: uploaded.audioUrl,
      durationSeconds: synthesis.durationSeconds,
      provider: synthesis.provider,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Voice preview failed.";
    return { error: serviceError("VOICE_PREVIEW_FAILED", message, 502) };
  }
}
