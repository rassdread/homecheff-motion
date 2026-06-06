import { prisma } from "@/lib/prisma";
import { characterVoiceSnapshotFromRow } from "@/lib/studio-character-voice";
import { getVoiceProfilePreset } from "@/lib/studio-voice-profiles";
import type { CharacterVoiceProfileSnapshot } from "@/types/studio-character-voice";
import type { StudioCharacter } from "@prisma/client";

export type CharacterVoiceHistoryEntry = {
  id: string;
  eventType: string;
  createdAt: string;
  before: CharacterVoiceProfileSnapshot;
  after: CharacterVoiceProfileSnapshot;
};

function parseSnapshot(value: unknown): CharacterVoiceProfileSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const row = value as Record<string, unknown>;
  return characterVoiceSnapshotFromRow({
    voiceEnabled: Boolean(row.voiceEnabled),
    voiceProvider: typeof row.voiceProvider === "string" ? row.voiceProvider : "",
    voiceProfile: typeof row.voiceProfile === "string" ? row.voiceProfile : "",
    voiceLanguage: typeof row.voiceLanguage === "string" ? row.voiceLanguage : "en",
    voiceGender: typeof row.voiceGender === "string" ? row.voiceGender : "",
    voiceDescription: typeof row.voiceDescription === "string" ? row.voiceDescription : "",
    voiceNotes: typeof row.voiceNotes === "string" ? row.voiceNotes : "",
    voiceLock: Boolean(row.voiceLock),
    voiceProfilesJson: row.voiceProfilesByLanguage ?? null,
  });
}

export function voiceProfileLabelKey(profileId: string): string {
  return getVoiceProfilePreset(profileId).labelKey;
}

export async function listCharacterVoiceHistory(
  characterId: string,
  limit = 20
): Promise<CharacterVoiceHistoryEntry[]> {
  const rows = await prisma.studioCharacterVoiceHistory.findMany({
    where: { characterId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.flatMap((row) => {
    const json = row.snapshotJson;
    if (!json || typeof json !== "object" || Array.isArray(json)) {
      return [];
    }
    const payload = json as Record<string, unknown>;
    const before = parseSnapshot(payload.before);
    const after = parseSnapshot(payload.after);
    if (!before || !after) {
      return [];
    }
    return [
      {
        id: row.id,
        eventType: row.eventType,
        createdAt: row.createdAt.toISOString(),
        before,
        after,
      },
    ];
  });
}

export async function appendCharacterVoiceHistoryIfChanged(
  characterId: string,
  before: Pick<
    StudioCharacter,
    | "voiceEnabled"
    | "voiceProvider"
    | "voiceProfile"
    | "voiceLanguage"
    | "voiceGender"
    | "voiceDescription"
    | "voiceNotes"
    | "voiceLock"
    | "voiceProfilesJson"
  >,
  after: typeof before,
  eventType: "voice_profile_updated" | "voice_lock_changed" | "voice_clone_applied"
): Promise<void> {
  const snapBefore = JSON.stringify(characterVoiceSnapshotFromRow(before));
  const snapAfter = JSON.stringify(characterVoiceSnapshotFromRow(after));
  if (snapBefore === snapAfter) {
    return;
  }
  await prisma.studioCharacterVoiceHistory.create({
    data: {
      characterId,
      eventType,
      snapshotJson: {
        before: characterVoiceSnapshotFromRow(before),
        after: characterVoiceSnapshotFromRow(after),
        at: new Date().toISOString(),
      },
    },
  });
}
