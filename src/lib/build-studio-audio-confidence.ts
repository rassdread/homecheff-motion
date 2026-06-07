/**
 * Audio confidence summary — what will be used at render time.
 */

import { buildMusicDirectorPlan } from "@/lib/studio-music-director";
import { buildSoundDirectorPlan } from "@/lib/studio-sound-director";
import { buildVoiceIdentityPlan } from "@/lib/studio-voice-identity-director";
import { voiceProfileLabelKeyForPlanning } from "@/lib/studio-voice-profile-ref";
import type { StudioCharacterListItem, StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";

export type StudioAudioConfidence = {
  voice: {
    enabled: boolean;
    summary: string;
    lockedCount: number;
    lockedNames: string[];
  };
  music: {
    enabled: boolean;
    mood: string;
    sceneCue: string | null;
  };
  sound: {
    enabled: boolean;
    environment: string | null;
  };
};

export function buildStudioAudioConfidence(
  storyboard: StudioStoryboardDetail,
  scene: StudioSceneDetail,
  characters: StudioCharacterListItem[]
): StudioAudioConfidence {
  const voicePlan = buildVoiceIdentityPlan(storyboard);
  const musicPlan = buildMusicDirectorPlan(storyboard);
  const soundPlan = buildSoundDirectorPlan(storyboard);
  const sceneMusic = musicPlan.sceneCues.find((c) => c.sceneId === scene.id);
  const sceneSound = soundPlan.sceneCues.find((c) => c.sceneId === scene.id);

  const lockedCharacters = characters.filter(
    (c) => c.voiceLock && scene.characters.some((link) => link.id === c.id)
  );

  const lockedNames = lockedCharacters.map((c) => {
    const labelKey = voiceProfileLabelKeyForPlanning(c.voiceProfile);
    const shortLabel = labelKey.split(".").pop()?.replace(/_/g, " ") ?? c.voiceProfile;
    const display =
      c.voiceDescription?.trim() ||
      (labelKey === "studio.voiceClone.clonedVoice" ? "cloned voice" : shortLabel);
    return `${c.name} (${display})`;
  });

  const musicMood =
    sceneMusic
      ? `${sceneMusic.cueType.replace(/_/g, " ")} · ${sceneMusic.energyTarget.replace(/_/g, " ")}`
      : musicPlan.narrativeSummary || "—";

  const environment =
    sceneSound?.environmentSounds.map((s) => s.replace(/_/g, " ")).join(", ") ||
    scene.soundEnvironmentOverride?.replace(/_/g, " ") ||
    null;

  return {
    voice: {
      enabled: storyboard.voiceEnabled,
      summary: voicePlan.identitySummary || "—",
      lockedCount: lockedCharacters.length,
      lockedNames,
    },
    music: {
      enabled: storyboard.musicEnabled,
      mood: musicMood,
      sceneCue: sceneMusic ? sceneMusic.cueType.replace(/_/g, " ") : null,
    },
    sound: {
      enabled: storyboard.soundEnabled,
      environment,
    },
  };
}
