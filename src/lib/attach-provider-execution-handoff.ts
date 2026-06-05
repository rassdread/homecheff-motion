import { buildMotionProviderExecutionHandoffPlan } from "@/lib/studio-provider-execution-director";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type { StudioStoryboardDetail } from "@/types/studio-api";

export function attachProviderExecutionToHandoffPayload(
  payload: MotionHandoffPayload,
  options: { storyboard: StudioStoryboardDetail }
): MotionHandoffPayload {
  const providerExecutionPlan = buildMotionProviderExecutionHandoffPlan(
    options.storyboard
  );

  return {
    ...payload,
    providerExecutionPlan,
    providerAssignments: providerExecutionPlan.providerAssignments,
    providerFallbackPlan: providerExecutionPlan.providerFallbackPlan,
    providerCapabilities: providerExecutionPlan.providerCapabilities,
    providerWarnings: providerExecutionPlan.providerWarnings,
    providerCostEstimate: providerExecutionPlan.providerCostEstimate,
  };
}
