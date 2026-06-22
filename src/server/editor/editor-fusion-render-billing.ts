/**
 * Server-side fusion render billing — aligns with client workflow credits.
 */

import {
  fusionWorkflowRenderCredits,
  fusionWorkflowUsesIntelligence,
  estimateFusionWorkflowProfit,
} from "@/lib/editor-fusion-workflow-credits";
import { normalizeFusionIntent } from "@/lib/editor-image-fusion-catalog";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";
import type { ReferenceAnalysisProfile } from "@/types/editor-fusion-intelligence";

export const FUSION_RENDER_ACTION_TYPE = "fusion_render" as const;

export function resolveFusionRenderActionType(
  workflowType?: EditorFusionIntent | string | null
): typeof FUSION_RENDER_ACTION_TYPE | "image_generation" {
  if (!workflowType) {
    return "image_generation";
  }
  try {
    const normalized = normalizeFusionIntent(workflowType as EditorFusionIntent);
    if (fusionWorkflowUsesIntelligence(normalized)) {
      return FUSION_RENDER_ACTION_TYPE;
    }
  } catch {
    return "image_generation";
  }
  return "image_generation";
}

export function resolveFusionRenderCreditsRequired(
  workflowType: EditorFusionIntent | string
): number {
  return fusionWorkflowRenderCredits(normalizeFusionIntent(workflowType as EditorFusionIntent));
}

export function buildFusionRenderProfitEstimate(input: {
  workflowType: EditorFusionIntent;
  profiles?: ReferenceAnalysisProfile[];
  renderCostUsd?: number;
}): ReturnType<typeof estimateFusionWorkflowProfit> {
  return estimateFusionWorkflowProfit({
    workflowType: input.workflowType,
    profiles: input.profiles ?? [],
    generationCount: 1,
  });
}
