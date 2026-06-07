import type { CharacterSnapshot } from "@/types/studio-character-snapshot";
import type { LocationSnapshot } from "@/types/studio-location-snapshot";
import type { PropSnapshot } from "@/types/studio-prop-snapshot";
import type { SceneSnapshot } from "@/types/studio-scene-snapshot";
import type { SceneMemoryBundle } from "@/types/studio-memory-snapshots";
import type { CorrectionRecommendation } from "@/types/studio-correction";
import type { StudioDirectorProfile } from "@/lib/studio-director-profiles";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import type { PromptBuilderSourceEntities } from "@/lib/studio-identity-prompt-context";
import type { StudioSceneDetail } from "@/types/studio-api";

export const PROMPT_BUILDER_VERSION = 3 as const;

/**
 * Normalized input for the Studio Prompt Builder engine.
 */
export type PromptBuilderInput = {
  scene: Pick<
    SceneSnapshot,
    "sceneId" | "title" | "description" | "action" | "emotion" | "camera"
  >;
  location: LocationSnapshot | null;
  characters: CharacterSnapshot[];
  props: PropSnapshot[];
  styleProfile: StudioPromptStyleProfile;
  /** V23: director profile and per-scene camera language. */
  directorProfile?: StudioDirectorProfile;
  shotType?: string;
  cameraMovement?: string;
  sceneEnergy?: string;
  /** V10: character, location, prop and world memory for continuity prompts. */
  memoryBundle?: SceneMemoryBundle;
  /** V12: structured corrections from consistency analysis (applied as prompt layer). */
  correctionRecommendations?: CorrectionRecommendation[];
  /** Identity Consumption: full library entities for identity-aware prompt sections. */
  sourceEntities?: PromptBuilderSourceEntities;
  /** Scene detail for world identity resolution (client preview). */
  sceneDetail?: StudioSceneDetail;
};

export type PromptBuilderSections = {
  sceneContext: string;
  characters: string;
  location: string;
  props: string;
  action: string;
  emotion: string;
  camera: string;
  director: string;
  visualStyle: string;
  qualityInstructions: string;
  continuity: string;
  identity: string;
};

export type PromptBuilderOutput = {
  prompt: string;
  stylePrompt: string;
  continuityPrompt: string;
  sections: PromptBuilderSections;
  metadata: PromptVersionMetadata;
};

/** Lightweight prompt versioning (no Prisma table in V7). */
export type PromptVersionMetadata = {
  promptVersion: typeof PROMPT_BUILDER_VERSION;
  generatedAt: string;
  sceneId: string;
  generatedPrompt: string;
  styleProfile: StudioPromptStyleProfile;
  qualityScore: number;
  qualityTier: PromptQualityTier;
};

export type PromptQualityTier = "weak" | "good" | "strong";

export type PromptQualityScore = {
  score: number;
  tier: PromptQualityTier;
  checks: {
    hasCharacters: boolean;
    hasLocation: boolean;
    hasAction: boolean;
    hasEmotion: boolean;
    hasCamera: boolean;
  };
};
