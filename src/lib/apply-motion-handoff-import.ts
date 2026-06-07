import {
  clearAllWizardImageBlobs,
  clearPersistedWizardState,
  writePersistedWizardState,
} from "@/lib/instant-premium-wizard-storage";
import type { InstantMode } from "@/lib/instant-premium-mode-types";
import { resolveMotionHandoffExecutionPrefill } from "@/lib/motion-handoff-execution-prefill";
import { mapHandoffToPersistedWizardState } from "@/lib/studio-motion-handoff-map";
import type { MotionHandoffExecutionPrefill } from "@/types/motion-handoff-execution-prefill";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";

export type MotionHandoffImportOptions = {
  instantMode?: InstantMode;
  executionPrefill?: MotionHandoffExecutionPrefill;
};

/**
 * Replace the local Motion wizard draft with a Studio storyboard handoff.
 */
export async function applyMotionHandoffImport(
  payload: MotionHandoffPayload,
  options?: MotionHandoffImportOptions
): Promise<void> {
  clearPersistedWizardState();
  await clearAllWizardImageBlobs();
  const prefill = options?.executionPrefill ?? resolveMotionHandoffExecutionPrefill(payload);
  const state = mapHandoffToPersistedWizardState(payload, {
    instantMode: options?.instantMode ?? prefill.instantMode,
    executionPrefill: prefill,
  });
  writePersistedWizardState(state);
}

export { resolveMotionHandoffExecutionPrefill } from "@/lib/motion-handoff-execution-prefill";
export {
  resolveMotionHandoffExecutionConsumption,
  toMotionExecutionConsumptionSummary,
} from "@/lib/motion-handoff-execution-consumption";