import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type {
  EditorInstructionVariant,
  EditorInstructionVariantApproval,
} from "@/types/editor-instruction-studio";
import { findInstructionVariant, listInstructionVariants } from "@/lib/editor-instruction-version";

export function variantApprovalStatus(
  variant: EditorInstructionVariant
): EditorInstructionVariantApproval {
  return variant.approvalStatus ?? "draft";
}

export function isApprovedVariant(variant: EditorInstructionVariant): boolean {
  return variantApprovalStatus(variant) === "approved" && variant.status === "completed";
}

export function approvedInstructionVariants(document: EditorCanvasDocument): EditorInstructionVariant[] {
  return listInstructionVariants(document).filter(isApprovedVariant);
}

export function activeApprovedVariant(
  document: EditorCanvasDocument
): EditorInstructionVariant | undefined {
  const activeId = document.instructionStudioState?.activeVariantId;
  if (!activeId) {
    return undefined;
  }
  const variant = findInstructionVariant(document, activeId);
  if (!variant || !isApprovedVariant(variant)) {
    return undefined;
  }
  return variant;
}

export function previewInstructionVariant(
  document: EditorCanvasDocument
): EditorInstructionVariant | undefined {
  const previewId = document.instructionStudioState?.previewVariantId;
  if (previewId) {
    return findInstructionVariant(document, previewId);
  }
  return activeApprovedVariant(document);
}

export function approveInstructionVariant(
  document: EditorCanvasDocument,
  variantId: string,
  options?: { setActive?: boolean }
): EditorCanvasDocument {
  const now = new Date().toISOString();
  const nextVariants = listInstructionVariants(document).map((v) =>
    v.id === variantId
      ? { ...v, approvalStatus: "approved" as const, updatedAt: now }
      : v
  );
  return {
    ...document,
    instructionVariants: nextVariants,
    instructionStudioState: {
      ...document.instructionStudioState,
      activeVariantId: options?.setActive !== false ? variantId : document.instructionStudioState?.activeVariantId,
      previewVariantId: variantId,
    },
    updatedAt: now,
  };
}

export function rejectInstructionVariant(
  document: EditorCanvasDocument,
  variantId: string
): EditorCanvasDocument {
  const now = new Date().toISOString();
  const nextVariants = listInstructionVariants(document).map((v) =>
    v.id === variantId ? { ...v, approvalStatus: "archived" as const, updatedAt: now } : v
  );
  const activeId = document.instructionStudioState?.activeVariantId;
  return {
    ...document,
    instructionVariants: nextVariants,
    instructionStudioState: {
      ...document.instructionStudioState,
      activeVariantId: activeId === variantId ? null : activeId,
      previewVariantId:
        document.instructionStudioState?.previewVariantId === variantId
          ? null
          : document.instructionStudioState?.previewVariantId,
    },
    updatedAt: now,
  };
}

export function archiveInstructionVariant(
  document: EditorCanvasDocument,
  variantId: string
): EditorCanvasDocument {
  return rejectInstructionVariant(document, variantId);
}

export function setActiveApprovedVariant(
  document: EditorCanvasDocument,
  variantId: string | null
): EditorCanvasDocument | null {
  if (!variantId) {
    return {
      ...document,
      instructionStudioState: {
        ...document.instructionStudioState,
        activeVariantId: null,
      },
      updatedAt: new Date().toISOString(),
    };
  }
  const variant = findInstructionVariant(document, variantId);
  if (!variant || !isApprovedVariant(variant)) {
    return null;
  }
  return {
    ...document,
    instructionStudioState: {
      ...document.instructionStudioState,
      activeVariantId: variantId,
      previewVariantId: variantId,
    },
    updatedAt: new Date().toISOString(),
  };
}
