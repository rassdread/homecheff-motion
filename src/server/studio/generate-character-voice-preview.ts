import { prisma } from "@/lib/prisma";
import { normalizeStudioVoiceProfileId } from "@/lib/studio-voice-profiles";
import type { ServiceError } from "@/server/studio/studio-storyboard-service";
import { mapStudioCharacterToDetail } from "@/server/studio/studio-character-service";
import {
  characterVoiceSnapshotFromRow,
  resolveCharacterVoiceForLanguage,
} from "@/lib/studio-character-voice";
import {
  draftCharacterVoicePreviewStorageIds,
  synthesizeCharacterVoicePreview,
} from "@/server/studio/synthesize-character-voice-preview";

function serviceError(code: string, message: string, httpStatus: number): ServiceError {
  return { code, message, httpStatus };
}

export type CharacterVoicePreviewOverrides = {
  language?: string;
  sampleLine?: string;
  voiceProfile?: string;
  characterName?: string;
};

export async function generateCharacterVoicePreview(params: {
  characterId: string;
  ownerId: string;
} & CharacterVoicePreviewOverrides): Promise<
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
  const voiceProfileOverride = params.voiceProfile?.trim();
  const voiceProfile = normalizeStudioVoiceProfileId(
    voiceProfileOverride || snap.voiceProfile || "warm_narrator"
  );

  if (!params.voiceProfile && !snap.voiceEnabled && !snap.voiceProfile) {
    return {
      error: serviceError("VOICE_DISABLED", "Enable a voice profile on this character first.", 400),
    };
  }

  const characterName =
    params.characterName?.trim() || mapStudioCharacterToDetail(row).name || "Character";

  const synthesis = await synthesizeCharacterVoicePreview({
    ownerId: params.ownerId,
    characterName,
    voiceProfile,
    language,
    sampleLine: params.sampleLine,
    storageStoryboardId: `character-${row.id}`,
    storageAssetId: row.id,
  });

  if ("error" in synthesis) {
    return synthesis;
  }

  return {
    ok: true,
    audioUrl: synthesis.audioUrl,
    durationSeconds: synthesis.durationSeconds,
    provider: synthesis.provider,
  };
}

export async function generateCharacterVoicePreviewDraft(params: {
  ownerId: string;
  characterName: string;
  voiceProfile: string;
  voiceLanguage: string;
  sampleLine?: string;
}): Promise<
  | {
      ok: true;
      audioUrl: string;
      durationSeconds: number;
      provider: string;
      metadata: { script: string; voiceProfile: string; language: string };
    }
  | { error: ServiceError }
> {
  const characterName = params.characterName.trim();
  if (!characterName) {
    return {
      error: serviceError("CHARACTER_NAME_REQUIRED", "Enter a character name for preview.", 400),
    };
  }

  const voiceProfile = normalizeStudioVoiceProfileId(params.voiceProfile || "warm_narrator");
  const language = params.voiceLanguage.trim().toLowerCase().slice(0, 2) || "en";
  const { storageAssetId, storageStoryboardId } = draftCharacterVoicePreviewStorageIds(
    params.ownerId
  );

  const synthesis = await synthesizeCharacterVoicePreview({
    ownerId: params.ownerId,
    characterName,
    voiceProfile,
    language,
    sampleLine: params.sampleLine,
    storageStoryboardId,
    storageAssetId,
  });

  if ("error" in synthesis) {
    return synthesis;
  }

  return {
    ok: true,
    audioUrl: synthesis.audioUrl,
    durationSeconds: synthesis.durationSeconds,
    provider: synthesis.provider,
    metadata: {
      script: synthesis.script,
      voiceProfile: synthesis.voiceProfile,
      language: synthesis.language,
    },
  };
}
