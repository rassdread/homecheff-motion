import { randomUUID } from "node:crypto";
import { registerUserVoiceClone } from "@/lib/studio-user-voice-library";
import { validateVoiceSampleUpload } from "@/lib/studio-voice-sample-validation";
import { resolveProviderVoiceIdFromProfile } from "@/lib/studio-voice-profile-ref";
import { prisma } from "@/lib/prisma";
import { appendCharacterVoiceHistoryIfChanged } from "@/server/studio/studio-character-voice-history";
import { uploadCharacterVoiceSample } from "@/server/studio/studio-voice-sample-blob";
import { selectVoiceCloneProvider } from "@/server/studio/speech/voice-clone-provider";
import { generateCharacterVoicePreviewDraft } from "@/server/studio/generate-character-voice-preview";
import { mapStudioCharacterToDetail } from "@/server/studio/studio-character-service";
import type { ServiceError } from "@/server/studio/studio-storyboard-service";
import type { SessionUser } from "@/server/auth/session";

function serviceError(code: string, message: string, httpStatus: number): ServiceError {
  return { code, message, httpStatus };
}

export type CreateUserVoiceCloneResult = {
  cloneId: string;
  voiceProfileRef: string;
  clonedVoiceName: string;
  provider: string;
  previewAudioUrl: string | null;
  previewDurationSeconds: number | null;
  language: string;
  linkedCharacter?: ReturnType<typeof mapStudioCharacterToDetail>;
};

export async function createUserVoiceClone(params: {
  viewer: Pick<SessionUser, "id" | "role">;
  sampleBuffer: Buffer;
  fileName?: string;
  mimeType?: string;
  voiceName: string;
  consentConfirmed: boolean;
  language?: string;
  linkCharacterId?: string;
  voiceLock?: boolean;
  forceProvider?: "mock" | "elevenlabs";
}): Promise<{ ok: true; data: CreateUserVoiceCloneResult } | { error: ServiceError }> {
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

  const ownerId = params.viewer.id;
  const voiceName = params.voiceName.trim().slice(0, 120) || "My voice";
  const language = (params.language ?? "en").trim().toLowerCase().slice(0, 2);
  const sampleId = randomUUID();
  const storageCharacterId = params.linkCharacterId?.trim() || `owner-${ownerId}`;

  try {
    await uploadCharacterVoiceSample({
      ownerId,
      characterId: storageCharacterId,
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
      description: `HomeCheff Studio clone — ${voiceName}`,
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

  const cloneId = resolveProviderVoiceIdFromProfile(cloneResult.voiceProfileRef);
  if (!cloneId) {
    return { error: serviceError("CLONE_FAILED", "Voice clone did not return a valid id.", 502) };
  }

  let previewAudioUrl: string | null = null;
  let previewDurationSeconds: number | null = null;
  const preview = await generateCharacterVoicePreviewDraft({
    ownerId,
    characterName: voiceName,
    voiceProfile: cloneResult.voiceProfileRef,
    voiceLanguage: language,
  });
  if ("ok" in preview && preview.ok) {
    previewAudioUrl = preview.audioUrl;
    previewDurationSeconds = preview.durationSeconds;
  }

  await registerUserVoiceClone({
    ownerId,
    cloneId,
    name: voiceName,
    voiceProfileRef: cloneResult.voiceProfileRef,
    previewUrl: previewAudioUrl,
    language,
    provider: provider.id,
    sourceCharacterId: params.linkCharacterId,
    sampleStorageKey: `studio/${ownerId}/characters/${storageCharacterId}/voice-samples/${sampleId}.${validation.extension}`,
  });

  let linkedCharacter: ReturnType<typeof mapStudioCharacterToDetail> | undefined;
  if (params.linkCharacterId) {
    const row = await prisma.studioCharacter.findFirst({
      where: { id: params.linkCharacterId, ownerId },
    });
    if (row) {
      const updated = await prisma.studioCharacter.update({
        where: { id: row.id },
        data: {
          voiceEnabled: true,
          voiceProvider: "elevenlabs",
          voiceProfile: cloneResult.voiceProfileRef,
          voiceDescription: voiceName,
          voiceLanguage: language,
          voiceLock: params.voiceLock ?? row.voiceLock,
        },
      });
      await appendCharacterVoiceHistoryIfChanged(
        row.id,
        row,
        updated,
        "voice_clone_applied"
      );
      linkedCharacter = mapStudioCharacterToDetail(updated);
    }
  }

  return {
    ok: true,
    data: {
      cloneId,
      voiceProfileRef: cloneResult.voiceProfileRef,
      clonedVoiceName: voiceName,
      provider: provider.id,
      previewAudioUrl,
      previewDurationSeconds,
      language,
      linkedCharacter,
    },
  };
}
