import { prisma } from "@/lib/prisma";
import { characterVoiceSnapshotFromRow } from "@/lib/studio-character-voice";
import type { StudioCharacter } from "@prisma/client";

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
  eventType: "voice_profile_updated" | "voice_lock_changed"
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
