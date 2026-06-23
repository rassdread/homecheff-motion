/**
 * Sprint K — target highlight geometry (polygon → mask → quad → bbox).
 */

import { generatePlacementQuad } from "@/lib/brand-asset-quad-generator";
import { resolveEditorSelectionGeometry } from "@/lib/editor-mask-first";
import type { VisionTargetGeometry, VisionTargetNodeV2 } from "@/types/vision-target-picker";
import type { EditorInstructionObjectBounds } from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export function confidenceToTier(confidence: number): VisionTargetNodeV2["confidenceTier"] {
  if (confidence >= 0.85) {
    return "very_high";
  }
  if (confidence >= 0.65) {
    return "likely";
  }
  return "review_recommended";
}

export function confidenceTierLabel(tier: VisionTargetNodeV2["confidenceTier"]): string {
  switch (tier) {
    case "very_high":
      return "● Zeer zeker";
    case "likely":
      return "● Waarschijnlijk";
    default:
      return "● Controle aanbevolen";
  }
}

export function resolveVisionTargetHighlightGeometry(
  document: EditorCanvasDocument,
  node: Pick<
    VisionTargetNodeV2,
    "layerId" | "objectId" | "hierarchyNodeId" | "geometry" | "label"
  > & { bounds?: EditorInstructionObjectBounds }
): VisionTargetGeometry {
  if (node.geometry) {
    return node.geometry;
  }

  const layer =
    (node.layerId ? document.objects.find((entry) => entry.id === node.layerId) : null) ??
    (node.objectId ? document.objects.find((entry) => entry.id === node.objectId) : null) ??
    null;
  const editorObject =
    document.detectedObjects?.find(
      (entry) => entry.id === node.objectId || entry.id === node.layerId
    ) ?? null;

  const resolved = resolveEditorSelectionGeometry(layer, editorObject);
  const bounds: EditorInstructionObjectBounds = node.bounds ?? {
    x: resolved.bbox.x,
    y: resolved.bbox.y,
    width: resolved.bbox.width,
    height: resolved.bbox.height,
    exact: resolved.priority !== "bbox",
  };

  let quad = undefined;
  if (resolved.polygon?.length || resolved.maskUrl) {
    const generated = generatePlacementQuad({
      bbox: bounds,
      polygon: resolved.polygon,
      maskUrl: resolved.maskUrl,
      objectLabel: node.label,
    });
    quad = generated.quad;
  }

  const priority: VisionTargetGeometry["priority"] =
    resolved.priority === "polygon"
      ? "polygon"
      : resolved.priority === "mask"
        ? "mask"
        : quad
          ? "quad"
          : "bbox";

  return {
    priority,
    bounds,
    polygon: resolved.polygon,
    maskUrl: resolved.maskUrl,
    quad,
  };
}
