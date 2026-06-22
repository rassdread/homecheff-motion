/**
 * Fusion workflow cost logging — margin guardrails.
 */

import { fusionProfitMarginWarning } from "@/lib/editor-fusion-workflow-credits";
import type { FusionWorkflowCostLog } from "@/types/editor-fusion-intelligence";

const fusionCostLogs: FusionWorkflowCostLog[] = [];

export function logFusionWorkflowCost(
  log: FusionWorkflowCostLog & {
    provider?: string;
    model?: string;
    tokens?: number;
  }
): FusionWorkflowCostLog {
  const entry: FusionWorkflowCostLog = {
    ...log,
    timestamp: log.timestamp ?? new Date().toISOString(),
  };
  fusionCostLogs.push(entry);

  const margin = fusionProfitMarginWarning(entry);
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.info("[editor.fusion.cost]", {
      ...entry,
      marginStatus: margin,
      provider: log.provider,
      model: log.model,
      tokens: log.tokens,
    });
  }

  if (margin === "loss" && typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn("[editor.fusion.cost] negative margin — pricing review required", entry);
  }

  return entry;
}

export function getFusionWorkflowCostLogsForTests(): FusionWorkflowCostLog[] {
  return [...fusionCostLogs];
}

export function resetFusionWorkflowCostLogsForTests(): void {
  fusionCostLogs.length = 0;
}
