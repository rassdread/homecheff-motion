import type { AssistantV3ActionGroup } from "@/types/assistant-v3";

export type AssistantCopilotMode = "editor" | "producer" | "motion" | "publish" | "studio";

export type CopilotDecisionActionKind =
  | "execute"
  | "adjust"
  | "more_options"
  | "expert"
  | "route"
  | "prompt";

export type CopilotDecisionAction = {
  id: string;
  labelNl: string;
  labelEn: string;
  kind: CopilotDecisionActionKind;
  route?: string;
  promptMessage?: string;
  toolId?: string;
  estimatedCredits?: number;
};

export type CopilotSecondaryGroup = {
  id: string;
  labelNl: string;
  labelEn: string;
  actions: CopilotDecisionAction[];
};

export type CopilotExpertDetails = {
  toolMatchSummary?: string;
  selectedParts: string[];
  preserveConstraints: string[];
  readinessDetails?: string;
  consistencyWarnings: string[];
  creditBreakdown?: string;
  alternativeTools: string[];
  allInsights: string[];
  fullActionGroups: AssistantV3ActionGroup[];
};

export type AssistantClarityDecision = {
  mode: AssistantCopilotMode;
  contextHeaderNl: string;
  contextHeaderEn: string;
  recommendationNl: string;
  recommendationEn: string;
  recommendedAction: CopilotDecisionAction | null;
  primaryActions: CopilotDecisionAction[];
  secondaryGroups: CopilotSecondaryGroup[];
  expertDetails: CopilotExpertDetails;
  defaultWarningNl?: string;
  defaultWarningEn?: string;
  showAllOptions: boolean;
  warningCount: number;
};

export type AssistantClarityPresentation = {
  decision: AssistantClarityDecision;
  expertModeAction: CopilotDecisionAction;
};
