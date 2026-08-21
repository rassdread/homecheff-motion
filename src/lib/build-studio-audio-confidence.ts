/**
 * Audio confidence summary — what will be used at render time.
 * S2E: reflects timeline readiness, not only director metadata.
 */

import { buildMusicDirectorPlan } from "@/lib/studio-music-director";
import { buildSoundDirectorPlan } from "@/lib/studio-sound-director";
import { buildVoiceIdentityPlan } from "@/lib/studio-voice-identity-director";
import { resolveStudioAudioTimeline } from "@/lib/studio-audio-timeline-resolve";
import { voiceProfileLabelKeyForPlanning } from "@/lib/studio-voice-profile-ref";
import type { StudioCharacterListItem, StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";

export type StudioAudioConfidence = {
  voice: {
    enabled: boolean;
    summary: string;
    lockedCount: number;
    lockedNames: string[];
    ready: boolean;
  };
  music: {
    enabled: boolean;
    mood: string;
    sceneCue: string | null;
    ready: boolean;
  };
  sound: {
    enabled: boolean;
    environment: string | null;
    sfxCueCount: number;
    ambienceReady: boolean;
  };
  timeline: {
    valid: boolean;
    hash: string | null;
    statuses: string[];
  };
  mix: {
    ready: boolean;
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

  const timeline = resolveStudioAudioTimeline({
    projectId: storyboard.id,
    scenes: storyboard.scenes.map((s) => ({
      id: s.id,
      order: s.order,
      durationSeconds: s.durationSeconds,
      musicTransitionType: s.musicTransitionType,
    })),
    voiceEnabled: storyboard.voiceEnabled,
    musicEnabled: storyboard.musicEnabled,
    musicMood: storyboard.musicNotes || null,
    soundEnabled: storyboard.soundEnabled,
    soundNotes: storyboard.soundNotes,
    sfxSuggestions: [],
    duckingMode: scene.duckingMode,
  });

  const voiceReady =
    !storyboard.voiceEnabled ||
    timeline.tracks.voice.length > 0 ||
    Boolean(voicePlan.identitySummary);
  const musicReady =
    !storyboard.musicEnabled ||
    timeline.tracks.music.length > 0 ||
    Boolean(musicPlan.profileId);
  const mixReady =
    timeline.statuses.includes("READY") ||
    timeline.tracks.voice.length + timeline.tracks.music.length > 0;

  return {
    voice: {
      enabled: storyboard.voiceEnabled,
      summary: voicePlan.identitySummary || "—",
      lockedCount: lockedCharacters.length,
      lockedNames,
      ready: voiceReady,
    },
    music: {
      enabled: storyboard.musicEnabled,
      mood: musicMood,
      sceneCue: sceneMusic ? sceneMusic.cueType.replace(/_/g, " ") : null,
      ready: musicReady,
    },
    sound: {
      enabled: storyboard.soundEnabled,
      environment,
      sfxCueCount: timeline.tracks.sfx.length,
      ambienceReady: timeline.tracks.ambience.length > 0,
    },
    timeline: {
      valid: !timeline.statuses.includes("TIMING_CONFLICT"),
      hash: timeline.timelineHash,
      statuses: timeline.statuses,
    },
    mix: {
      ready: mixReady,
    },
  };
}
