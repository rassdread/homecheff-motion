import type { SceneConsistencyMemoryInput } from "@/types/studio-consistency";

export type StudioVisionReferenceAsset = {
  id: string;
  name: string;
  referenceImageUrl: string | null;
};

export type StudioVisionAnalyzeInput = {
  sceneImageUrl: string;
  thumbnailUrl: string | null;
  generatedPrompt: string;
  sceneTitle: string;
  sceneDescription: string;
  sceneAction: string;
  memory: SceneConsistencyMemoryInput;
  references: {
    characters: StudioVisionReferenceAsset[];
    location: StudioVisionReferenceAsset | null;
    props: StudioVisionReferenceAsset[];
  };
};

export type StudioVisionCharacterSignal = {
  characterId: string;
  name: string;
  present: boolean;
  clothingVisible: boolean;
  accessoriesVisible: boolean;
  mascotProportionsOk: boolean;
  detectedTraits: string[];
  missingTraits: string[];
  notes: string;
};

export type StudioVisionLocationSignal = {
  environmentElements: string[];
  visualIdentityMatch: boolean;
  worldCharacteristicsMatch: boolean;
  missingElements: string[];
  notes: string;
};

export type StudioVisionPropSignal = {
  propId: string;
  name: string;
  visible: boolean;
  brandingVisible: boolean;
  detectedTraits: string[];
  missingTraits: string[];
  notes: string;
};

export type StudioVisionBrandingSignal = {
  homecheffLogoVisible: boolean;
  logoPlacementOk: boolean;
  brandedPackagingVisible: boolean;
  detectedElements: string[];
  missingElements: string[];
  notes: string;
};

export type StudioVisionWorldSignal = {
  styleMatch: boolean;
  toneMatch: boolean;
  colorLanguageMatch: boolean;
  detectedElements: string[];
  missingElements: string[];
  notes: string;
};

/** Normalized vision provider output before memory scoring. */
export type StudioVisionRawAnalysis = {
  providerId: string;
  analysisMethod: "openai_vision" | "mock_vision_heuristic";
  referenceComparisonUsed: boolean;
  detectedElements: string[];
  summary: string;
  characters: StudioVisionCharacterSignal[];
  location: StudioVisionLocationSignal | null;
  props: StudioVisionPropSignal[];
  branding: StudioVisionBrandingSignal;
  world: StudioVisionWorldSignal | null;
};

export interface StudioVisionProvider {
  readonly id: string;
  analyzeImage(input: StudioVisionAnalyzeInput): Promise<StudioVisionRawAnalysis>;
}
