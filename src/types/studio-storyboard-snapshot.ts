import type { SceneSnapshot } from "@/types/studio-scene-snapshot";
import type { StudioDirectorProfile } from "@/lib/studio-director-profiles";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";

/**
 * Full storyboard handoff for future Motion integration.
 */
export type StoryboardSnapshot = {
  id: string;
  title: string;
  description: string;
  promptStyleProfile: StudioPromptStyleProfile;
  /** V23 — director style for camera language and pacing. */
  directorProfile: StudioDirectorProfile;
  scenes: SceneSnapshot[];
};
