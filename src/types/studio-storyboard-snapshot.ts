import type { SceneSnapshot } from "@/types/studio-scene-snapshot";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";

/**
 * Full storyboard handoff for future Motion integration.
 */
export type StoryboardSnapshot = {
  id: string;
  title: string;
  description: string;
  promptStyleProfile: StudioPromptStyleProfile;
  scenes: SceneSnapshot[];
};
