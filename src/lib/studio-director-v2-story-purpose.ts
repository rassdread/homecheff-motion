import type { StoryArcPhase } from "@/lib/studio-story-arc";
import { detectArcPhaseForIndex } from "@/lib/studio-story-arc";
import type {
  StudioCameraMovement,
  StudioSceneEnergy,
  StudioShotType,
} from "@/lib/studio-scene-director";
import { legacyCameraFromShotType } from "@/lib/studio-scene-director";

export const STUDIO_DIRECTOR_V2_STORY_PURPOSES = [
  "introduction",
  "problem",
  "discovery",
  "transformation",
  "solution",
  "finale",
] as const;

export type StudioDirectorV2StoryPurpose = (typeof STUDIO_DIRECTOR_V2_STORY_PURPOSES)[number];

export type StoryPurposeScenePatch = {
  shotType: StudioShotType;
  cameraMovement: StudioCameraMovement;
  sceneEnergy: StudioSceneEnergy;
  emotion: string;
  camera: string;
};

const PURPOSE_TO_ARC: Record<StudioDirectorV2StoryPurpose, StoryArcPhase> = {
  introduction: "opening",
  problem: "discovery",
  discovery: "discovery",
  transformation: "build_up",
  solution: "climax",
  finale: "resolution",
};

const ARC_TO_PURPOSE: Partial<Record<StoryArcPhase, StudioDirectorV2StoryPurpose>> = {
  opening: "introduction",
  discovery: "discovery",
  build_up: "transformation",
  transition: "transformation",
  climax: "solution",
  resolution: "finale",
  outro: "finale",
};

const PURPOSE_PATCHES: Record<StudioDirectorV2StoryPurpose, StoryPurposeScenePatch> = {
  introduction: {
    shotType: "wide",
    cameraMovement: "push_in",
    sceneEnergy: "calm",
    emotion: "curious",
    camera: legacyCameraFromShotType("wide") ?? "wide_shot",
  },
  problem: {
    shotType: "medium",
    cameraMovement: "static",
    sceneEnergy: "neutral",
    emotion: "serious",
    camera: legacyCameraFromShotType("medium") ?? "medium_shot",
  },
  discovery: {
    shotType: "medium",
    cameraMovement: "tracking",
    sceneEnergy: "dynamic",
    emotion: "curious",
    camera: legacyCameraFromShotType("medium") ?? "medium_shot",
  },
  transformation: {
    shotType: "medium_close_up",
    cameraMovement: "push_in",
    sceneEnergy: "dynamic",
    emotion: "focused",
    camera: legacyCameraFromShotType("medium_close_up") ?? "close_up",
  },
  solution: {
    shotType: "close_up",
    cameraMovement: "crane",
    sceneEnergy: "intense",
    emotion: "proud",
    camera: legacyCameraFromShotType("close_up") ?? "close_up",
  },
  finale: {
    shotType: "wide",
    cameraMovement: "pull_out",
    sceneEnergy: "calm",
    emotion: "celebrating",
    camera: legacyCameraFromShotType("wide") ?? "wide_shot",
  },
};

export function inferStoryPurposeForScene(
  sceneIndex: number,
  sceneCount: number
): StudioDirectorV2StoryPurpose {
  const arc = detectArcPhaseForIndex(sceneIndex, sceneCount);
  return ARC_TO_PURPOSE[arc] ?? "discovery";
}

export function storyPurposePatch(purpose: StudioDirectorV2StoryPurpose): StoryPurposeScenePatch {
  return PURPOSE_PATCHES[purpose];
}

export function storyPurposeArcPhase(purpose: StudioDirectorV2StoryPurpose): StoryArcPhase {
  return PURPOSE_TO_ARC[purpose];
}

/** Map scene energy slider (0–2) to stored energy. */
export function sceneEnergyFromSlider(level: 0 | 1 | 2): StudioSceneEnergy {
  if (level === 0) {
    return "calm";
  }
  if (level === 2) {
    return "intense";
  }
  return "dynamic";
}

export function sliderFromSceneEnergy(energy: string): 0 | 1 | 2 {
  switch (energy) {
    case "calm":
      return 0;
    case "intense":
      return 2;
    case "dynamic":
      return 2;
    default:
      return 1;
  }
}
