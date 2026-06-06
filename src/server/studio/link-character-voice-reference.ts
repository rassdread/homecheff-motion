import { parseCharacterVoiceProfilesJson } from "@/lib/studio-character-voice";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import { appendCharacterVoiceHistoryIfChanged } from "@/server/studio/studio-character-voice-history";
import { mapStudioCharacterToDetail } from "@/server/studio/studio-character-service";
import type { ServiceError } from "@/server/studio/studio-storyboard-service";
import { isStudioVoiceExecutionLanguage } from "@/types/studio-voice-execution";

function serviceError(code: string, message: string, httpStatus: number): ServiceError {
  return { code, message, httpStatus };
}

function isValidAudioUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export type LinkCharacterVoiceReferenceResult = {
  characterId: string;
  language: string;
  referenceAudioUrl: string;
  character: ReturnType<typeof mapStudioCharacterToDetail>;
};

export async function linkCharacterVoiceReference(params: {
  characterId: string;
  viewer: Pick<SessionUser, "id" | "role">;
  audioUrl: string;
  language?: string;
  label?: string;
}): Promise<
  { ok: true; data: LinkCharacterVoiceReferenceResult } | { error: ServiceError }
> {
  const audioUrl = params.audioUrl.trim();
  if (!audioUrl || !isValidAudioUrl(audioUrl)) {
    return {
      error: serviceError("INVALID_AUDIO_URL", "Provide a valid audio URL.", 400),
    };
  }

  const existing = await prisma.studioCharacter.findUnique({ where: { id: params.characterId } });
  if (!existing) {
    return { error: serviceError("NOT_FOUND", "Character not found.", 404) };
  }
  if (existing.ownerId !== params.viewer.id && params.viewer.role !== "admin") {
    return { error: serviceError("FORBIDDEN", "Forbidden.", 403) };
  }

  const languageRaw = (params.language ?? existing.voiceLanguage ?? "en")
    .trim()
    .toLowerCase()
    .slice(0, 2);
  const language = isStudioVoiceExecutionLanguage(languageRaw) ? languageRaw : "en";
  const profiles = parseCharacterVoiceProfilesJson(existing.voiceProfilesJson);
  const previous = profiles[language] ?? {};
  profiles[language] = {
    ...previous,
    referenceAudioUrl: audioUrl,
    referenceAudioLabel: params.label?.trim() || previous.referenceAudioLabel,
  };

  const row = await prisma.studioCharacter.update({
    where: { id: existing.id },
    data: { voiceProfilesJson: profiles },
  });

  await appendCharacterVoiceHistoryIfChanged(
    existing.id,
    existing,
    row,
    "voice_reference_linked"
  );

  return {
    ok: true,
    data: {
      characterId: row.id,
      language,
      referenceAudioUrl: audioUrl,
      character: mapStudioCharacterToDetail(row),
    },
  };
}
