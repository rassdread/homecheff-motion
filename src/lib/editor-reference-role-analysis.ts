import {
  hasValidPremiumAnalysis,
  writeCachedFusionAnalysisProfile,
} from "@/lib/editor-fusion-analysis-cache";
import {
  buildReferenceAnalysisProfile,
  summarizeReferenceProfile,
} from "@/lib/editor-fusion-reference-profile";
import { logFusionUploadAnalysis } from "@/lib/editor-fusion-analysis-timing-log";
import { ensureFusionReferencePremiumAnalysis } from "@/lib/editor-fusion-intelligence";
import { analyzeCompositionReferenceFromDocument } from "@/lib/editor-composition-plan";
import { bootstrapEditorObjectDetection } from "@/lib/editor-detection-bootstrap";
import type { EditorCompositionReferenceType } from "@/types/editor-instruction-studio";
import type {
  EditorReferenceRoleAnalysis,
  EditorReferenceRoleSpec,
} from "@/types/editor-reference-role-flow";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

function roleToReferenceType(role: string): EditorCompositionReferenceType {
  if (role === "logo") {
    return "logo";
  }
  if (role === "background" || role === "environment") {
    return "background";
  }
  if (role === "outfit" || role === "packaging" || role === "product") {
    return "style";
  }
  return "style";
}

export function createIdleReferenceAnalysis(): EditorReferenceRoleAnalysis {
  return { status: "idle" };
}

export function createQueuedReferenceAnalysis(): EditorReferenceRoleAnalysis {
  return { status: "queued" };
}

export type ReferenceRoleAnalysisResult = {
  analysis: EditorReferenceRoleAnalysis;
  document: EditorCanvasDocument;
};

export type ReferenceRoleAnalysisOptions = {
  useFusionIntelligence?: boolean;
  /** Fusion wizard upload — basic RT-DETR only, no premium AI or credits. */
  fusionWizardBasicOnly?: boolean;
  force?: boolean;
  isAdmin?: boolean;
  creditsAvailable?: number;
  onDocumentChange?: (document: EditorCanvasDocument) => void;
};

export function buildReferenceAnalysisSummary(
  document: EditorCanvasDocument,
  roleSpec: EditorReferenceRoleSpec
): EditorReferenceRoleAnalysis {
  const composition = analyzeCompositionReferenceFromDocument(
    document,
    roleToReferenceType(roleSpec.role)
  );
  const labels = composition.editableObjectLabels ?? [];
  const traits = composition.styleTraitLabels ?? [];
  const clothingDetected = labels.some((label) =>
    /jacket|shirt|pants|dress|outfit|shoe|coat|skirt|clothing/i.test(label)
  );
  const faceDetected = labels.some((label) => /face|person|human|portrait|head/i.test(label));
  const premiumCached = hasValidPremiumAnalysis(document);
  const profileSummary = document.referenceAnalysisProfile
    ? summarizeReferenceProfile(document.referenceAnalysisProfile)
    : undefined;
  const status =
    labels.length === 0 && traits.length === 0 && !premiumCached
      ? ("needs_attention" as const)
      : ("done" as const);
  return {
    status,
    objectCount: labels.length,
    faceDetected,
    clothingDetected,
    styleTraits: traits.slice(0, 6),
    editableObjects: labels.slice(0, 8),
    analyzedAt: new Date().toISOString(),
    premiumAnalysisStatus: premiumCached ? "cached" : "required",
    premiumAnalysisCached: premiumCached,
    profileSummary,
  };
}

export async function runBasicFusionReferenceAnalysis(
  document: EditorCanvasDocument,
  roleSpec: EditorReferenceRoleSpec
): Promise<ReferenceRoleAnalysisResult> {
  logFusionUploadAnalysis({
    phase: "upload",
    analysisDepth: "basic",
    styleDnaCalled: false,
    visionPartsCalled: false,
    premiumCreditsCalled: false,
    providersUsed: ["rtdetr"],
  });

  const withDetection = await bootstrapEditorObjectDetection(document, {
    analysisDepth: "basic",
  });
  let nextDoc = withDetection;
  if (hasValidPremiumAnalysis(withDetection)) {
    const profile = buildReferenceAnalysisProfile({
      document: withDetection,
      referenceId: `${roleSpec.id}_${withDetection.sessionId}`,
      role: roleSpec.role,
      roleId: roleSpec.id,
      name: withDetection.name,
      premiumCached: true,
    });
    nextDoc = writeCachedFusionAnalysisProfile(withDetection, profile);
  }
  const analysis = buildReferenceAnalysisSummary(nextDoc, roleSpec);
  return { analysis, document: nextDoc };
}

