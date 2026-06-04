/**
 * Studio V23 — per-scene shot type, camera movement, and scene energy.
 */

import { buildCameraPrompt } from "@/lib/studio-prompt-camera-builder";

export const STUDIO_SHOT_TYPES = [
  "extreme_wide",
  "wide",
  "medium_wide",
  "medium",
  "medium_close_up",
  "close_up",
  "extreme_close_up",
  "over_the_shoulder",
  "pov",
  "drone",
  "detail_shot",
] as const;

export type StudioShotType = (typeof STUDIO_SHOT_TYPES)[number];

export const STUDIO_CAMERA_MOVEMENTS = [
  "static",
  "push_in",
  "pull_out",
  "pan_left",
  "pan_right",
  "tilt_up",
  "tilt_down",
  "orbit",
  "follow",
  "tracking",
  "crane",
] as const;

export type StudioCameraMovement = (typeof STUDIO_CAMERA_MOVEMENTS)[number];

export const STUDIO_SCENE_ENERGIES = ["calm", "neutral", "dynamic", "intense"] as const;

export type StudioSceneEnergy = (typeof STUDIO_SCENE_ENERGIES)[number];

export const DEFAULT_STUDIO_SCENE_ENERGY: StudioSceneEnergy = "neutral";

const LEGACY_CAMERA_TO_SHOT: Record<string, StudioShotType> = {
  close_up: "close_up",
  medium_shot: "medium",
  wide_shot: "wide",
  tracking_shot: "medium",
  drone_shot: "drone",
  pov: "pov",
};

const SHOT_TO_LEGACY_CAMERA: Partial<Record<StudioShotType, string>> = {
  close_up: "close_up",
  medium_close_up: "close_up",
  extreme_close_up: "close_up",
  medium: "medium_shot",
  medium_wide: "medium_shot",
  wide: "wide_shot",
  extreme_wide: "wide_shot",
  drone: "drone_shot",
  pov: "pov",
};

export function isStudioShotType(value: string): value is StudioShotType {
  return (STUDIO_SHOT_TYPES as readonly string[]).includes(value);
}

export function isStudioCameraMovement(value: string): value is StudioCameraMovement {
  return (STUDIO_CAMERA_MOVEMENTS as readonly string[]).includes(value);
}

export function isStudioSceneEnergy(value: string): value is StudioSceneEnergy {
  return (STUDIO_SCENE_ENERGIES as readonly string[]).includes(value);
}

export function normalizeStudioShotType(value: string | undefined | null): StudioShotType | "" {
  const trimmed = value?.trim().toLowerCase().replace(/\s+/g, "_") ?? "";
  if (!trimmed) {
    return "";
  }
  if (isStudioShotType(trimmed)) {
    return trimmed;
  }
  const legacy = LEGACY_CAMERA_TO_SHOT[trimmed];
  return legacy ?? "";
}

export function normalizeStudioCameraMovement(
  value: string | undefined | null
): StudioCameraMovement | "" {
  const trimmed = value?.trim().toLowerCase().replace(/\s+/g, "_") ?? "";
  return isStudioCameraMovement(trimmed) ? trimmed : "";
}

export function normalizeStudioSceneEnergy(
  value: string | undefined | null
): StudioSceneEnergy {
  const trimmed = value?.trim().toLowerCase() ?? "";
  return isStudioSceneEnergy(trimmed) ? trimmed : DEFAULT_STUDIO_SCENE_ENERGY;
}

/** Infer shot type from legacy `camera` column when shotType is empty. */
export function resolveSceneShotType(
  shotType: string | undefined | null,
  legacyCamera: string | undefined | null
): StudioShotType | "" {
  const normalized = normalizeStudioShotType(shotType);
  if (normalized) {
    return normalized;
  }
  const cam = legacyCamera?.trim().toLowerCase().replace(/\s+/g, "_") ?? "";
  return LEGACY_CAMERA_TO_SHOT[cam] ?? "";
}

