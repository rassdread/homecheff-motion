import type { InstantWizardMode } from "@/lib/instant-wizard-mode";

export type InstantWizardView =
  | "upload"
  | "storyboard"
  | "text"
  | "style"
  | "mood"
  | "prompt"
  | "generate";

export const BEGINNER_WIZARD_STEP_COUNT = 4;
export const EXPERT_WIZARD_STEP_COUNT = 5;

export function wizardStepCount(mode: InstantWizardMode): number {
  return mode === "beginner" ? BEGINNER_WIZARD_STEP_COUNT : EXPERT_WIZARD_STEP_COUNT;
}

export function clampWizardStep(mode: InstantWizardMode, step: number): number {
  return Math.min(wizardStepCount(mode), Math.max(1, step));
}

export function resolveWizardView(mode: InstantWizardMode, step: number): InstantWizardView {
  const clamped = clampWizardStep(mode, step);
  if (mode === "beginner") {
    switch (clamped) {
      case 1:
        return "upload";
      case 2:
        return "storyboard";
      case 3:
        return "text";
      case 4:
        return "generate";
      default:
        return "upload";
    }
  }
  switch (clamped) {
    case 1:
      return "upload";
    case 2:
      return "style";
    case 3:
      return "mood";
    case 4:
      return "prompt";
    case 5:
      return "generate";
    default:
      return "upload";
  }
}

export function wizardStepTitleKey(mode: InstantWizardMode, step: number): string {
  const view = resolveWizardView(mode, step);
  switch (view) {
    case "upload":
      return "instant.creatorStep.upload";
    case "storyboard":
      return "instant.wizardStep.storyboard";
    case "text":
      return "instant.wizardStep.text";
    case "style":
      return "instant.creatorStep.animationType";
    case "mood":
      return "instant.creatorStep.mood";
    case "prompt":
      return "instant.creatorStep.prompt";
    case "generate":
      return "instant.creatorStep.generate";
    default:
      return "instant.creatorStep.upload";
  }
}

export type WizardNavConfig = {
  showBack: boolean;
  backPlaceholder?: boolean;
  onBack?: () => void;
  onPrimary: () => void;
  primaryDisabled: boolean;
  stackButtons: boolean;
};

export function buildWizardNavHandlers(
  mode: InstantWizardMode,
  step: number,
  options: {
    setStep: (step: number) => void;
    startCheckoutWithQa: () => void;
    canContinueFromUpload: boolean;
    checkoutBusy: boolean;
  }
): Omit<WizardNavConfig, "primaryLabel"> & { nextStep: number | null } {
  const max = wizardStepCount(mode);
  const clamped = clampWizardStep(mode, step);

  if (clamped >= max) {
    return {
      showBack: true,
      onBack: () => options.setStep(clamped - 1),
      onPrimary: options.startCheckoutWithQa,
      primaryDisabled: options.checkoutBusy || !options.canContinueFromUpload,
      stackButtons: true,
      nextStep: null,
    };
  }

  if (clamped === 1) {
    return {
      showBack: false,
      backPlaceholder: true,
      onPrimary: () => options.setStep(2),
      primaryDisabled: !options.canContinueFromUpload,
      stackButtons: false,
      nextStep: 2,
    };
  }

  return {
    showBack: true,
    onBack: () => options.setStep(clamped - 1),
    onPrimary: () => options.setStep(clamped + 1),
    primaryDisabled: false,
    stackButtons: false,
    nextStep: clamped + 1,
  };
}
