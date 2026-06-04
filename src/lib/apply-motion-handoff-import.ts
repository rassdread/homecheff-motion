import {
  clearAllWizardImageBlobs,
  clearPersistedWizardState,
  writePersistedWizardState,
} from "@/lib/instant-premium-wizard-storage";
import { mapHandoffToPersistedWizardState } from "@/lib/studio-motion-handoff-map";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";

/**
 * Replace the local Motion wizard draft with a Studio storyboard handoff.
 */
export async function applyMotionHandoffImport(payload: MotionHandoffPayload): Promise<void> {
  clearPersistedWizardState();
  await clearAllWizardImageBlobs();
  const state = mapHandoffToPersistedWizardState(payload);
  writePersistedWizardState(state);
}