export function legacyCameraFromShotType(shotType: string): string {
  const normalized = normalizeStudioShotType(shotType);
  if (!normalized) {
    return "";
  }
  return SHOT_TO_LEGACY_CAMERA[normalized] ?? normalized;
}

export type SceneDirectorFields = {
  shotType?: string;
  cameraMovement?: string;
  sceneEnergy?: string;
  camera?: string;
};

export function normalizeSceneDirectorFields(raw: SceneDirectorFields): {
  shotType: string;
  cameraMovement: string;
  sceneEnergy: StudioSceneEnergy;
  camera: string;
} {
  const shotType = normalizeStudioShotType(raw.shotType) || resolveSceneShotType("", raw.camera);
  const cameraMovement = normalizeStudioCameraMovement(raw.cameraMovement);
  const sceneEnergy = normalizeStudioSceneEnergy(raw.sceneEnergy);
  const camera =
    shotType ? legacyCameraFromShotType(shotType) : (raw.camera?.trim() ?? "");
  return {
    shotType: shotType || "",
    cameraMovement: cameraMovement || "",
    sceneEnergy,
    camera,
  };
}

const SHOT_PROMPT: Record<StudioShotType, string> = {
  extreme_wide: "Extreme wide shot establishing vast environment and scale.",
  wide: "Wide shot showing full environment and subject placement.",
  medium_wide: "Medium wide shot balancing subject and surrounding context.",
  medium: "Medium shot framing subject from waist up with context.",
  medium_close_up: "Medium close-up emphasizing expression and upper body.",
  close_up: "Close-up framing on face and emotional detail.",
  extreme_close_up: "Extreme close-up on a specific detail or expression.",
  over_the_shoulder: "Over-the-shoulder framing for dialogue and connection.",
  pov: "Point-of-view framing placing the viewer in the scene.",
  drone: "Elevated aerial drone perspective with sweeping context.",
  detail_shot: "Detail shot isolating a meaningful object or texture.",
};

const MOVEMENT_PROMPT: Record<StudioCameraMovement, string> = {
  static: "Static locked-off camera.",
  push_in: "Slow push-in toward the subject.",
  pull_out: "Pull-out revealing wider context.",
  pan_left: "Pan left across the scene.",
  pan_right: "Pan right across the scene.",
  tilt_up: "Tilt up along vertical emphasis.",
  tilt_down: "Tilt down along vertical emphasis.",
  orbit: "Orbiting camera around the subject.",
  follow: "Following camera behind or beside the subject.",
  tracking: "Smooth tracking shot alongside motion.",
  crane: "Crane movement with vertical lift or descent.",
};

const ENERGY_PROMPT: Record<StudioSceneEnergy, string> = {
  calm: "Calm, measured scene energy and pacing.",
  neutral: "Balanced neutral scene energy.",
  dynamic: "Dynamic energetic scene pacing.",
  intense: "Intense high-energy scene pacing.",
};

export function buildShotTypePrompt(shotType: string): string {
  const key = normalizeStudioShotType(shotType);
  return key ? SHOT_PROMPT[key] : "";
}

export function buildCameraMovementPrompt(movement: string): string {
  const key = normalizeStudioCameraMovement(movement);
  return key ? MOVEMENT_PROMPT[key] : "";
}

export function buildSceneEnergyPrompt(energy: string): string {
  return ENERGY_PROMPT[normalizeStudioSceneEnergy(energy)];
}

export function buildDirectorCameraPrompt(params: {
  shotType?: string;
  cameraMovement?: string;
  sceneEnergy?: string;
  legacyCamera?: string;
}): string {
  const parts = [
    buildShotTypePrompt(params.shotType ?? ""),
    buildCameraMovementPrompt(params.cameraMovement ?? ""),
    buildSceneEnergyPrompt(params.sceneEnergy ?? DEFAULT_STUDIO_SCENE_ENERGY),
  ].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(" ");
  }
  const legacy = params.legacyCamera?.trim();
  return legacy ? buildCameraPrompt(legacy) : "";
}