export async function runLiveReferenceRoleAnalysis(
  document: EditorCanvasDocument,
  roleSpec: EditorReferenceRoleSpec,
  options: ReferenceRoleAnalysisOptions = {}
): Promise<ReferenceRoleAnalysisResult> {
  try {
    if (options.fusionWizardBasicOnly) {
      return runBasicFusionReferenceAnalysis(document, roleSpec);
    }

    if (options.useFusionIntelligence) {
      const referenceId = `${roleSpec.id}_${document.sessionId}`;
      const ensured = await ensureFusionReferencePremiumAnalysis({
        reference: {
          document,
          referenceId,
          role: roleSpec.role,
          roleId: roleSpec.id,
          name: document.name,
        },
        force: options.force,
        isAdmin: options.isAdmin,
        creditsAvailable: options.creditsAvailable,
        onDocumentChange: options.onDocumentChange,
      });
      if (!ensured.ok) {
        return {
          document: ensured.document,
          analysis: {
            status: "error",
            errorMessage: ensured.failureCode ?? "analysis_failed",
            premiumAnalysisStatus: "missing",
          },
        };
      }
      const analysis = buildReferenceAnalysisSummary(ensured.document, roleSpec);
      return {
        document: ensured.document,
        analysis: {
          ...analysis,
          premiumAnalysisStatus: ensured.cached ? "cached" : "completed",
          premiumAnalysisCached: ensured.cached,
          profileSummary: summarizeReferenceProfile(ensured.profile),
        },
      };
    }

    const withDetection = await bootstrapEditorObjectDetection(document, {
      analysisDepth: "basic",
    });
    let nextDoc = withDetection;
    if (hasValidPremiumAnalysis(withDetection)) {
      const profile = buildReferenceAnalysisProfile({
        document: withDetection,
        referenceId: `${roleSpec.id}_${withDetection.sessionId}`,
        role: roleSpec.role,
        roleId: roleSpec.id,
        name: withDetection.name,
        premiumCached: true,
      });
      nextDoc = writeCachedFusionAnalysisProfile(withDetection, profile);
    }
    const analysis = buildReferenceAnalysisSummary(nextDoc, roleSpec);
    return { analysis, document: nextDoc };
  } catch {
    return {
      document,
      analysis: {
        status: "error",
        errorMessage: "analysis_failed",
        premiumAnalysisStatus: "missing",
      },
    };
  }
}

export function referenceAnalysisLabelKeys(analysis: EditorReferenceRoleAnalysis): string[] {
  if (analysis.status === "queued") {
    return ["editor.referenceRole.analysis.queued"];
  }
  if (analysis.status === "running") {
    return ["editor.referenceRole.analysis.running"];
  }
  if (analysis.status === "error") {
    return ["editor.referenceRole.analysis.failed"];
  }
  if (analysis.status === "needs_attention") {
    return ["editor.referenceRole.analysis.warning"];
  }
  if (analysis.status !== "done") {
    return [];
  }
  const keys: string[] = [];
  if (analysis.premiumAnalysisCached) {
    keys.push("editor.referenceRole.analysis.premiumCached");
  } else if (analysis.premiumAnalysisStatus === "completed") {
    keys.push("editor.referenceRole.analysis.premiumComplete");
  } else if (analysis.premiumAnalysisStatus === "required") {
    keys.push("editor.referenceRole.analysis.premiumRequired");
  }
  if (analysis.objectCount !== undefined && analysis.objectCount > 0) {
    keys.push("editor.referenceRole.analysis.objects");
  }
  if (analysis.faceDetected) {
    keys.push("editor.referenceRole.analysis.face");
  }
  if (analysis.clothingDetected) {
    keys.push("editor.referenceRole.analysis.clothing");
  }
  if (analysis.styleTraits && analysis.styleTraits.length > 0) {
    keys.push("editor.referenceRole.analysis.style");
  }
  return keys;
}
