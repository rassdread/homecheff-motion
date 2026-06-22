/**
 * Pure auto-start scheduling — prevents cancelled rAF from permanently blocking bootstrap.
 */

export type AutoStartScheduleDecision =
  | "run"
  | "skip_completed"
  | "skip_in_flight"
  | "skip_no_bootstrap";

export function resolveAutoStartSchedule(input: {
  bootstrapCompletedKey: string | null;
  bootstrapInFlightKey: string | null;
  bootstrapKey: string;
  needsBootstrap: boolean;
  hasRichVisionAnalysis: boolean;
}): AutoStartScheduleDecision {
  if (!input.needsBootstrap) {
    if (input.hasRichVisionAnalysis) {
      return "skip_completed";
    }
    return "skip_no_bootstrap";
  }
  if (input.bootstrapCompletedKey === input.bootstrapKey) {
    return "skip_completed";
  }
  if (input.bootstrapInFlightKey === input.bootstrapKey) {
    return "skip_in_flight";
  }
  return "run";
}

export function shouldAutoStartWatchdogRetry(input: {
  autoStartAttempted: boolean;
  autoStartRetryUsed: boolean;
  bootstrapCompletedKey: string | null;
  bootstrapKey: string;
  runHasRtdetr: boolean;
  runStatus?: string;
}): boolean {
  if (!input.autoStartAttempted || input.autoStartRetryUsed) {
    return false;
  }
  if (input.bootstrapCompletedKey === input.bootstrapKey) {
    return false;
  }
  if (input.runStatus === "complete" || input.runStatus === "failed") {
    return false;
  }
  return !input.runHasRtdetr;
}
