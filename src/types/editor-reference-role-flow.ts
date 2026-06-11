import type { EditorPostUploadMode } from "@/lib/editor-start-flow";
import type { EditorTransformationStepCount } from "@/types/editor-generation-access";
import type { EditorReferenceMetadata } from "@/types/editor-reference-metadata";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type EditorReferenceRoleAnalysisStatus =
  | "idle"
  | "uploading"
  | "running"
  | "done"
  | "needs_attention"
  | "error";

export type EditorReferenceRoleAnalysis = {
  status: EditorReferenceRoleAnalysisStatus;
  objectCount?: number;
  faceDetected?: boolean;
  clothingDetected?: boolean;
  styleTraits?: string[];
  editableObjects?: string[];
  errorMessage?: string;
  analyzedAt?: string;
};

export type EditorReferenceRoleSpec = {
  id: string;
  role: string;
  labelKey: string;
  hintKey?: string;
  required: boolean;
  maxInstances: number;
};

export type EditorWorkflowReferenceConfig = {
  workflow: EditorPostUploadMode;
  intent?: EditorFusionIntent;
  roles: EditorReferenceRoleSpec[];
  requiredRoles: string[];
  optionalRoles: string[];
  supportsVariations: boolean;
  supportsSequences: boolean;
  supportsMotionHandoff: boolean;
  variationPresets: number[];
  sequencePresets: EditorTransformationStepCount[];
};

export type EditorReferenceRoleInstance = {
  instanceId: string;
  document: EditorCanvasDocument;
  analysis: EditorReferenceRoleAnalysis;
  metadata: EditorReferenceMetadata;
  originalFilename?: string;
};

export type EditorReferenceRoleSlot = {
  roleId: string;
  role: string;
  instances: EditorReferenceRoleInstance[];
};

export type EditorReferenceOutputMode = "single" | "variations" | "sequence";

export type EditorReferenceOutputSelection = {
  outputMode: EditorReferenceOutputMode;
  variationCount: number;
  stepCount: EditorTransformationStepCount;
  customVariationCount?: number;
  customStepCount?: number;
};

export type EditorReferenceMotionSelection = {
  enabled: boolean;
  durationSec: 0 | 3 | 5 | 8;
};

export type EditorReferenceIntakeState = {
  config: EditorWorkflowReferenceConfig;
  slots: EditorReferenceRoleSlot[];
  output: EditorReferenceOutputSelection;
  motion: EditorReferenceMotionSelection;
};

export const EDITOR_REFERENCE_VARIATION_PRESETS = [4, 6] as const;
export const EDITOR_REFERENCE_SEQUENCE_PRESETS = [3, 4, 6] as const;
export const EDITOR_REFERENCE_MOTION_DURATIONS = [0, 3, 5, 8] as const;
