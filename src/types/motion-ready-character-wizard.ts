import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { CharacterEngineSaveMetadata, CharacterEngineSummary } from "@/types/character-engine";
import type { BodyVisibilityLevel } from "@/types/studio-asset-animation-readiness";

export const MOTION_READY_WIZARD_STEPS = [
  "upload",
  "analysis",
  "readiness_summary",
  "dynamic_questions",
  "generate",
  "preview",
  "save",
  "complete",
] as const;

export type MotionReadyWizardStep = (typeof MOTION_READY_WIZARD_STEPS)[number];

export type MotionCharacterPartId =
  | "head"
  | "face"
  | "torso"
  | "arms"
  | "hands"
  | "legs"
  | "feet"
  | "clothing"
  | "pose"
  | "background"
  | "style";

export type MotionCharacterPartStatus = "present" | "missing" | "partial";

export type MotionCharacterPartDetection = {
  id: MotionCharacterPartId;
  status: MotionCharacterPartStatus;
  labelKey: string;
  detail?: string;
};

export type MotionReadyStyleKind =
  | "realistic_photo"
  | "cartoon"
  | "mascot"
  | "illustration"
  | "sketch";

export type MotionReadyPoseChoice =
  | "neutral_standing"
  | "arms_at_sides"
  | "friendly"
  | "powerful";

export type MotionReadyBodyStyleChoice = "realistic" | "mascot_cartoon";

export type MotionReadyWizardAnswers = {
  bodyStyle?: MotionReadyBodyStyleChoice;
  clothing?: string;
  pose?: MotionReadyPoseChoice;
  keepExistingClothing?: boolean;
  removeBackground?: boolean;
  preserveMascotStyle?: boolean;
  clarifyHandsFeet?: boolean;
};

export type MotionReadyWizardQuestion = {
  id: string;
  labelKey: string;
  type: "choice" | "text" | "boolean";
  options?: Array<{ id: string; labelKey: string }>;
  aiSuggestionKey?: string;
  aiSuggestionValue?: string;
};

export type MotionReadySaveMetadata = {
  sourceReferenceUrl: string;
  generatedFullBodyUrl: string;
  transparentPngUrl: string;
  motionReady: boolean;
  bodyCompletenessScore: number;
  detectedParts: MotionCharacterPartDetection[];
  generatedMissingParts: MotionCharacterPartId[];
  style: MotionReadyStyleKind;
  clothing: string;
  pose: MotionReadyPoseChoice | string;
  projectId: string | null;
  createdAt: string;
};

export type MotionReadyWizardState = {
  step: MotionReadyWizardStep;
  sourceReferenceImageUrl: string;
  sourceReferenceStorageKey: string;
  sourceReferenceName: string;
  uploadSaved: boolean;
  visionAnalysis: AssetVisionAnalysis | null;
  visionStatus: "idle" | "loading" | "ready" | "failed";
  visionError: string;
  partDetections: MotionCharacterPartDetection[];
  bodyVisibility: BodyVisibilityLevel;
  readinessScore: number;
  availableParts: MotionCharacterPartId[];
  missingParts: MotionCharacterPartId[];
  questions: MotionReadyWizardQuestion[];
  answers: MotionReadyWizardAnswers;
  generationStatus: "idle" | "generating" | "ready" | "failed";
  generationError: string;
  generatedFullBodyUrl: string;
  generatedFullBodyStorageKey: string;
  transparentPngUrl: string;
  previewApproved: boolean;
  characterName: string;
  projectId: string | null;
  projectTitle: string | null;
  savedCharacterId: string | null;
  openEditorRequested: boolean;
  engineSummary: CharacterEngineSummary | null;
  engineSaveMetadata: CharacterEngineSaveMetadata | null;
};
