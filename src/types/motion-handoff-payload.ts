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
import type {
  ConsistencyHistoryEntry,
  CorrectionRecommendation,
  ImprovementScore,
} from "@/types/studio-correction";
import type { VisionConsistencyReport, StoryboardVisionReport } from "@/types/studio-vision-consistency";
import type { StoryboardCharacterConsistencyReport } from "@/types/studio-character-consistency";

export const MOTION_HANDOFF_PAYLOAD_VERSION = 9 as const;

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
  /** V12: structured correction recommendations for selected still (metadata only). */
  sceneCorrectionRecommendations: CorrectionRecommendation[];
  /** V13: visual QA for selected still (metadata only). */
  sceneVisionScore: number | null;
  sceneVisionReport: VisionConsistencyReport | null;
  /** V14: selected still scoring for Motion import (metadata only). */
  selectedImageScore: number | null;
  selectedImageVisionScore: number | null;
  selectedImageConsistencyScore: number | null;
  selectedImageImprovementScore: number | null;
  selectedImageRecommended: boolean;
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
  /** V12: aggregated correction recommendations (metadata only). */
  correctionRecommendations: CorrectionRecommendation[];
  consistencyHistory: ConsistencyHistoryEntry[];
  latestImprovementScore: ImprovementScore | null;
  /** V13: storyboard-wide vision QA (metadata only). */
  visionReport: StoryboardVisionReport | null;
  overallVisionScore: number;
  visionWarnings: string[];
  /** V17: character identity across storyboard (metadata only). */
  characterConsistencyReport: StoryboardCharacterConsistencyReport | null;
  overallCharacterConsistencyScore: number;
  characterDriftWarnings: string[];
  perSceneCharacterIdentityScores: Array<{
    sceneId: string;
    order: number;
    characters: Array<{ characterId: string; name: string; score: number; status: string }>;
  }>;
  scenes: MotionHandoffScene[];
};
