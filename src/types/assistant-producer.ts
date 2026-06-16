import type { AssistantActionId } from "@/lib/assistant-action-registry";
import type { AssistantInterpretationConfidence } from "@/types/assistant-interpretation";
import type {
  AssistantCostEstimate,
  AssistantExecutionChain,
  ProducerProductionPlan,
} from "@/types/assistant-producer-plan";

export type ProducerResponseOption = {
  id: string;
  label: string;
  promptMessage: string;
  actionId?: AssistantActionId;
  route?: string;
};

export type ProducerResponse = {
  understoodGoal: string;
  confidence: AssistantInterpretationConfidence;
  shortReply: string;
  options: ProducerResponseOption[];
  questions: string[];
  suggestedAction?: AssistantActionId;
  suggestedRoute?: string;
  canPrepare: boolean;
  requiresLogin: boolean;
  missingInputs: string[];
  clusterId?: string;
  productionPlan?: ProducerProductionPlan;
  costEstimate?: AssistantCostEstimate;
  executionChain?: AssistantExecutionChain;
};
