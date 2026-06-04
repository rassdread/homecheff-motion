import {
  resolveSceneShotType,
  type StudioCameraMovement,
  type StudioSceneEnergy,
  type StudioShotType,
} from "@/lib/studio-scene-director";

export type StoryFlowSceneInput = {
  sceneId: string;
  order: number;
  title: string;
  shotType?: string;
  cameraMovement?: string;
  sceneEnergy?: string;
  camera?: string;
};

export type StoryFlowWarningCode =
  | "repeated_shot_streak"
  | "repeated_movement_streak"
  | "repeated_energy_streak"
  | "low_shot_variety";

export type StoryFlowWarning = {
  code: StoryFlowWarningCode;
  message: string;
  sceneIds: string[];
  /** i18n key for UI */
  messageKey: string;
};

export type CameraTimelineEntry = {
  sceneId: string;
  order: number;
  title: string;
  shotLabelKey: string;
  shotValue: string;
  movementLabelKey: string;
  movementValue: string;
  energyValue: string;
};

export type StoryFlowAnalysis = {
  timeline: CameraTimelineEntry[];
  warnings: StoryFlowWarning[];
  shotDiversityScore: number;
  uniqueShots: number;
  uniqueMovements: number;
  uniqueEnergies: number;
};

const STREAK_THRESHOLD = 3;

function resolvedShot(scene: StoryFlowSceneInput): StudioShotType | "" {
  return resolveSceneShotType(scene.shotType, scene.camera);
}

function shotKey(scene: StoryFlowSceneInput): string {
  return resolvedShot(scene) || "unset";
}

function movementKey(scene: StoryFlowSceneInput): string {
  const m = scene.cameraMovement?.trim().toLowerCase().replace(/\s+/g, "_") ?? "";
  return m || "unset";
}

function energyKey(scene: StoryFlowSceneInput): string {
  const e = scene.sceneEnergy?.trim().toLowerCase() ?? "";
  return e || "neutral";
}

function findStreak(
  scenes: StoryFlowSceneInput[],
  keyFn: (s: StoryFlowSceneInput) => string
): { key: string; sceneIds: string[] } | null {
  if (scenes.length < STREAK_THRESHOLD) {
    return null;
  }
  let streakKey = keyFn(scenes[0]!);
  let streakIds = [scenes[0]!.sceneId];
  for (let i = 1; i < scenes.length; i++) {
    const scene = scenes[i]!;
    const key = keyFn(scene);
    if (key === streakKey && key !== "unset") {
      streakIds.push(scene.sceneId);
    } else {
      if (streakIds.length >= STREAK_THRESHOLD) {
        return { key: streakKey, sceneIds: [...streakIds] };
      }
      streakKey = key;
      streakIds = [scene.sceneId];
    }
  }
  if (streakIds.length >= STREAK_THRESHOLD && streakKey !== "unset") {
    return { key: streakKey, sceneIds: streakIds };
  }
  return null;
}

/**
 * 0–100 — higher means more varied shot framing across the storyboard.
 */
export function computeShotDiversityScore(scenes: StoryFlowSceneInput[]): number {
  const ordered = [...scenes].sort((a, b) => a.order - b.order);
  if (ordered.length === 0) {
    return 0;
  }
  const keys = ordered.map(shotKey);
  const unsetCount = keys.filter((k) => k === "unset").length;
  const defined = keys.filter((k) => k !== "unset");
  const unique = new Set(defined).size;
  if (defined.length === 0) {
    return 0;
  }
  const varietyRatio = unique / defined.length;
  const coveragePenalty = Math.round((unsetCount / ordered.length) * 25);
  const streak = findStreak(ordered, shotKey);
  const streakPenalty = streak ? 20 : 0;
  const raw = Math.round(varietyRatio * 100) - coveragePenalty - streakPenalty;
  return Math.max(0, Math.min(100, raw));
}

export function buildCameraTimeline(scenes: StoryFlowSceneInput[]): CameraTimelineEntry[] {
  return [...scenes]
    .sort((a, b) => a.order - b.order)
    .map((scene) => {
      const shot = resolvedShot(scene);
      const movement = (scene.cameraMovement?.trim() || "") as StudioCameraMovement | "";
      return {
        sceneId: scene.sceneId,
        order: scene.order,
        title: scene.title,
        shotLabelKey: shot
          ? (`studio.director.shot.${shot}` as const)
          : ("studio.director.shot.unset" as const),
        shotValue: shot,
        movementLabelKey: movement
          ? (`studio.director.movement.${movement}` as const)
          : ("studio.director.movement.unset" as const),
        movementValue: movement,
        energyValue: energyKey(scene),
      };
    });
}

export function analyzeStoryFlow(scenes: StoryFlowSceneInput[]): StoryFlowAnalysis {
  const ordered = [...scenes].sort((a, b) => a.order - b.order);
  const warnings: StoryFlowWarning[] = [];

  const shotStreak = findStreak(ordered, shotKey);
  if (shotStreak) {
    warnings.push({
      code: "repeated_shot_streak",
      messageKey: "studio.director.warning.repeatedShots",
      message: `Too many similar shots in a row (${shotStreak.key}). Recommend variation.`,
      sceneIds: shotStreak.sceneIds,
    });
  }

  const movementStreak = findStreak(ordered, movementKey);
  if (movementStreak && movementStreak.key !== "static") {
    warnings.push({
      code: "repeated_movement_streak",
      messageKey: "studio.director.warning.repeatedMovement",
      message: "Repeated camera movement pattern detected.",
      sceneIds: movementStreak.sceneIds,
    });
  }

  const energyStreak = findStreak(ordered, energyKey);
  if (energyStreak) {
    warnings.push({
      code: "repeated_energy_streak",
      messageKey: "studio.director.warning.repeatedEnergy",
      message: "Scene energy lacks pacing variation.",
      sceneIds: energyStreak.sceneIds,
    });
  }

  const diversity = computeShotDiversityScore(ordered);
  if (ordered.length >= 3 && diversity < 45) {
    warnings.push({
      code: "low_shot_variety",
      messageKey: "studio.director.warning.lowVariety",
      message: "Shot diversity is low — add framing variation between scenes.",
      sceneIds: ordered.map((s) => s.sceneId),
    });
  }

  const shots = ordered.map(shotKey).filter((k) => k !== "unset");
  const movements = ordered.map(movementKey).filter((k) => k !== "unset");

  return {
    timeline: buildCameraTimeline(ordered),
    warnings,
    shotDiversityScore: diversity,
    uniqueShots: new Set(shots).size,
    uniqueMovements: new Set(movements).size,
    uniqueEnergies: new Set(ordered.map(energyKey)).size,
  };
}
