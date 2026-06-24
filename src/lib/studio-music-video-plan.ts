/**
 * Music video production plan — sections, scenes, renders, credits.
 */

import type {
  AudioAnalysisProfile,
  MusicVideoProductionPlan,
  MusicVideoSection,
  MusicVideoSectionId,
} from "@/types/studio-video-production";

const MUSIC_SECTION_IDS: MusicVideoSectionId[] = [
  "intro",
  "verse_1",
  "chorus_1",
  "verse_2",
  "chorus_2",
  "bridge",
  "finale",
];

function sceneCountForSection(durationSeconds: number, energy: MusicVideoSection["energy"]): number {
  const sectionDur = durationSeconds;
  if (sectionDur < 8) return 1;
  if (energy === "peak") return Math.max(1, Math.ceil(sectionDur / 12));
  if (energy === "high") return Math.max(1, Math.ceil(sectionDur / 15));
  return Math.max(1, Math.ceil(sectionDur / 20));
}

export function buildMusicVideoProductionPlan(params: {
  audioProfile: AudioAnalysisProfile;
  sceneDurationSeconds?: number;
}): MusicVideoProductionPlan {
  const audio = params.audioProfile;

  const sections: MusicVideoSection[] = audio.sections
    .filter((s) => MUSIC_SECTION_IDS.includes(s.id as MusicVideoSectionId))
    .map((s) => {
      const dur = s.endSeconds - s.startSeconds;
      const sceneCount = sceneCountForSection(dur, s.energy);
      return {
        id: s.id as MusicVideoSectionId,
        label: s.label,
        startSeconds: s.startSeconds,
        endSeconds: s.endSeconds,
        energy: s.energy,
        sceneCount,
      };
    });

  const sceneCount = sections.reduce((sum, s) => sum + s.sceneCount, 0);
  const renderCount = sceneCount;
  const estimatedDurationSeconds = audio.durationSeconds;
  const sceneDurationSeconds =
    params.sceneDurationSeconds ??
    Math.max(5, Math.min(30, Math.floor(estimatedDurationSeconds / Math.max(1, sceneCount))));

  const imageCredits = sceneCount * 4;
  const renderCredits = renderCount * 8;
  const publishCredits = 5;
  const estimatedCredits = imageCredits + renderCredits + publishCredits;
  const estimatedRenderMinutes = Math.ceil((renderCount * sceneDurationSeconds) / 60) + 2;

  const batchSize = 6;
  const batchCount = Math.ceil(renderCount / batchSize);

  return {
    intent: "music_video",
    audioProfile: audio,
    sections,
    sceneCount,
    renderCount,
    sceneDurationSeconds,
    estimatedCredits,
    estimatedRenderMinutes,
    estimatedDurationSeconds,
    requiredAssets: [
      { kind: "music_track", required: true, satisfied: true },
      { kind: "hero_character", required: false, satisfied: false },
      { kind: "location", required: false, satisfied: false },
      { kind: "scene_images", required: true, satisfied: false },
    ],
    mergePlan: {
      batchCount,
      segmentsPerBatch: batchSize,
      ffmpegMergeRequired: renderCount > 1,
    },
  };
}
