import type { CharacterSnapshot } from "@/types/studio-character-snapshot";
import type { LocationSnapshot } from "@/types/studio-location-snapshot";
import type { PropSnapshot } from "@/types/studio-prop-snapshot";

/**
 * Studio metadata preserved on a Motion wizard scene (not used by Vidu yet).
 */
export type StudioSceneContextMetadata = {
  source: "studio";
  storyboardId: string;
  sceneId: string;
  action: string;
  emotion: string;
  camera: string;
  transitionToNext: string;
  location: LocationSnapshot | null;
  characters: CharacterSnapshot[];
  props: PropSnapshot[];
  /** Combined planning notes (description + action) for future Prompt Builder. */
  notes: string;
  /** Reserved — voice assignment per scene. */
  voice?: string;
  /** Reserved — music assignment per scene. */
  music?: string;
  /** V7 — Motion-ready prompt (not sent to Vidu yet). */
  generatedPrompt?: string;
  stylePrompt?: string;
  continuityPrompt?: string;
  promptVersion?: import("@/types/studio-prompt-builder").PromptVersionMetadata;
};
