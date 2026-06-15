import type { BodyVisibilityLevel } from "@/types/studio-asset-animation-readiness";
import type { MotionCharacterPartDetection, MotionCharacterPartId } from "@/types/motion-ready-character-wizard";

export const CHARACTER_COMPLETENESS_LEVELS = [
  "COMPLETE",
  "PARTIAL",
  "PORTRAIT",
  "HEAD_ONLY",
  "MASCOT",
  "UNKNOWN",
] as const;

export type CharacterCompletenessLevel = (typeof CHARACTER_COMPLETENESS_LEVELS)[number];

export type CharacterAnalysisResult = {
  characterType: string;
  confidence: number;
  hasFace: boolean;
  hasBody: boolean;
  hasArms: boolean;
  hasHands: boolean;
  hasLegs: boolean;
  hasFeet: boolean;
  hasClothing: boolean;
  hasAccessories: boolean;
  visibleParts: MotionCharacterPartId[];
  missingParts: MotionCharacterPartId[];
  readinessScore: number;
  partDetections: MotionCharacterPartDetection[];
  bodyVisibility: BodyVisibilityLevel;
};

export type CharacterMotionReadinessResult = {
  ready: boolean;
  score: number;
  missingRequirements: string[];
  recommendations: string[];
};

export type CharacterEngineSummaryLine = {
  id: string;
  labelKey: string;
  present: boolean;
};

export type CharacterEngineSummary = {
  titleKey: string;
  characterType: string;
  completeness: CharacterCompletenessLevel;
  completenessLabelKey: string;
  readinessScore: number;
  motionReady: boolean;
  detectedLines: CharacterEngineSummaryLine[];
  missingLines: CharacterEngineSummaryLine[];
  canGenerateMissingParts: boolean;
  leadKey: string;
};

export type CharacterEngineSaveMetadata = {
  characterCompleteness: CharacterCompletenessLevel;
  motionReadinessScore: number;
  motionReady: boolean;
  missingParts: string[];
  characterType: string;
  bodyVisibility: BodyVisibilityLevel;
  sourceRoute: string;
  analyzedAt: string;
};
