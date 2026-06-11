import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type { EditorInstructionVariant } from "@/types/editor-instruction-studio";
import { listInstructionVariants } from "@/lib/editor-instruction-version";

export type EditorInstructionLineageNode = {
  id: string;
  label: string;
  kind: "original" | "variant";
  variant?: EditorInstructionVariant;
  children: EditorInstructionLineageNode[];
  depth: number;
};

export function buildInstructionLineageTree(document: EditorCanvasDocument): EditorInstructionLineageNode {
  const variants = listInstructionVariants(document);
  const byParent = new Map<string | null, EditorInstructionVariant[]>();

  for (const variant of variants) {
    const parent = variant.parentVariantId ?? null;
    const list = byParent.get(parent) ?? [];
    list.push(variant);
    byParent.set(parent, list);
  }

  function buildChildren(parentId: string | null, depth: number): EditorInstructionLineageNode[] {
    const siblings = byParent.get(parentId) ?? [];
    return siblings
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((variant) => ({
        id: variant.id,
        label: variant.name ?? variant.versionNote ?? variant.instruction.objectLabel,
        kind: "variant" as const,
        variant,
        depth,
        children: buildChildren(variant.id, depth + 1),
      }));
  }

  return {
    id: "original",
    label: document.name || "Original",
    kind: "original",
    depth: 0,
    children: buildChildren(null, 1),
  };
}

export function flattenLineageNodes(root: EditorInstructionLineageNode): EditorInstructionLineageNode[] {
  const out: EditorInstructionLineageNode[] = [];
  const walk = (node: EditorInstructionLineageNode) => {
    out.push(node);
    for (const child of node.children) {
      walk(child);
    }
  };
  walk(root);
  return out;
}

export function restoreLineageVariantAsPreview(
  document: EditorCanvasDocument,
  variantId: string
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
