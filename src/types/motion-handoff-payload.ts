import type { StudioContinuityStrength } from "@/lib/studio-continuity-strength";
import type { SceneSnapshot } from "@/types/studio-scene-snapshot";
import type { StudioSceneContextMetadata } from "@/types/studio-scene-context";
import type { PromptVersionMetadata } from "@/types/studio-prompt-builder";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import type { StudioSceneImageReference } from "@/types/studio-scene-image-reference";
import type {
  CharacterMemorySnapshot,
  LocationMemorySnapshot,
  PropMemorySnapshot,
  WorldMemorySnapshot,
} from "@/types/studio-memory-snapshots";
import type { SceneConsistencyReport, StoryboardConsistencyReport } from "@/types/studio-consistency";

export const MOTION_HANDOFF_PAYLOAD_VERSION = 5 as const;

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
  /** V11: consistency metadata for selected/l latest still (stored only). */
  sceneConsistencyScore: number | null;
  sceneConsistencyReport: SceneConsistencyReport | null;
  sceneConsistencyRecommendations: string[];
};

export type MotionHandoffPayload = {
  version: typeof MOTION_HANDOFF_PAYLOAD_VERSION;
  storyboardId: string;
  title: string;
  description: string;
  promptStyleProfile: StudioPromptStyleProfile;
  /** V10: stored for future Motion continuity; not used in rendering yet. */
  characterMemory: CharacterMemorySnapshot[];
  locationMemory: LocationMemorySnapshot | null;
  propMemory: PropMemorySnapshot[];
  worldMemory: WorldMemorySnapshot | null;
  continuityStrength: StudioContinuityStrength;
  /** V11: storyboard-wide consistency (metadata only). */
  consistencyReport: StoryboardConsistencyReport | null;
  overallConsistencyScore: number;
  driftWarnings: string[];
  scenes: MotionHandoffScene[];
};
