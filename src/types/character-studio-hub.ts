import type { EditorFusionIntent } from "@/types/editor-instruction-studio";
import type { MascotTransformSourceType, MascotTransformTargetType } from "@/types/editor-mascot-transformation";

/** User-facing Character Studio hub choices (CS2). */
export const CHARACTER_STUDIO_FLOW_IDS = [
  "full_body",
  "outfit",
  "character_upgrade",
  "mascot_transform",
  "human_to_mascot",
  "mascot_to_human",
  "character_fusion",
  "future_child",
  "genetic_blend",
  "motion_ready",
  "logo_placement",
] as const;

export type CharacterStudioFlowId = (typeof CHARACTER_STUDIO_FLOW_IDS)[number];

export type CharacterStudioFlowKind =
  | "studio_motion"
  | "mascot_wizard"
  | "fusion_wizard"
  | "logo_wizard";

export type CharacterStudioFlowDefinition = {
  id: CharacterStudioFlowId;
  kind: CharacterStudioFlowKind;
  titleKey: string;
  descriptionKey: string;
  bulletKeys: string[];
  /** Canonical fusion intent when kind is fusion_wizard */
  fusionIntent?: EditorFusionIntent;
  /** Mascot wizard defaults when kind is mascot_wizard */
  mascotSourceType?: MascotTransformSourceType;
  mascotInitialTarget?: MascotTransformTargetType;
  /** Underlying workflow id for audit inventory */
  workflowId: string;
  wizardFirst: boolean;
  usesFusionIntelligence: boolean;
  usesCharacterConsistency: boolean;
  usesBrandProtection: boolean;
  usesMotionLock: boolean;
  editorDependent: boolean;
  copilotReachable: boolean;
  visibleInHub: boolean;
};

export type CharacterWorkflowInventoryEntry = {
  workflowId: string;
  route: string;
  wizardFirst: boolean;
  editorFirst: boolean;
  visibleInUi: boolean;
  copilotReachable: boolean;
  usesFusionIntelligence: boolean;
  usesCharacterConsistency: boolean;
  usesBrandProtection: boolean;
  usesMotionLock: boolean;
  hiddenDependencies: string[];
};

export type CharacterStudioCompletenessReport = {
  score: number;
  totalWorkflows: number;
  wizardFirstCount: number;
  hubVisibleCount: number;
  copilotRoutedCount: number;
  editorIndependentCount: number;
};

export type CharacterStudioDuplicationReport = {
  score: number;
  duplicateRoutes: string[];
  duplicateComponents: string[];
  notes: string[];
};

export type CharacterStudioAuditBundle = {
  inventory: CharacterWorkflowInventoryEntry[];
  completeness: CharacterStudioCompletenessReport;
  copilotRouting: Array<{ phrase: string; flowId: CharacterStudioFlowId }>;
  hiddenWorkflows: string[];
  editorDependencies: string[];
  uxRecommendations: string[];
  duplication: CharacterStudioDuplicationReport;
};
