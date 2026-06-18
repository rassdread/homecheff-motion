import { clearChangePlan } from "@/lib/editor-instruction-change-plan";
import {
  parseEditorInstructionRequest,
  parsedRequestToChangePlanEntries,
} from "@/lib/editor-instruction-request-parser";
import {
  buildFusionPlanFromDirectorRequest,
  parseFusionDirectorRequest,
} from "@/lib/editor-fusion-request-parser";
import { patchFusionPlan } from "@/lib/editor-fusion-plan";
import { buildEditorRecommendationContext } from "@/lib/editor-recommendation-context";
import type { EditorInstructionObjectV2 } from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export function applyEditorDirectorPrompt(input: {
  document: EditorCanvasDocument;
  prompt: string;
  editableObjects: EditorInstructionObjectV2[];
  isAdmin?: boolean;
}): {
  document: EditorCanvasDocument;
  parsed: ReturnType<typeof parseEditorInstructionRequest> | null;
  firstObjectLabel?: string;
  firstObjectCategory?: string;
} {
  const { document, prompt, editableObjects, isAdmin = false } = input;
  const recCtx = buildEditorRecommendationContext({ document, isAdmin });
  const isCombine = document.editorFlowMode === "combine" || document.workspaceMode === "compose";

  if (isCombine) {
    const fusionParsed = parseFusionDirectorRequest(prompt);
    const fusionPlan = buildFusionPlanFromDirectorRequest(document, fusionParsed);
    const nextDoc = patchFusionPlan(document, fusionPlan);
    return {
      document: {
        ...nextDoc,
        instructionStudioState: {
          ...nextDoc.instructionStudioState,
          directorPrompt: prompt,
          combineIntent: fusionParsed.intent,
        },
        updatedAt: new Date().toISOString(),
      },
      parsed: parseEditorInstructionRequest(prompt, {
        brandName: recCtx.brandName,
        showHomeCheffExamples: recCtx.showHomeCheffExamples,
      }),
    };
  }

  const result = parseEditorInstructionRequest(prompt, {
    brandName: recCtx.brandName,
    showHomeCheffExamples: recCtx.showHomeCheffExamples,
  });

  const resolveObjectId = (label: string, category: string) => {
    const match = editableObjects.find(
      (o) =>
        o.label.toLowerCase().includes(label.toLowerCase()) ||
        label.toLowerCase().includes(o.label.toLowerCase()) ||
        o.category === category
    );
    return match?.id ?? `obj_${label.toLowerCase().replace(/\s+/g, "_")}`;
  };

  const items = parsedRequestToChangePlanEntries(result, resolveObjectId);
  const first = result.objects[0];

  return {
    document: {
      ...document,
      instructionStudioState: {
        ...document.instructionStudioState,
        directorPrompt: prompt,
        outputTarget: result.outputTarget,
        changePlan: items,
      },
      updatedAt: new Date().toISOString(),
    },
    parsed: result,
    firstObjectLabel: first?.object,
    firstObjectCategory: first?.objectCategory,
  };
}

export function clearEditorDirectorPlan(document: EditorCanvasDocument, prompt: string): EditorCanvasDocument {
  return clearChangePlan({
    ...document,
    instructionStudioState: { ...document.instructionStudioState, directorPrompt: prompt },
  });
}
