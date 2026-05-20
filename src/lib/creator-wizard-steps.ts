/** Creator-first instant wizard: 5 steps (upload → style → mood → prompt → generate). */

export const CREATOR_WIZARD_FLOW_VERSION = 2;

export const CREATOR_WIZARD_STEP_COUNT = 5;

const LEGACY_STEP_TO_CREATOR: Record<number, number> = {
  1: 1,
  2: 2,
  3: 2,
  4: 5,
  5: 4,
  6: 5,
  7: 5,
};

export function normalizeCreatorWizardStep(step: number, flowVersion?: number): number {
  if (flowVersion === CREATOR_WIZARD_FLOW_VERSION) {
    return Math.min(CREATOR_WIZARD_STEP_COUNT, Math.max(1, step));
  }
  if (LEGACY_STEP_TO_CREATOR[step] !== undefined) {
    return LEGACY_STEP_TO_CREATOR[step];
  }
  return Math.min(CREATOR_WIZARD_STEP_COUNT, Math.max(1, step));
}

export function creatorWizardStepTitleKey(step: number): string {
  switch (step) {
    case 1:
      return "instant.creatorStep.upload";
    case 2:
      return "instant.creatorStep.animationType";
    case 3:
      return "instant.creatorStep.mood";
    case 4:
      return "instant.creatorStep.prompt";
    case 5:
      return "instant.creatorStep.generate";
    default:
      return "instant.creatorStep.upload";
  }
}
