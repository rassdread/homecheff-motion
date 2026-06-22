/**
 * Premium analysis for fusion wizard — runs only after "Fusion maken", not during upload.
 */

import {
  ensureFusionReferencePremiumAnalysis,
  type FusionReferenceInput,
} from "@/lib/editor-fusion-intelligence";
import { hasValidPremiumAnalysis } from "@/lib/editor-fusion-analysis-cache";
import { logFusionRenderAnalysis } from "@/lib/editor-fusion-analysis-timing-log";
import { PREMIUM_VISION_ANALYSIS_CREDITS } from "@/lib/editor-premium-vision-credits";
import {
  applyReferenceRoleIntake,
  primaryBaseDocumentFromIntake,
} from "@/lib/editor-reference-role-intake";
import type { EditorReferenceIntakeState } from "@/types/editor-reference-role-flow";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export function collectFusionReferenceInputsFromIntake(
  intake: EditorReferenceIntakeState
): FusionReferenceInput[] {
  const refs: FusionReferenceInput[] = [];
  const seenSessionIds = new Set<string>();

  for (const slot of intake.slots) {
    for (const instance of slot.instances) {
      const sessionId = instance.document.sessionId;
      if (seenSessionIds.has(sessionId)) {
        continue;
      }
      seenSessionIds.add(sessionId);
      refs.push({
        document: instance.document,
        referenceId: instance.instanceId,
        role: slot.role,
        roleId: slot.roleId,
        name: instance.document.name,
      });
    }
  }

  const baseDoc = primaryBaseDocumentFromIntake(intake);
  if (baseDoc && !seenSessionIds.has(baseDoc.sessionId)) {
    refs.unshift({
      document: baseDoc,
      referenceId: `base_${baseDoc.sessionId}`,
      role: "base",
      roleId: "base",
      name: baseDoc.name,
    });
  }

  return refs;
}

export function patchIntakeReferenceDocuments(
  intake: EditorReferenceIntakeState,
  documentsByReferenceId: Map<string, EditorCanvasDocument>
): EditorReferenceIntakeState {
  return {
    ...intake,
    slots: intake.slots.map((slot) => ({
      ...slot,
      instances: slot.instances.map((instance) => ({
        ...instance,
        document: documentsByReferenceId.get(instance.instanceId) ?? instance.document,
      })),
    })),
  };
}

export type EnsureFusionWizardPremiumResult =
  | {
      ok: true;
      intake: EditorReferenceIntakeState;
      document: EditorCanvasDocument;
      cacheHits: number;
      cacheMisses: number;
      premiumAnalysesStarted: number;
      premiumCreditsCharged: number;
    }
  | {
      ok: false;
      code: "credit_gate" | "analysis_failed";
      message: string;
      estimatedCredits?: number;
      intake: EditorReferenceIntakeState;
    };

export async function ensureFusionWizardPremiumAnalyses(input: {
  intake: EditorReferenceIntakeState;
  isAdmin?: boolean;
  creditsAvailable?: number;
}): Promise<EnsureFusionWizardPremiumResult> {
  const references = collectFusionReferenceInputsFromIntake(input.intake);
  let cacheHits = 0;
  let cacheMisses = 0;
  let premiumAnalysesStarted = 0;
  let premiumCreditsCharged = 0;
  const documentsByReferenceId = new Map<string, EditorCanvasDocument>();

  for (const ref of references) {
    const wasCached = hasValidPremiumAnalysis(ref.document);
    if (wasCached) {
      cacheHits += 1;
      documentsByReferenceId.set(ref.referenceId, ref.document);
      continue;
    }

    cacheMisses += 1;
    premiumAnalysesStarted += 1;

    const ensured = await ensureFusionReferencePremiumAnalysis({
      reference: ref,
      isAdmin: input.isAdmin,
      creditsAvailable: input.creditsAvailable,
    });

    if (!ensured.ok) {
      logFusionRenderAnalysis({
        phase: "render",
        cacheHits,
        cacheMisses,
        premiumAnalysesStarted,
        premiumCreditsCharged,
        renderCreditsCharged: 0,
      });
      if (ensured.failureCode === "insufficient_credits") {
        return {
          ok: false,
          code: "credit_gate",
          message: "Insufficient credits for premium analysis.",
          estimatedCredits:
            (input.creditsAvailable ?? 0) +
            PREMIUM_VISION_ANALYSIS_CREDITS * (cacheMisses > 0 ? 1 : 0),
          intake: input.intake,
        };
      }
      return {
        ok: false,
        code: "analysis_failed",
        message: "Premium analysis failed.",
        intake: input.intake,
      };
    }

    documentsByReferenceId.set(ref.referenceId, ensured.document);
    premiumCreditsCharged += ensured.creditsCharged;
  }

  const updatedIntake = patchIntakeReferenceDocuments(input.intake, documentsByReferenceId);

  try {
    const document = applyReferenceRoleIntake(updatedIntake);
    return {
      ok: true,
      intake: updatedIntake,
      document,
      cacheHits,
      cacheMisses,
      premiumAnalysesStarted,
      premiumCreditsCharged,
    };
  } catch {
    return {
      ok: false,
      code: "analysis_failed",
      message: "Failed to build fusion document after premium analysis.",
      intake: updatedIntake,
    };
  }
}

export function estimateFusionWizardPremiumCreditsRequired(
  intake: EditorReferenceIntakeState,
  isAdmin?: boolean
): number {
  if (isAdmin) {
    return 0;
  }
  const refs = collectFusionReferenceInputsFromIntake(intake);
  return refs.filter((ref) => !hasValidPremiumAnalysis(ref.document)).length *
    PREMIUM_VISION_ANALYSIS_CREDITS;
}
