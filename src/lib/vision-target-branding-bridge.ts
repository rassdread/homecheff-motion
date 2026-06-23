/**
 * Sprint K — branding / fusion / motion bridge from Vision Target Picker V2.
 */

import { buildLogoPlacementBlueprint, objectBoundsToBrandBounds } from "@/lib/logo-placement-blueprint";
import { generatePlacementQuad } from "@/lib/brand-asset-quad-generator";
import { resolveVisionTargetHighlightGeometry } from "@/lib/vision-target-highlight";
import {
  buildVisionTargetSelection,
  visionTargetToInstructionObject,
} from "@/lib/vision-target-picker-v2";
import type { LogoPlacementBlueprint } from "@/types/brand-asset-protection";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type {
  VisionPlacementTargetRef,
  VisionTargetNodeV2,
  VisionTargetSelection,
} from "@/types/vision-target-picker";

function nodeToPlacementRef(
  document: EditorCanvasDocument,
  node: VisionTargetNodeV2
): VisionPlacementTargetRef {
  const geometry = resolveVisionTargetHighlightGeometry(document, node);
  const quad =
    geometry.quad ??
    generatePlacementQuad({
      bbox: objectBoundsToBrandBounds(geometry.bounds),
      polygon: geometry.polygon,
      maskUrl: geometry.maskUrl,
      objectLabel: node.label,
      objectCategory: node.category,
    }).quad;

  return {
    targetObjectId: node.objectId ?? node.id,
    targetLabel: node.label,
    targetBounds: objectBoundsToBrandBounds(geometry.bounds),
    quad,
    hierarchyNodeId: node.hierarchyNodeId,
    partId: node.partId,
    normalizedTargetKey: node.normalizedKey,
  };
}

export function buildLogoPlacementBlueprintFromVisionTargets(input: {
  document: EditorCanvasDocument;
  selection: VisionTargetSelection;
  logoAssetUrl: string;
  preserveLogoExact?: boolean;
}): LogoPlacementBlueprint | null {
  const primary = input.selection.primary;
  if (!primary) {
    return null;
  }

  const primaryObject = visionTargetToInstructionObject(input.document, primary);
  const blueprint = buildLogoPlacementBlueprint({
    document: input.document,
    targetObject: primaryObject,
    logoAssetUrl: input.logoAssetUrl,
    preserveLogoExact: input.preserveLogoExact,
  });

  const additionalPlacementTargets = input.selection.nodes
    .slice(1)
    .map((node) => nodeToPlacementRef(input.document, node));

  return {
    ...blueprint,
    hierarchyNodeId: primary.hierarchyNodeId,
    partId: primary.partId,
    normalizedTargetKey: primary.normalizedKey,
    additionalPlacementTargets:
      additionalPlacementTargets.length > 0 ? additionalPlacementTargets : undefined,
  };
}

export function buildVisionTargetSelectionFromIds(input: {
  document: EditorCanvasDocument;
  roots: VisionTargetNodeV2[];
  targetIds: string[];
}): VisionTargetSelection {
  return buildVisionTargetSelection(input.document, input.targetIds, input.roots);
}

export function visionTargetIdsFromBlueprint(
  blueprint: LogoPlacementBlueprint
): string[] {
  const ids = [blueprint.hierarchyNodeId ?? blueprint.targetObjectId];
  for (const row of blueprint.additionalPlacementTargets ?? []) {
    ids.push(row.hierarchyNodeId ?? row.targetObjectId);
  }
  return ids.filter(Boolean);
}
