import type { SceneSnapshot } from "@/types/studio-scene-snapshot";

/**
 * Full storyboard handoff for future Motion integration.
 */
export type StoryboardSnapshot = {
  id: string;
  title: string;
  description: string;
  scenes: SceneSnapshot[];
};
