import { registerUserVoiceClone } from "@/lib/studio-user-voice-library";
import { resolveProviderVoiceIdFromProfile } from "@/lib/studio-voice-profile-ref";
import { createUserVoiceClone } from "@/server/studio/create-user-voice-clone";
import { mapStudioCharacterToDetail } from "@/server/studio/studio-character-service";
import type { ServiceError } from "@/server/studio/studio-storyboard-service";
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
  const result = await createUserVoiceClone({
    viewer: params.viewer,
    sampleBuffer: params.sampleBuffer,
    fileName: params.fileName,
    mimeType: params.mimeType,
    voiceName: params.voiceName,
    consentConfirmed: params.consentConfirmed,
    language: params.language,
    linkCharacterId: params.characterId,
    voiceLock: params.voiceLock,
    forceProvider: params.forceProvider,
  });

  if ("error" in result) {
    return result;
  }

  if (!result.data.linkedCharacter) {
    return { error: serviceError("NOT_FOUND", "Character not found.", 404) };
  }

  return {
    ok: true,
    data: {
      characterId: result.data.linkedCharacter.id,
      voiceProfileRef: result.data.voiceProfileRef,
      clonedVoiceName: result.data.clonedVoiceName,
      provider: result.data.provider,
      previewAudioUrl: result.data.previewAudioUrl,
      previewDurationSeconds: result.data.previewDurationSeconds,
      character: result.data.linkedCharacter,
    },
  };
}

/** Backfill manifest entry when an existing character already has a clone ref. */
export async function ensureUserVoiceCloneRegistered(params: {
  ownerId: string;
  voiceProfileRef: string;
  name: string;
  language: string;
  sourceCharacterId?: string;
}): Promise<void> {
  const cloneId = resolveProviderVoiceIdFromProfile(params.voiceProfileRef);
  if (!cloneId) {
    return;
  }
  await registerUserVoiceClone({
    ownerId: params.ownerId,
    cloneId,
    name: params.name,
    voiceProfileRef: params.voiceProfileRef,
    language: params.language,
    provider: "elevenlabs",
    sourceCharacterId: params.sourceCharacterId,
  });
}
