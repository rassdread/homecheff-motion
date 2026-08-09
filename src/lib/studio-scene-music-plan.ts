/**
 * S.7D — Scene music planning (metadata only — no generation).
 */

import type { StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";
import { parseStoryboardAudioAssetLinks } from "@/lib/studio-storyboard-audio-asset-links";

export type StudioSceneMusicPlan = {
  version: "7d.1";
  sceneId: string;
  sceneOrder: number;
  musicThemeAssetId: string | null;
  musicEmotion: string | null;
  musicIntensity: string | null;
  musicTiming: {
    startBehavior: string | null;
    endBehavior: string | null;
    transitionType: string | null;
  };
  musicPurpose: string | null;
  /** Planning only — GenerationJob owns execution */
  generatesImmediately: false;
};

export type StudioStoryboardSceneMusicPlan = {
  version: "7d.1";
  storyboardId: string;
  projectMusicAssetId: string | null;
  scenes: StudioSceneMusicPlan[];
};

export function buildSceneMusicPlan(
  scene: StudioSceneDetail,
  projectMusicAssetId: string | null
): StudioSceneMusicPlan {
  return {
    version: "7d.1",
    sceneId: scene.id,
    sceneOrder: scene.order,
    musicThemeAssetId: scene.musicAssetOverride?.trim() || projectMusicAssetId,
    musicEmotion: scene.emotion?.trim() || null,
    musicIntensity: scene.musicEnergyTarget?.trim() || scene.musicPriority?.trim() || null,
    musicTiming: {
      startBehavior: scene.musicStartBehavior?.trim() || null,
      endBehavior: scene.musicEndBehavior?.trim() || null,
      transitionType: scene.musicTransitionType?.trim() || null,
    },
    musicPurpose: scene.musicCueType?.trim() || null,
    generatesImmediately: false,
  };
}

export function buildStoryboardSceneMusicPlan(
  storyboard: StudioStoryboardDetail
): StudioStoryboardSceneMusicPlan {
  const links = parseStoryboardAudioAssetLinks(storyboard.audioAssetLinks);
  const projectMusicAssetId = links.musicAssetId ?? null;
  return {
    version: "7d.1",
    storyboardId: storyboard.id,
    projectMusicAssetId,
    scenes: storyboard.scenes.map((s) => buildSceneMusicPlan(s, projectMusicAssetId)),
  };
}
