/**
 * User-facing wizard copy — no technical architecture terms for end users.
 */

import { fusionWizardRenderActionKey } from "@/lib/editor-fusion-wizard-flow";
import type { FusionWizardRenderOutcome } from "@/lib/editor-fusion-wizard-render";
import type { WizardWorkflowPrice } from "@/lib/wizard-workflow-pricing";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";

export const WIZARD_USER_PROGRESS_STEP_KEYS = [
  "editor.wizardProgress.prepare",
  "editor.wizardProgress.analyze",
  "editor.wizardProgress.transform",
  "editor.wizardProgress.save",
] as const;

/** Maps internal 5-step pipeline index to 4 user-facing progress steps. */
export function mapFusionPipelineStepToUserProgress(stepIndex: number): number {
  if (stepIndex <= 0) {
    return 0;
  }
  if (stepIndex === 1) {
    return 1;
  }
  if (stepIndex === 2 || stepIndex === 3) {
    return 2;
  }
  return 3;
}

export function wizardUserProgressLabelKey(userStepIndex: number): string {
  return WIZARD_USER_PROGRESS_STEP_KEYS[userStepIndex] ?? WIZARD_USER_PROGRESS_STEP_KEYS[0];
}

export function wizardIncludedFeatureLabelKey(
  feature: WizardWorkflowPrice["includedFeatures"][number]
): `editor.wizardPricing.included.${string}` {
  return `editor.wizardPricing.included.${feature}` as `editor.wizardPricing.included.${string}`;
}

export function wizardMakeActionLabelKey(workflowType: EditorFusionIntent): string {
  return fusionWizardRenderActionKey(workflowType);
}

export type WizardPipelineErrorCopy =
  | { kind: "i18n"; key: `editor.wizardPricing.error.${string}`; params?: Record<string, string> }
  | { kind: "retry"; key: `editor.wizardPricing.error.${string}` };

export function resolveWizardPipelineErrorCopy(
  outcome: Extract<FusionWizardRenderOutcome, { ok: false }>
): WizardPipelineErrorCopy {
  if (outcome.code === "credit_gate") {
    return { kind: "i18n", key: "editor.wizardPricing.error.insufficientCredits" };
  }
  if (outcome.code === "analysis") {
    return { kind: "retry", key: "editor.wizardPricing.error.transformationFailed" };
  }
  if (outcome.code === "render" || outcome.code === "validation") {
    return { kind: "retry", key: "editor.wizardPricing.error.transformationFailed" };
  }
  return { kind: "retry", key: "editor.wizardPricing.error.transformationFailed" };
}

/** Strip internal IDs from labels shown in pricing UI. */
export function wizardFriendlyReferenceLabel(label: string): string {
  const trimmed = label.trim();
  if (/^ref_[\w-]+$/i.test(trimmed) || /^base_[\w-]+$/i.test(trimmed)) {
    return "";
  }
  if (/^[a-f0-9-]{20,}$/i.test(trimmed)) {
    return "";
  }
  return trimmed;
}

const TECHNICAL_USER_COPY_PATTERNS = [
  /premium analysis/i,
  /style dna/i,
  /vision parts/i,
  /fusion intelligence/i,
  /blueprint/i,
  /prompt coverage/i,
  /provider cost/i,
  /analysisid/i,
  /assetid/i,
];

export function containsTechnicalUserCopy(text: string): boolean {
  return TECHNICAL_USER_COPY_PATTERNS.some((pattern) => pattern.test(text));
}
