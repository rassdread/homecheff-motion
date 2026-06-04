import type { SceneSnapshot } from "@/types/studio-scene-snapshot";
import type { StudioSceneContextMetadata } from "@/types/studio-scene-context";
import type { PromptVersionMetadata } from "@/types/studio-prompt-builder";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import type { StudioSceneImageReference } from "@/types/studio-scene-image-reference";

export const MOTION_HANDOFF_PAYLOAD_VERSION = 3 as const;

/**
 * Single source of truth for Studio → Motion wizard import.
 */
export type MotionHandoffScene = SceneSnapshot & {
  studioContext: StudioSceneContextMetadata;
  generatedPrompt: string;
  stylePrompt: string;
  continuityPrompt: string;
  promptVersion: PromptVersionMetadata;
  /** Resolved Studio still for Motion (selected → latest completed). */
  selectedSceneImageId: string | null;
  selectedSceneImageUrl: string | null;
  selectedSceneImagePromptVersion: number | null;
  selectedSceneImageGenerationVersion: number | null;
  sceneImageReference: StudioSceneImageReference | null;
};

export type MotionHandoffPayload = {
  version: typeof MOTION_HANDOFF_PAYLOAD_VERSION;
  storyboardId: string;
  title: string;
  description: string;
  promptStyleProfile: StudioPromptStyleProfile;
  scenes: MotionHandoffScene[];
};
