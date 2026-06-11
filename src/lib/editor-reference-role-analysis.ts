import { bootstrapEditorObjectDetection } from "@/lib/editor-detection-bootstrap";
import { analyzeCompositionReference } from "@/lib/editor-composition-plan";
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

export function buildReferenceAnalysisSummary(
  document: EditorCanvasDocument,
  roleSpec: EditorReferenceRoleSpec
): EditorReferenceRoleAnalysis {
  const composition = analyzeCompositionReference({
    name: document.name,
    url: document.backgroundUrl,
    type: roleToReferenceType(roleSpec.role),
  });
  const labels = composition.editableObjectLabels ?? [];
  const traits = composition.styleTraitLabels ?? [];
  const clothingDetected = labels.some((label) =>
    /jacket|shirt|pants|dress|outfit|shoe|coat|skirt|clothing/i.test(label)
  );
  const faceDetected = labels.some((label) => /face|person|human|portrait|head/i.test(label));
  return {
    status: "done",
    objectCount: labels.length,
    faceDetected,
    clothingDetected,
    styleTraits: traits.slice(0, 6),
    editableObjects: labels.slice(0, 8),
    analyzedAt: new Date().toISOString(),
  };
}

export async function runLiveReferenceRoleAnalysis(
  document: EditorCanvasDocument,
  roleSpec: EditorReferenceRoleSpec
): Promise<EditorReferenceRoleAnalysis> {
  try {
    const withDetection = await bootstrapEditorObjectDetection(document);
    const summary = buildReferenceAnalysisSummary(withDetection, roleSpec);
    return summary;
  } catch {
    return {
      status: "error",
      errorMessage: "analysis_failed",
    };
  }
}

export function referenceAnalysisLabelKeys(analysis: EditorReferenceRoleAnalysis): string[] {
  if (analysis.status === "running") {
    return ["editor.referenceRole.analysis.running"];
  }
  if (analysis.status === "error") {
    return ["editor.referenceRole.analysis.failed"];
  }
  if (analysis.status !== "done") {
    return [];
  }
  const keys: string[] = [];
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
