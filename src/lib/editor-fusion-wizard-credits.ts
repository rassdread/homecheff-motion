import { hasValidPremiumAnalysis } from "@/lib/editor-fusion-analysis-cache";
import { profileFromAnalyzedDocument } from "@/lib/editor-fusion-intelligence";
import { buildFusionIntelligenceCostState } from "@/lib/editor-fusion-workflow-credits";
import { normalizeFusionIntent } from "@/lib/editor-image-fusion-catalog";
import { primaryBaseDocumentFromIntake } from "@/lib/editor-reference-role-intake";
import { PREMIUM_VISION_ANALYSIS_CREDITS } from "@/lib/editor-premium-vision-credits";
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

export function buildFusionWizardCreditPreview(input: {
  intake: EditorReferenceIntakeState;
  isAdmin?: boolean;
}): FusionWizardCreditPreview | null {
  const intent = input.intake.config.intent;
  if (!intent || input.intake.config.workflow !== "combine") {
    return null;
  }
  const normalized = normalizeFusionIntent(intent);
  const isAdmin = Boolean(input.isAdmin);
  const baseDoc = primaryBaseDocumentFromIntake(input.intake);
  const photos: FusionWizardPhotoCreditLine[] = [];
  const profiles = [];

  if (baseDoc) {
    const cached = hasValidPremiumAnalysis(baseDoc);
    photos.push({
      instanceId: baseDoc.sessionId,
      label: baseDoc.name,
      cached,
      credits: cached || isAdmin ? 0 : PREMIUM_VISION_ANALYSIS_CREDITS,
    });
    profiles.push(
      profileFromAnalyzedDocument({
        document: baseDoc,
        referenceId: `base_${baseDoc.sessionId}`,
        role: "base",
        roleId: "base",
        name: baseDoc.name,
      })
    );
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
      profiles.push(
        profileFromAnalyzedDocument({
          document: instance.document,
          referenceId: instance.instanceId,
          role: slot.role,
          roleId: slot.roleId,
          name: instance.document.name,
        })
      );
    }
  }

  const costState = buildFusionIntelligenceCostState({
    workflowType: normalized,
    profiles,
  });
  const analysisCredits = isAdmin ? 0 : costState.analysisCreditsRequired;
  const renderCredits = isAdmin ? 0 : costState.renderCredits;

  return {
    photos,
    analysisCredits,
    renderCredits,
    totalCredits: analysisCredits + renderCredits,
    adminFree: isAdmin,
  };
}
