import type { SceneSnapshot } from "@/types/studio-scene-snapshot";
import type { StudioSceneContextMetadata } from "@/types/studio-scene-context";
import type { PromptVersionMetadata } from "@/types/studio-prompt-builder";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";

export const MOTION_HANDOFF_PAYLOAD_VERSION = 2 as const;

/**
 * Single source of truth for Studio → Motion wizard import.
 */
export type MotionHandoffScene = SceneSnapshot & {
  studioContext: StudioSceneContextMetadata;
  generatedPrompt: string;
  stylePrompt: string;
  continuityPrompt: string;
  promptVersion: PromptVersionMetadata;
};

export type MotionHandoffPayload = {
  version: typeof MOTION_HANDOFF_PAYLOAD_VERSION;
  storyboardId: string;
  title: string;
  description: string;
  promptStyleProfile: StudioPromptStyleProfile;
  scenes: MotionHandoffScene[];
};
