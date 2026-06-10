import { applyTransformToDocument } from "@/lib/editor-object-transforms";
import type {
  EditorCanvasDocument,
  EditorCanvasTransform,
  EditorObject,
  EditorObjectHierarchy,
  EditorObjectPart,
  EditorPartCategory,
} from "@/types/homecheff-visual-editor";

export type EditorLogoControlOperation = "replace" | "move" | "scale" | "rotate" | "lock" | "duplicate";

export function isLogoPart(part: EditorObjectPart): boolean {
  return part.partCategory === "logo";
}

export function findLogoParts(hierarchy: EditorObjectHierarchy): EditorObjectPart[] {
  return hierarchy.parts.filter(isLogoPart);
}

export function findLogoObject(objects: EditorObject[]): EditorObject | null {
  return (
    objects.find((o) => o.category === "logo") ??
    objects.find((o) => o.label.toLowerCase().includes("logo")) ??
    null
  );
}

export function logoPartFromHierarchy(
  hierarchies: Record<string, EditorObjectHierarchy>,
  rootObjectId: string
): EditorObjectPart | null {
  const hierarchy = hierarchies[rootObjectId];
  if (!hierarchy) return null;
  return findLogoParts(hierarchy)[0] ?? null;
}

export function applyLogoControl(
  document: EditorCanvasDocument,
  rootObjectId: string,
  operation: EditorLogoControlOperation,
  patch?: Partial<EditorCanvasTransform>
): EditorCanvasDocument {
  const hierarchies = document.objectHierarchies ?? {};
  const logo = logoPartFromHierarchy(hierarchies, rootObjectId);
  if (!logo) return document;

  const opMap: Record<EditorLogoControlOperation, import("@/lib/editor-object-transforms").EditorTransformOperation> = {
    move: "move",
    scale: "scale",
    rotate: "rotate",
    lock: "lock",
    duplicate: "duplicate",
    replace: "move",
  };

  return applyTransformToDocument(document, {
    rootObjectId,
    partId: logo.id,
    operation: opMap[operation],
    transformPatch: patch,
  });
}

export function logoReadyForExport(part: EditorObjectPart): boolean {
  return Boolean(part.mask || part.cutoutUrl) && !part.estimatedBounds;
}

export function logoReadyForAnimation(part: EditorObjectPart): boolean {
  return logoReadyForExport(part) && part.animationProfile !== "none";
}

export function logoReadyForPrint(part: EditorObjectPart): boolean {
  return logoReadyForExport(part) && part.bbox.width > 0.02 && part.bbox.height > 0.02;
}

export function resolveLogoPartCategory(label: string): EditorPartCategory {
  return label.toLowerCase().includes("logo") ? "logo" : "prop";
}
