import { hasValidPremiumAnalysis } from "@/lib/editor-fusion-analysis-cache";
import { resolveWizardWorkflowPriceFromIntake } from "@/lib/wizard-workflow-pricing";
import { PREMIUM_VISION_ANALYSIS_CREDITS } from "@/lib/editor-premium-vision-credits";
import { primaryBaseDocumentFromIntake } from "@/lib/editor-reference-role-intake";
import type { EditorReferenceIntakeState } from "@/types/editor-reference-role-flow";

export type FusionWizardPhotoCreditLine = {
  instanceId: string;
  label: string;
  cached: boolean;
  credits: number;
};

export type FusionWizardCreditPreview = {
  photos: FusionWizardPhotoCreditLine[];
  analysisCredits: number;
  renderCredits: number;
  totalCredits: number;
  adminFree: boolean;
};

/** @deprecated Use resolveWizardWorkflowPriceFromIntake — kept for admin/debug and legacy callers. */
export function buildFusionWizardCreditPreview(input: {
  intake: EditorReferenceIntakeState;
  isAdmin?: boolean;
}): FusionWizardCreditPreview | null {
  const price = resolveWizardWorkflowPriceFromIntake(input);
  if (!price) {
    return null;
  }

  const intent = input.intake.config.intent;
  if (!intent || input.intake.config.workflow !== "combine") {
    return null;
  }
  const isAdmin = Boolean(input.isAdmin);
  const baseDoc = primaryBaseDocumentFromIntake(input.intake);
  const photos: FusionWizardPhotoCreditLine[] = [];

  if (baseDoc) {
    const cached = hasValidPremiumAnalysis(baseDoc);
    photos.push({
      instanceId: baseDoc.sessionId,
      label: baseDoc.name,
      cached,
      credits: cached || isAdmin ? 0 : PREMIUM_VISION_ANALYSIS_CREDITS,
    });
  }

  for (const slot of input.intake.slots) {
    for (const instance of slot.instances) {
      const cached = hasValidPremiumAnalysis(instance.document);
      photos.push({
        instanceId: instance.instanceId,
        label: instance.document.name || instance.originalFilename || slot.roleId,
        cached,
        credits: cached || isAdmin ? 0 : PREMIUM_VISION_ANALYSIS_CREDITS,
      });
    }
  }

  return {
    photos,
    analysisCredits: price.analysisCredits,
    renderCredits: price.renderCredits,
    totalCredits: price.totalCredits,
    adminFree: price.adminBypass,
  };
}
