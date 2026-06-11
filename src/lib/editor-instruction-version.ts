import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type {
  EditorInstructionSelection,
  EditorInstructionVariant,
  EditorInstructionVariantStatus,
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
      activeVariantId: variant.id,
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

export function setActiveInstructionVariant(
  document: EditorCanvasDocument,
  variantId: string | null
): EditorCanvasDocument {
  return {
    ...document,
    instructionStudioState: {
      ...document.instructionStudioState,
      activeVariantId: variantId,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function createPendingInstructionVariant(params: {
  sourceImageUrl: string;
  sourceImageId: string;
  instruction: EditorInstructionSelection;
  prompt: string;
  provider?: string;
  userNote?: string;
}): EditorInstructionVariant {
  const now = new Date().toISOString();
  return {
    id: createInstructionVariantId(),
    sourceImageUrl: params.sourceImageUrl,
    sourceImageId: params.sourceImageId,
    instruction: params.instruction,
    prompt: params.prompt,
    provider: params.provider,
    status: "pending",
    userNote: params.userNote,
    createdAt: now,
    updatedAt: now,
  };
}

export function instructionVariantWithStatus(
  variant: EditorInstructionVariant,
  status: EditorInstructionVariantStatus,
  patch?: Partial<EditorInstructionVariant>
): EditorInstructionVariant {
  return {
    ...variant,
    ...patch,
    status,
    updatedAt: new Date().toISOString(),
  };
}

/** Original background URL is never mutated — variants are appended separately. */
export function originalImageUrlUnchanged(
  before: EditorCanvasDocument,
  after: EditorCanvasDocument
): boolean {
  return before.backgroundUrl === after.backgroundUrl;
}
