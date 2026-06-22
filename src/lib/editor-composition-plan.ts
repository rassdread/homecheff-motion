import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { buildInstructionObjectsFromDocument } from "@/lib/editor-instruction-object-feed";
import type {
  EditorCompositionPlan,
  EditorCompositionPlanItem,
  EditorCompositionReference,
  EditorCompositionReferenceType,
  EditorCompositionTargetRole,
} from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import { activeApprovedVariant } from "@/lib/editor-instruction-approval";

export function createCompositionPlanId(): string {
  return `comp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createCompositionItemId(): string {
  return `comp_item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createCompositionReferenceId(): string {
  return `comp_ref_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function resolveCompositionBaseImageUrl(document: EditorCanvasDocument): {
  url: string;
  variantId: string | null;
} {
  const approved = activeApprovedVariant(document);
  if (approved?.resultUrl) {
    return { url: approved.resultUrl, variantId: approved.id };
  }
  const previewId = document.instructionStudioState?.previewVariantId;
  const preview = document.instructionVariants?.find((v) => v.id === previewId);
  if (preview?.resultUrl) {
    return { url: preview.resultUrl, variantId: preview.id };
  }
  return { url: document.backgroundUrl, variantId: null };
}

export function analyzeCompositionReference(input: {
  name: string;
  url: string;
  type: EditorCompositionReferenceType;
}): EditorCompositionReference {
  const synthetic = createEditorDocumentFromUpload({
    name: input.name,
    backgroundUrl: input.url,
  });
  return analyzeCompositionReferenceFromDocument(synthetic, input.type);
}

export function analyzeCompositionReferenceFromDocument(
  document: EditorCanvasDocument,
  type: EditorCompositionReferenceType,
  nameOverride?: string
): EditorCompositionReference {
  const feed = buildInstructionObjectsFromDocument(document);
  return {
    id: createCompositionReferenceId(),
    type,
    name: nameOverride ?? document.name,
    url: document.backgroundUrl,
    uploadedAt: new Date().toISOString(),
    editableObjectLabels: feed.editableObjects.map((o) => o.label),
    styleTraitLabels: feed.styleTraits.map((t) => t.label),
  };
}

export function getCompositionPlan(document: EditorCanvasDocument): EditorCompositionPlan | undefined {
  return document.instructionStudioState?.compositionPlan;
}

export function ensureCompositionPlan(document: EditorCanvasDocument): EditorCanvasDocument {
  const existing = getCompositionPlan(document);
  if (existing) {
    return document;
  }
  const base = resolveCompositionBaseImageUrl(document);
  const plan: EditorCompositionPlan = {
    id: createCompositionPlanId(),
    baseImageUrl: base.url,
    baseVariantId: base.variantId,
    items: [],
    references: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return patchCompositionPlan(document, plan);
}

export function patchCompositionPlan(
  document: EditorCanvasDocument,
  plan: EditorCompositionPlan
): EditorCanvasDocument {
  return {
    ...document,
    instructionStudioState: {
      ...document.instructionStudioState,
      compositionPlan: { ...plan, updatedAt: new Date().toISOString() },
    },
    updatedAt: new Date().toISOString(),
  };
}

export function addCompositionReference(
  document: EditorCanvasDocument,
  reference: EditorCompositionReference
): EditorCanvasDocument {
  const withPlan = ensureCompositionPlan(document);
  const plan = getCompositionPlan(withPlan)!;
  return patchCompositionPlan(withPlan, {
    ...plan,
    references: [...plan.references, reference],
  });
}

export function removeCompositionReference(
  document: EditorCanvasDocument,
  referenceId: string
): EditorCanvasDocument {
  const plan = getCompositionPlan(document);
  if (!plan) {
    return document;
  }
  return patchCompositionPlan(document, {
    ...plan,
    references: plan.references.filter((r) => r.id !== referenceId),
    items: plan.items.filter((i) => i.sourceReferenceId !== referenceId),
  });
}

export function appendCompositionPlanItem(
  document: EditorCanvasDocument,
  item: EditorCompositionPlanItem
): EditorCanvasDocument {
  const withPlan = ensureCompositionPlan(document);
  const plan = getCompositionPlan(withPlan)!;
  return patchCompositionPlan(withPlan, {
    ...plan,
    items: [...plan.items, item],
  });
}

export function removeCompositionPlanItem(
  document: EditorCanvasDocument,
  itemId: string
): EditorCanvasDocument {
  const plan = getCompositionPlan(document);
  if (!plan) {
    return document;
  }
  return patchCompositionPlan(document, {
    ...plan,
    items: plan.items.filter((i) => i.id !== itemId),
  });
}

export function buildCompositionPlanItem(input: {
  targetRole: EditorCompositionTargetRole;
  reference: EditorCompositionReference;
  sourceObjectLabel: string;
  sourceObjectCategory?: EditorCompositionPlanItem["sourceObjectCategory"];
  instruction?: string;
  order: number;
}): EditorCompositionPlanItem {
  return {
    id: createCompositionItemId(),
    targetRole: input.targetRole,
    sourceReferenceId: input.reference.id,
    sourceImageUrl: input.reference.url,
    sourceObjectLabel: input.sourceObjectLabel,
    sourceObjectCategory: input.sourceObjectCategory,
    instruction: input.instruction,
    preserveRules: ["brand colors", "illustration style"],
    priority: 50,
    order: input.order,
  };
}

export function reanalyzeCompositionReference(
  document: EditorCanvasDocument,
  referenceId: string
): EditorCanvasDocument {
  const plan = getCompositionPlan(document);
  if (!plan) {
    return document;
  }
  const ref = plan.references.find((r) => r.id === referenceId);
  if (!ref) {
    return document;
  }
  const analyzed = analyzeCompositionReference({
    name: ref.name,
    url: ref.url,
    type: ref.type,
  });
  return patchCompositionPlan(document, {
    ...plan,
    references: plan.references.map((r) =>
      r.id === referenceId ? { ...analyzed, id: r.id, uploadedAt: r.uploadedAt } : r
    ),
  });
}
