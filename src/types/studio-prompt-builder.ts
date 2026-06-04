import type { CharacterSnapshot } from "@/types/studio-character-snapshot";
import type { LocationSnapshot } from "@/types/studio-location-snapshot";
import type { PropSnapshot } from "@/types/studio-prop-snapshot";
import type { SceneSnapshot } from "@/types/studio-scene-snapshot";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";

export const PROMPT_BUILDER_VERSION = 1 as const;

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
};

export type PromptBuilderSections = {
  sceneContext: string;
  characters: string;
  location: string;
  props: string;
  action: string;
  emotion: string;
  camera: string;
  visualStyle: string;
  qualityInstructions: string;
  continuity: string;
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
