import type { AssistantActionId } from "@/lib/assistant-action-registry";
import type { EditorMorphActionId } from "@/lib/editor-morph-actions";
import type { VisionTaxonomyType } from "@/lib/editor-vision-taxonomy";
import type { AssistantInterpretationConfidence } from "@/types/assistant-interpretation";
import type { ProducerResponse } from "@/types/assistant-producer";

export type AssistantAssetType =
  | "mascot"
  | "human"
  | "animal"
  | "character"
  | "world"
  | "location"
  | "prop"
  | "logo"
  | "image"
  | "video"
  | "product";

export type AssistantAssetState = "new" | "existing" | "draft" | "generated" | "imported";

export type AssistantV3SessionMemory = {
  currentGoal?: string;
  selectedAssetName?: string | null;
  selectedAssetType?: AssistantAssetType | null;
  taxonomyType?: VisionTaxonomyType | null;
  selectedPartId?: string | null;
  selectedPartName?: string | null;
  selectedPartGroup?: string | null;
  selectedHierarchyPath?: string[];
  recentActionIds?: string[];
  recentEdits?: string[];
  reasoningProfile?: AssistantV3ReasoningProfile;
};

export type AssistantV3ReasoningProfile = "editor" | "producer";

export type AssistantEditorContextHint = {
  documentName?: string;
  selectedAssetType?: AssistantAssetType;
  selectedAssetName?: string;
  taxonomyType?: VisionTaxonomyType;
  selectedParts?: string[];
  selectedPartId?: string | null;
  selectedPartName?: string | null;
  selectedPartGroup?: string | null;
  selectedHierarchyPath?: string[];
  visibleHierarchyLabels?: string[];
  workflow?: "edit" | "combine" | "motion_prepare" | "export";
  module?: "editor" | "studio" | "motion" | "publish";
  reasoningProfile?: AssistantV3ReasoningProfile;
};

export type AssistantV3PartContext = {
  partId: string | null;
  partName: string;
  partGroup: string;
  hierarchyPath: string[];
  assetName: string;
};

export type AssistantV3AssetContext = {
  assetId: string | null;
  assetName: string;
  assetType: AssistantAssetType;
  assetState: AssistantAssetState;
  taxonomyType: VisionTaxonomyType | null;
  selectedParts: string[];
  partContext: AssistantV3PartContext | null;
};

export type AssistantV3ProjectInsight = {
  projectId: string;
  title: string;
  sceneCountEstimate: number;
  characterCount: number;
  voiceCount: number;
  subtitleCount: number;
  videoCount: number;
  exportCount: number;
  missing: Array<"voice" | "subtitles" | "translation" | "export" | "characters" | "scenes">;
  recommendedNextStep: string;
  recommendedActionId?: AssistantActionId;
  recommendedRoute?: string;
};

export type AssistantV3DynamicAction = {
  id: string;
  label: string;
  promptMessage: string;
  actionId?: AssistantActionId;
  morphActionId?: EditorMorphActionId;
  route?: string;
};

export type AssistantV3ActionGroup = {
  id: string;
  label: string;
  actions: AssistantV3DynamicAction[];
};

export type AssistantV3CopilotInsight = {
  id: string;
  message: string;
  severity: "info" | "suggestion" | "warning";
  optional: true;
};

export type AssistantV3ProductionStep = {
  id: string;
  label: string;
  promptMessage: string;
  actionId?: AssistantActionId;
};

export type AssistantV3CopilotResponse = {
  version: 3.5;
  reasoningProfile: AssistantV3ReasoningProfile;
  openingLine: string;
  body: string;
  closingQuestion?: string;
  assetContext: AssistantV3AssetContext | null;
  partContext: AssistantV3PartContext | null;
  projectInsight: AssistantV3ProjectInsight | null;
  actionGroups: AssistantV3ActionGroup[];
  insights: AssistantV3CopilotInsight[];
  productionPlan: AssistantV3ProductionStep[] | null;
  confidence: AssistantInterpretationConfidence;
  understoodGoal: string;
};

export type AssistantV3QualityAudit = {
  contextAwareness: number;
  assetAwareness: number;
  partAwareness: number;
  hierarchyAwareness: number;
  projectAwareness: number;
  workflowAwareness: number;
  actionRelevance: number;
  languageQuality: number;
  routingAccuracy: number;
  overall: number;
  notes: string[];
};

export type AssistantV3TurnResult = {
  handled: boolean;
  memoryPatch?: Partial<import("@/lib/assistant-session-memory").AssistantSessionMemory>;
  producerResponse?: ProducerResponse;
  v3Response?: AssistantV3CopilotResponse;
};
