import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type {
  EditorInstructionReference,
  EditorInstructionSelection,
  EditorInstructionVariant,
  EditorInstructionVariantGenerationStatus,
} from "@/types/editor-instruction-studio";

export function createInstructionVariantId(): string {
  return `inst_var_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function listInstructionVariants(document: EditorCanvasDocument): EditorInstructionVariant[] {
  return document.instructionVariants ?? [];
}

export function findInstructionVariant(
  document: EditorCanvasDocument,
  variantId: string
): EditorInstructionVariant | undefined {
  return listInstructionVariants(document).find((v) => v.id === variantId);
}

export function activeInstructionVariant(
  document: EditorCanvasDocument
): EditorInstructionVariant | undefined {
  const activeId = document.instructionStudioState?.activeVariantId;
  if (!activeId) {
    return undefined;
  }
  return findInstructionVariant(document, activeId);
}

/** New variants are draft — do not auto-activate. */
export function appendInstructionVariant(
  document: EditorCanvasDocument,
  variant: EditorInstructionVariant
): EditorCanvasDocument {
  const now = new Date().toISOString();
  return {
    ...document,
    instructionVariants: [...listInstructionVariants(document), variant],
    instructionStudioState: {
      ...document.instructionStudioState,
      previewVariantId: variant.id,
    },
    updatedAt: now,
  };
}

export function patchInstructionVariant(
  document: EditorCanvasDocument,
  variantId: string,
  patch: Partial<EditorInstructionVariant>
): EditorCanvasDocument {
  const now = new Date().toISOString();
  const nextVariants = listInstructionVariants(document).map((variant) =>
    variant.id === variantId ? { ...variant, ...patch, updatedAt: now } : variant
  );
  return {
    ...document,
    instructionVariants: nextVariants,
    updatedAt: now,
  };
}

export function renameInstructionVariant(
  document: EditorCanvasDocument,
  variantId: string,
  name: string
): EditorCanvasDocument {
  return patchInstructionVariant(document, variantId, { name: name.trim() });
}

export function deleteInstructionVariant(
  document: EditorCanvasDocument,
  variantId: string
): EditorCanvasDocument {
  const nextVariants = listInstructionVariants(document).filter((v) => v.id !== variantId);
  const state = document.instructionStudioState;
  return {
    ...document,
    instructionVariants: nextVariants,
    instructionStudioState: {
      ...state,
      activeVariantId: state?.activeVariantId === variantId ? null : state?.activeVariantId,
      previewVariantId: state?.previewVariantId === variantId ? null : state?.previewVariantId,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function setPreviewInstructionVariant(
  document: EditorCanvasDocument,
  variantId: string | null
): EditorCanvasDocument {
  return {
    ...document,
    instructionStudioState: {
      ...document.instructionStudioState,
      previewVariantId: variantId,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function setActiveInstructionVariant(
  document: EditorCanvasDocument,
  variantId: string | null
): EditorCanvasDocument {
  return {
    ...document,
    instructionStudioState: {
      ...document.instructionStudioState,
      activeVariantId: variantId,
      previewVariantId: variantId ?? document.instructionStudioState?.previewVariantId,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function createPendingInstructionVariant(params: {
  sourceImageUrl: string;
  sourceImageId: string;
  instruction: EditorInstructionSelection;
  prompt: string;
  references?: EditorInstructionReference[];
  provider?: string;
  userNote?: string;
  name?: string;
  parentVariantId?: string | null;
  presetId?: string;
}): EditorInstructionVariant {
  const now = new Date().toISOString();
  return {
    id: createInstructionVariantId(),
    name: params.name,
    sourceImageUrl: params.sourceImageUrl,
    sourceImageId: params.sourceImageId,
    parentVariantId: params.parentVariantId ?? null,
    instruction: params.instruction,
    references: params.references,
    prompt: params.prompt,
    provider: params.provider,
    status: "pending",
    approvalStatus: "draft",
    userNote: params.userNote,
    presetId: params.presetId,
    createdAt: now,
    updatedAt: now,
  };
}

export function instructionVariantWithStatus(
  variant: EditorInstructionVariant,
  status: EditorInstructionVariantGenerationStatus,
  patch?: Partial<EditorInstructionVariant>
): EditorInstructionVariant {
  return {
    ...variant,
    ...patch,
    status,
    updatedAt: new Date().toISOString(),
  };
}

export function originalImageUrlUnchanged(
  before: EditorCanvasDocument,
  after: EditorCanvasDocument
): boolean {
  return before.backgroundUrl === after.backgroundUrl;
}
