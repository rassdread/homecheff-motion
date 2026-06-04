import type { CharacterSnapshot } from "@/types/studio-character-snapshot";
import type { LocationSnapshot } from "@/types/studio-location-snapshot";
import type { PropSnapshot } from "@/types/studio-prop-snapshot";

/**
 * Portable scene identity for future Motion prompt builder.
 */
export type SceneSnapshot = {
  sceneId: string;
  order: number;
  title: string;
  description: string;
  location: LocationSnapshot | null;
  characters: CharacterSnapshot[];
  props: PropSnapshot[];
  action: string;
  emotion: string;
  camera: string;
  /** V23 — structured shot framing. */
  shotType?: string;
  cameraMovement?: string;
  sceneEnergy?: string;
  transitionToNext: string;
  durationSeconds: number;
  /** Reserved for future voice assignment. */
  voice?: string;
  /** Reserved for future music assignment. */
  music?: string;
  /** Free-form planning notes (description + action). */
  notes?: string;
  /** V8 — preferred generated still for Motion import (not used by Vidu yet). */
  selectedSceneImageId?: string | null;
  preferredSceneImageUrl?: string | null;
};
