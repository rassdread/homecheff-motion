import type { InstantMode } from "@/lib/instant-premium-mode-types";
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
export const EXPERT_STUDIO_HANDOFF_STEP_COUNT = 3;

export type InstantWizardFlowOptions = {
  /** When true, expert mode skips style/mood (already set in Studio). */
  studioHandoff?: boolean;
};

export function wizardStepCount(
  mode: InstantWizardMode,
  options?: InstantWizardFlowOptions
): number {
  if (mode === "beginner") {
    return BEGINNER_WIZARD_STEP_COUNT;
  }
  if (options?.studioHandoff) {
    return EXPERT_STUDIO_HANDOFF_STEP_COUNT;
  }
  return EXPERT_WIZARD_STEP_COUNT;
}

export function clampWizardStep(
  mode: InstantWizardMode,
  step: number,
  options?: InstantWizardFlowOptions
): number {
  return Math.min(wizardStepCount(mode, options), Math.max(1, step));
}

export function resolveWizardView(
  mode: InstantWizardMode,
  step: number,
  options?: InstantWizardFlowOptions
): InstantWizardView {
  const clamped = clampWizardStep(mode, step, options);
  if (mode === "expert" && options?.studioHandoff) {
    switch (clamped) {
      case 1:
        return "upload";
      case 2:
        return "prompt";
      case 3:
        return "generate";
      default:
        return "upload";
    }
  }
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

export function wizardStepTitleKey(
  mode: InstantWizardMode,
  step: number,
  instantMode?: InstantMode,
  options?: InstantWizardFlowOptions
): string {
  const view = resolveWizardView(mode, step, options);
  switch (view) {
    case "upload":
      return "instant.creatorStep.upload";
    case "storyboard":
      return mode === "beginner" && instantMode === "transition"
        ? "instant.wizardStep.frameOrder"
        : "instant.wizardStep.storyboard";
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

export function wizardStepHintKey(
  mode: InstantWizardMode,
  step: number,
  instantMode?: InstantMode,
  options?: InstantWizardFlowOptions
): string | null {
  const view = resolveWizardView(mode, step, options);
  switch (view) {
    case "storyboard":
      return mode === "beginner" && instantMode === "transition"
        ? "instant.wizardStep.frameOrderHint"
        : "instant.wizardStep.storyboardHint";
    case "text":
      return "instant.wizardStep.textHint";
    default:
      return null;
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
    flowOptions?: InstantWizardFlowOptions;
  }
): Omit<WizardNavConfig, "primaryLabel"> & { nextStep: number | null } {
  const flowOptions = options.flowOptions;
  const max = wizardStepCount(mode, flowOptions);
  const clamped = clampWizardStep(mode, step, flowOptions);

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
