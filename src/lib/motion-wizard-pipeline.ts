/**
 * Motion wizard pipeline — extends Character Studio transaction lifecycle for all motion workflows.
 * Reuses wizard-transaction-lifecycle + wizard-credit-reservation (no new billing engine).
 */

import {
  compensateWizardPipelineFailure,
  createWizardTransaction,
  markWizardTransactionCaptureComplete,
  registerWizardPremiumCapture,
  transitionWizardTransaction,
  type WizardTransactionRecord,
} from "@/lib/wizard-transaction-lifecycle";
import { validateWizardCreditReservation } from "@/lib/wizard-credit-reservation";
import { resolveMotionWizardGeneratePrice, resolveWizardWorkflowPrice } from "@/lib/wizard-workflow-pricing";
import type { PremiumVisionCreditSession } from "@/lib/editor-premium-vision-credits";
import type { WizardWorkflowPrice } from "@/lib/wizard-workflow-pricing";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";

export type MotionWizardWorkflowKind =
  | "instant_premium"
  | "motion_ready_character"
  | "full_body_extension"
  | "action_preset"
  | "storyboard_handoff"
  | "showcase_item";

export type MotionWizardSession = WizardTransactionRecord & {
  workflowKind: MotionWizardWorkflowKind;
};

function withWorkflowKind(
  session: MotionWizardSession,
  record: WizardTransactionRecord
): MotionWizardSession {
  return {
    ...record,
    workflowKind: session.workflowKind,
  };
}

export function createMotionWizardSession(input: {
  workflowKind: MotionWizardWorkflowKind;
  price: WizardWorkflowPrice;
}): MotionWizardSession {
  return {
    ...createWizardTransaction(input.price),
    workflowKind: input.workflowKind,
  };
}

export function resolveMotionWizardPrice(input: {
  workflowKind: MotionWizardWorkflowKind;
  fusionIntent?: EditorFusionIntent;
  referenceCount?: number;
  cachedAnalysisCount?: number;
  userIsAdmin?: boolean;
}): WizardWorkflowPrice {
  const userIsAdmin = input.userIsAdmin ?? false;
  if (
    input.workflowKind === "motion_ready_character" ||
    input.workflowKind === "full_body_extension"
  ) {
    return resolveMotionWizardGeneratePrice({
      workflowId:
        input.workflowKind === "full_body_extension" ? "full_body_extension" : "motion_ready_character",
      userIsAdmin,
    });
  }
  if (input.fusionIntent) {
    return resolveWizardWorkflowPrice({
      workflowType: input.fusionIntent,
      referenceCount: input.referenceCount ?? 1,
      cachedAnalysisCount: input.cachedAnalysisCount ?? 0,
      userIsAdmin,
    });
  }
  return resolveMotionWizardGeneratePrice({
    workflowId: "motion_ready_character",
    userIsAdmin,
  });
}

export function validateMotionWizardCredits(input: {
  price: WizardWorkflowPrice;
  creditsAvailable: number;
}): ReturnType<typeof validateWizardCreditReservation> {
  return validateWizardCreditReservation(input);
}

export function motionWizardStartAnalysis(session: MotionWizardSession): MotionWizardSession {
  return withWorkflowKind(session, transitionWizardTransaction(session, "ANALYSIS_RUNNING"));
}

export function motionWizardCompleteAnalysis(session: MotionWizardSession): MotionWizardSession {
  return withWorkflowKind(session, transitionWizardTransaction(session, "ANALYSIS_COMPLETE"));
}

export function motionWizardStartRender(session: MotionWizardSession): MotionWizardSession {
  return withWorkflowKind(session, transitionWizardTransaction(session, "RENDER_RUNNING"));
}

export function motionWizardRegisterPremiumCapture(
  session: MotionWizardSession,
  premiumSession: PremiumVisionCreditSession
): MotionWizardSession {
  return withWorkflowKind(session, registerWizardPremiumCapture(session, premiumSession));
}

export function motionWizardCaptureComplete(session: MotionWizardSession): MotionWizardSession {
  return withWorkflowKind(session, markWizardTransactionCaptureComplete(session));
}

export async function motionWizardCompensateFailure(
  session: MotionWizardSession,
  failureReason: string
): Promise<MotionWizardSession> {
  const compensated = await compensateWizardPipelineFailure({
    record: session,
    failureReason,
    renderFailed: session.state === "RENDER_RUNNING" || session.renderCaptured,
  });
  return withWorkflowKind(session, compensated);
}

export {
  compensateWizardPipelineFailure,
  createWizardTransaction,
  transitionWizardTransaction,
};
