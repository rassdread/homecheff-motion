import type { AssistantActionId } from "@/lib/assistant-action-registry";
import type { EditorMorphActionId } from "@/lib/editor-morph-actions";
import type {
  IdentityDriftAssessment,
  IdentityPreservationProfile,
} from "@/types/assistant-identity-preservation";
import type {
  AssistantAssetType,
  AssistantV3CopilotResponse,
  AssistantV3DynamicAction,
} from "@/types/assistant-v3";

export type AssistantToolCategory =
  | "editor"
  | "morph"
  | "studio"
  | "motion"
  | "audio"
  | "publish";

export type AssistantToolCapability = {
  toolId: string;
  displayNameNl: string;
  displayNameEn: string;
  category: AssistantToolCategory;
  supportedAssetTypes: AssistantAssetType[];
  supportedPartTypes: string[];
  supportedActions: string[];
  requiredInputs: string[];
  optionalInputs: string[];
  defaultSettings: Record<string, string | boolean | number>;
  creditActionType: string;
  estimatedCredits?: number;
  provider?: string;
  outputType: "image" | "video" | "audio" | "export" | "storyboard" | "asset";
  route: string;
  morphActionId?: EditorMorphActionId;
  actionId?: AssistantActionId;
  safetyRules: string[];
  preserveOptions: string[];
  blockedTraits?: string[];
  unavailableReasons?: Partial<Record<string, { nl: string; en: string }>>;
  isFreeLocal?: boolean;
};

export type AssistantToolMatchSettings = Record<string, string | boolean | number>;

export type AssistantToolMatchResult = {
  bestTool: AssistantToolCapability;
  alternativeTools: AssistantToolCapability[];
  requiredSettings: AssistantToolMatchSettings;
  recommendedSettings: AssistantToolMatchSettings;
  preserveConstraints: string[];
  estimatedCredits: number;
  warnings: string[];
  route: string;
  actionId?: AssistantActionId;
  morphActionId?: EditorMorphActionId;
  blocked: boolean;
  blockedReason?: string;
  unavailable: boolean;
  unavailableReason?: string;
  identityProfile?: IdentityPreservationProfile;
  identityDrift?: IdentityDriftAssessment;
};

export type AssistantExecutionPreviewCta = {
  id: "execute" | "adjust" | "cancel" | "buy_credits" | "upgrade" | "cheaper_alternative";
  labelNl: string;
  labelEn: string;
  route?: string;
};

export type AssistantExecutionPreview = {
  toolId: string;
  toolDisplayNameNl: string;
  toolDisplayNameEn: string;
  goal: string;
  changeSummaryNl: string;
  changeSummaryEn: string;
  preserveItems: string[];
  estimatedCredits: number;
  availableCredits: number;
  sufficientCredits: boolean;
  resultSummaryNl: string;
  resultSummaryEn: string;
  riskWarningNl?: string;
  riskWarningEn?: string;
  route: string;
  settings: AssistantToolMatchSettings;
  status: "pending_confirmation" | "ready" | "blocked" | "unavailable";
  requiresConfirmation: boolean;
  ctas: AssistantExecutionPreviewCta[];
  cheaperAlternativeToolId?: string;
  identityRetentionPercent?: number;
  changedTraitLabels?: string[];
  identityDriftWarningNl?: string;
  identityDriftWarningEn?: string;
};

export type ProductionReadinessItem = {
  id: string;
  labelNl: string;
  labelEn: string;
  ready: boolean;
  weight: number;
};

export type ProductionReadinessScore = {
  scorePercent: number;
  ready: ProductionReadinessItem[];
  missing: ProductionReadinessItem[];
  recommendedNextStepNl: string;
  recommendedNextStepEn: string;
  recommendedRoute?: string;
  recommendedActionId?: AssistantActionId;
  creditsSufficient: boolean;
};

export type AssistantConsistencySuggestion = {
  id: string;
  messageNl: string;
  messageEn: string;
  severity: "info" | "suggestion" | "warning";
  suggestedActionId?: AssistantActionId;
  suggestedRoute?: string;
};

export type AssistantV4DynamicAction = AssistantV3DynamicAction & {
  toolId?: string;
  estimatedCredits?: number;
  settings?: AssistantToolMatchSettings;
};

export type AssistantV4CopilotResponse = Omit<AssistantV3CopilotResponse, "version" | "actionGroups"> & {
  version: 4;
  actionGroups: Array<{
    id: string;
    label: string;
    actions: AssistantV4DynamicAction[];
  }>;
  toolMatch: AssistantToolMatchResult | null;
  executionPreview: AssistantExecutionPreview | null;
  readinessScore: ProductionReadinessScore | null;
  consistencySuggestions: AssistantConsistencySuggestion[];
  clarityPresentation?: import("@/types/assistant-clarity").AssistantClarityPresentation;
};

export type AssistantV4TurnResult = {
  handled: boolean;
  memoryPatch?: Partial<import("@/lib/assistant-session-memory").AssistantSessionMemory>;
  producerResponse?: import("@/types/assistant-producer").ProducerResponse;
  v3Response?: AssistantV4CopilotResponse;
};
