import type { SceneSnapshot } from "@/types/studio-scene-snapshot";
import type { StudioSceneContextMetadata } from "@/types/studio-scene-context";

export const MOTION_HANDOFF_PAYLOAD_VERSION = 1 as const;

/**
 * Single source of truth for Studio → Motion wizard import.
 */
export type MotionHandoffScene = SceneSnapshot & {
  studioContext: StudioSceneContextMetadata;
};

export type MotionHandoffPayload = {
  version: typeof MOTION_HANDOFF_PAYLOAD_VERSION;
  storyboardId: string;
  title: string;
  description: string;
  scenes: MotionHandoffScene[];
};
