import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type {
  BrandReferenceAsset,
  EditorInstructionReference,
  EditorInstructionReferenceType,
  EditorInstructionSelection,
} from "@/types/editor-instruction-studio";

export function createBrandReferenceId(): string {
  return `brand_ref_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createBrandReferenceAsset(params: {
  name: string;
  url: string;
  transparentBackground?: boolean;
}): BrandReferenceAsset {
  return {
    id: createBrandReferenceId(),
    name: params.name.trim() || "Logo",
    url: params.url,
    transparentBackground: params.transparentBackground ?? true,
    uploadedAt: new Date().toISOString(),
  };
}

export function listBrandReferences(document: EditorCanvasDocument): BrandReferenceAsset[] {
  return document.instructionStudioState?.brandReferences ?? [];
}

export function appendBrandReference(
  document: EditorCanvasDocument,
  asset: BrandReferenceAsset
): EditorCanvasDocument {
  const existing = listBrandReferences(document);
  return {
    ...document,
    instructionStudioState: {
      ...document.instructionStudioState,
      brandReferences: [...existing, asset],
    },
    updatedAt: new Date().toISOString(),
  };
}

export function findBrandReference(
  document: EditorCanvasDocument,
  id: string | undefined
): BrandReferenceAsset | undefined {
  if (!id) {
    return undefined;
  }
  return listBrandReferences(document).find((a) => a.id === id);
}

export function buildInstructionReferences(
  document: EditorCanvasDocument,
  selection: EditorInstructionSelection
): EditorInstructionReference[] {
  const refs: EditorInstructionReference[] = [
    {
      type: "SOURCE_IMAGE",
      assetId: "source",
      url: document.backgroundUrl,
      label: document.name,
    },
  ];

  const logo = findBrandReference(document, selection.logoReferenceId);
  if (logo) {
    refs.push({
      type: "LOGO_REFERENCE",
      assetId: logo.id,
      url: logo.url,
      label: logo.name,
    });
  }

  const styleRef = document.instructionStudioState?.styleReference;
  if (styleRef?.url) {
    refs.push(styleRef);
  }

  const productRef = document.instructionStudioState?.productReference;
  if (productRef?.url) {
    refs.push(productRef);
  }

  return refs;
}

export function setStyleReference(
  document: EditorCanvasDocument,
  ref: EditorInstructionReference | null
): EditorCanvasDocument {
  return {
    ...document,
    instructionStudioState: {
      ...document.instructionStudioState,
      styleReference: ref,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function setProductReference(
  document: EditorCanvasDocument,
  ref: EditorInstructionReference | null
): EditorCanvasDocument {
  return {
    ...document,
    instructionStudioState: {
      ...document.instructionStudioState,
      productReference: ref,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function createUploadedReference(
  type: Exclude<EditorInstructionReferenceType, "SOURCE_IMAGE">,
  params: { url: string; label: string }
): EditorInstructionReference {
  return {
    type,
    assetId: `${type.toLowerCase()}_${Date.now()}`,
    url: params.url,
    label: params.label,
  };
}
