import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { validateVoiceSampleUpload } from "@/lib/studio-voice-sample-validation";
import { appendCharacterVoiceHistoryIfChanged } from "@/server/studio/studio-character-voice-history";
import { uploadCharacterVoiceSample } from "@/server/studio/studio-voice-sample-blob";
import { selectVoiceCloneProvider } from "@/server/studio/speech/voice-clone-provider";
import { generateCharacterVoicePreview } from "@/server/studio/generate-character-voice-preview";
import type { ServiceError } from "@/server/studio/studio-storyboard-service";
import { mapStudioCharacterToDetail } from "@/server/studio/studio-character-service";
import type { SessionUser } from "@/server/auth/session";

function serviceError(code: string, message: string, httpStatus: number): ServiceError {
  return { code, message, httpStatus };
}

export type CloneCharacterVoiceResult = {
  characterId: string;
  voiceProfileRef: string;
  clonedVoiceName: string;
  provider: string;
  previewAudioUrl: string | null;
  previewDurationSeconds: number | null;
  character: ReturnType<typeof mapStudioCharacterToDetail>;
};

export async function cloneCharacterVoice(params: {
  characterId: string;
  viewer: Pick<SessionUser, "id" | "role">;
  sampleBuffer: Buffer;
  fileName?: string;
  mimeType?: string;
  voiceName: string;
  consentConfirmed: boolean;
  voiceLock?: boolean;
  language?: string;
  forceProvider?: "mock" | "elevenlabs";
}): Promise<{ ok: true; data: CloneCharacterVoiceResult } | { error: ServiceError }> {
  if (!params.consentConfirmed) {
    return {
      error: serviceError(
        "CONSENT_REQUIRED",
        "Confirm you have permission to use this voice before cloning.",
        400
      ),
    };
  }

  const validation = validateVoiceSampleUpload({
    buffer: params.sampleBuffer,
    fileName: params.fileName,
    mimeType: params.mimeType,
  });
  if (!validation.ok) {
    return { error: serviceError(validation.code, validation.message, 400) };
  }

  const row = await prisma.studioCharacter.findUnique({ where: { id: params.characterId } });
  if (!row) {
    return { error: serviceError("NOT_FOUND", "Character not found.", 404) };
  }
  if (row.ownerId !== params.viewer.id && params.viewer.role !== "admin") {
    return { error: serviceError("FORBIDDEN", "Forbidden.", 403) };
  }

  const voiceName = params.voiceName.trim().slice(0, 120) || row.name;
  const language = (params.language ?? row.voiceLanguage ?? "en").trim().toLowerCase().slice(0, 2);
  const sampleId = randomUUID();

  try {
    await uploadCharacterVoiceSample({
      ownerId: row.ownerId,
      characterId: row.id,
      sampleId,
      audioBuffer: params.sampleBuffer,
      contentType: validation.contentType,
      extension: validation.extension,
    });
  } catch {
    return {
      error: serviceError("UPLOAD_FAILED", "Could not store the voice sample. Try again.", 502),
    };
  }

  const provider = selectVoiceCloneProvider(params.forceProvider);
  let cloneResult;
  try {
    cloneResult = await provider.clone({
      name: voiceName,
      description: `HomeCheff Studio clone for ${row.name}`,
      sampleBuffer: params.sampleBuffer,
      sampleFileName: params.fileName?.trim() || `sample.${validation.extension}`,
      sampleContentType: validation.contentType,
      languageCode: language,
    });
  } catch {
    return {
      error: serviceError(
        "CLONE_FAILED",
        provider.id === "mock"
          ? "Voice clone failed in mock mode."
          : "Voice clone failed. Check your sample and ElevenLabs plan, then try again.",
        502
      ),
    };
  }

  const updated = await prisma.studioCharacter.update({
    where: { id: row.id },
    data: {
      voiceEnabled: true,
      voiceProvider: "elevenlabs",
      voiceProfile: cloneResult.voiceProfileRef,
      voiceDescription: voiceName,
      voiceLanguage: language,
      voiceLock: params.voiceLock ?? row.voiceLock,
      voiceNotes: row.voiceNotes?.trim()
        ? `${row.voiceNotes.trim()}\nCloned voice: ${voiceName}`
        : `Cloned voice: ${voiceName}`,
    },
  });

  await appendCharacterVoiceHistoryIfChanged(
    row.id,
    row,
    updated,
    "voice_clone_applied"
  );

  let previewAudioUrl: string | null = null;
  let previewDurationSeconds: number | null = null;
  const preview = await generateCharacterVoicePreview({
    characterId: row.id,
    ownerId: row.ownerId,
    language,
  });
  if ("ok" in preview && preview.ok) {
    previewAudioUrl = preview.audioUrl;
    previewDurationSeconds = preview.durationSeconds;
  }

  return {
    ok: true,
    data: {
      characterId: updated.id,
      voiceProfileRef: cloneResult.voiceProfileRef,
      clonedVoiceName: voiceName,
      provider: provider.id,
      previewAudioUrl,
      previewDurationSeconds,
      character: mapStudioCharacterToDetail(updated),
    },
  };
}
