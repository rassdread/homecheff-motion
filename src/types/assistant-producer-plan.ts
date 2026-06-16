import type { AssistantActionId } from "@/lib/assistant-action-registry";

export type ProducerPlanStepStatus = "ready" | "pending" | "blocked";

export type ProducerPlanStep = {
  order: number;
  id: string;
  title: string;
  module: "studio" | "characters" | "motion" | "publish" | "editor" | "library";
  status: ProducerPlanStepStatus;
  missingAssets?: string[];
  route?: string;
  actionId?: AssistantActionId;
};

export type ProducerProductionPlan = {
  goal: string;
  steps: ProducerPlanStep[];
  estimatedCredits: number;
  estimatedRenderCount: number;
  estimatedAssetGenerations: number;
  reuseSavingsPercent?: number;
  expectedOutcome?: string;
};

export type AssistantCostEstimate = {
  estimatedCredits: number;
  estimatedRenderCount: number;
  estimatedAssetGenerations: number;
  reuseExistingAssets: boolean;
  savingsPercent?: number;
  summary: string;
};

export type AssistantExecutionChainStep = {
  order: number;
  label: string;
  actionId: AssistantActionId;
  assetId?: string;
  assetName?: string;
  status: "found" | "missing" | "prepare";
};

export type AssistantExecutionChain = {
  goal: string;
  steps: AssistantExecutionChainStep[];
  readyToOpenWizard: boolean;
  requiresConfirmation: true;
  suggestedRoute?: string;
};
