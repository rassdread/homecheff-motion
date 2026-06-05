/**
 * Studio V42 — future composition hooks (interfaces only, no implementation).
 */

import type {
  CharacterPlacementPlan,
  PropPlacementPlan,
  SceneComposition,
  SceneDepth,
  ScreenPosition,
} from "@/types/studio-scene-composition";

export type AssetPlacementRequest = {
  sceneId: string;
  entityId: string;
  entityKind: "character" | "prop" | "brand";
  preferredPosition?: ScreenPosition;
  preferredDepth?: SceneDepth;
};

export type AssetPlacementResult = {
  sceneId: string;
  entityId: string;
  resolvedPosition: ScreenPosition;
  resolvedDepth: SceneDepth;
  /** Reserved for canvas layout — not used in V42. */
  canvasCoordinates?: null;
};

export interface AssetPlacementEngine {
  planPlacement(request: AssetPlacementRequest): AssetPlacementResult;
}

export type CanvasLayoutSceneInput = {
  sceneComposition: SceneComposition;
  characterPlacements: CharacterPlacementPlan[];
  propPlacements: PropPlacementPlan[];
  frameWidth: number;
  frameHeight: number;
};

export type CanvasLayoutSceneOutput = {
  sceneId: string;
  /** Reserved — drag/drop canvas not implemented in V42. */
  layers: Array<{ entityId: string; x: number; y: number; z: number }>;
};

export interface CanvasLayoutEditor {
  buildLayout(input: CanvasLayoutSceneInput): CanvasLayoutSceneOutput;
}

export type VisualStagingSceneInput = {
  sceneId: string;
  composition: SceneComposition;
};

export interface VisualStagingDirector {
  describeStaging(input: VisualStagingSceneInput): string;
}

export type CharacterBlockingMove = {
  characterId: string;
  fromPosition: ScreenPosition;
  toPosition: ScreenPosition;
  beat: number;
};

export interface CharacterBlockingPlanner {
  planBlocking(sceneId: string): CharacterBlockingMove[];
}

export type MotionAnimationCompositionCue = {
  sceneId: string;
  focusEntityId: string | null;
  entranceDirection: ScreenPosition | null;
};

export interface MotionAnimationCompositionBridge {
  buildCompositionCues(sceneId: string): MotionAnimationCompositionCue[];
}
