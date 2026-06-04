/**
 * Short display labels for timeline chips (V25).
 */

import type { StudioCameraMovement, StudioShotType } from "@/lib/studio-scene-director";

const SHOT_SHORT: Partial<Record<StudioShotType, string>> = {
  extreme_wide: "Extreme Wide",
  wide: "Wide",
  medium_wide: "Med Wide",
  medium: "Medium",
  medium_close_up: "Med CU",
  close_up: "Close Up",
  extreme_close_up: "Extreme CU",
  over_the_shoulder: "OTS",
  pov: "POV",
  drone: "Drone",
  detail_shot: "Detail",
};

const MOVEMENT_SHORT: Partial<Record<StudioCameraMovement, string>> = {
  static: "Static",
  push_in: "Push In",
  pull_out: "Pull Back",
  pan_left: "Pan L",
  pan_right: "Pan R",
  tilt_up: "Tilt Up",
  tilt_down: "Tilt Down",
  orbit: "Orbit",
  follow: "Follow",
  tracking: "Tracking",
  crane: "Crane Up",
};

export function shortShotLabel(shot: string): string {
  if (!shot) {
    return "—";
  }
  return SHOT_SHORT[shot as StudioShotType] ?? shot.replace(/_/g, " ");
}

export function shortMovementLabel(movement: string): string {
  if (!movement) {
    return "Static";
  }
  return MOVEMENT_SHORT[movement as StudioCameraMovement] ?? movement.replace(/_/g, " ");
}
