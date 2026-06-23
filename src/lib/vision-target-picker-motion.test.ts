import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildBrandAssetProtectionLayer } from "@/lib/brand-asset-protection-layer";
import { resolveBrandLockedAssetsFromInstructionStudioState } from "@/lib/brand-asset-motion-lock";
import { buildLogoPlacementBlueprintFromVisionTargets } from "@/lib/vision-target-branding-bridge";
import {
  buildVisionTargetSelection,
  buildVisionTargetTreeFromDocument,
  flattenSelectableTargets,
} from "@/lib/vision-target-picker-v2";
import { applyVisionTargetRefsToBrandLockedAssets } from "@/lib/vision-target-motion-bridge";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type { IllustrationPartSpec } from "@/types/editor-illustration-parts";

function part(
  input: Pick<IllustrationPartSpec, "key" | "label"> &
    Partial<Omit<IllustrationPartSpec, "key" | "label">>
): IllustrationPartSpec {
  return {
    category: "clothing",
    group: "clothing",
    bbox: { x: 0.35, y: 0.4, width: 0.2, height: 0.18 },
    source: "rtdetr",
    confidence: 0.9,
    editable: true,
    ...input,
  };
}

function brandingDocument(): EditorCanvasDocument {
  const now = new Date().toISOString();
  return {
    sessionId: "sess_motion",
    name: "shirt.jpg",
    sourceKind: "character",
    sourceAssetId: null,
    backgroundUrl: "https://example.com/shirt.jpg",
    workflowStep: "visual_editor",
    objects: [],
    placements: [],
    status: "editing",
    createdAt: now,
    updatedAt: now,
    visionV6Meta: {
      mergedAnalysisParts: [
        part({ key: "shirt", label: "Shirt" }),
        part({ key: "chest_left", label: "chest_left" }),
      ],
      taxonomyType: "human",
      openAiPartsUsed: true,
    },
  };
}

describe("vision target motion bridge (Sprint K1.9)", () => {
  it("preserves hierarchy target on BrandLockedAsset for motion lock", () => {
    const doc = brandingDocument();
    const tree = buildVisionTargetTreeFromDocument(doc);
    const target = flattenSelectableTargets(tree.roots)[0];
    assert.ok(target);

    const selection = buildVisionTargetSelection(doc, [target.id], tree.roots);
    const blueprint = buildLogoPlacementBlueprintFromVisionTargets({
      document: doc,
      selection,
      logoAssetUrl: "https://example.com/logo.png",
      preserveLogoExact: true,
    });
    assert.ok(blueprint);

    const locked = resolveBrandLockedAssetsFromInstructionStudioState({
      logoPlacementBlueprint: blueprint,
    });
    assert.ok(locked.length >= 1);
    const logoLocked = locked.find((asset) => asset.assetUrl.includes("logo.png")) ?? locked[0]!;
    assert.equal(logoLocked.hierarchyNodeId, blueprint.hierarchyNodeId);
    assert.equal(logoLocked.normalizedTargetKey, blueprint.normalizedTargetKey);
    assert.equal(logoLocked.targetObjectId, blueprint.targetObjectId);
    assert.ok(logoLocked.targetBounds);

    const protection = buildBrandAssetProtectionLayer({
      workflowType: "logo_placement",
      logoPlacement: blueprint,
    });
    const remapped = applyVisionTargetRefsToBrandLockedAssets([logoLocked], blueprint);
    assert.equal(remapped[0]?.partId, blueprint.partId);
    assert.ok(protection.active);
  });
});
