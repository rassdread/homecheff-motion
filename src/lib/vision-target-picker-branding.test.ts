import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildBrandAssetProtectionLayer } from "@/lib/brand-asset-protection-layer";
import {
  buildLogoPlacementBlueprintFromVisionTargets,
  visionTargetIdsFromBlueprint,
} from "@/lib/vision-target-branding-bridge";
import {
  buildVisionTargetSelection,
  buildVisionTargetTreeFromDocument,
  flattenSelectableTargets,
} from "@/lib/vision-target-picker-v2";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type { IllustrationPartSpec } from "@/types/editor-illustration-parts";

function part(
  input: Pick<IllustrationPartSpec, "key" | "label"> &
    Partial<Omit<IllustrationPartSpec, "key" | "label">>
): IllustrationPartSpec {
  return {
    category: "packaging",
    group: "packaging",
    bbox: { x: 0.35, y: 0.4, width: 0.25, height: 0.2 },
    source: "rtdetr",
    confidence: 0.86,
    editable: true,
    ...input,
  };
}

function packagingDocument(): EditorCanvasDocument {
  const now = new Date().toISOString();
  return {
    sessionId: "sess_brand",
    name: "pack.jpg",
    sourceKind: "product",
    sourceAssetId: null,
    backgroundUrl: "https://example.com/pack.jpg",
    workflowStep: "visual_editor",
    objects: [],
    placements: [],
    status: "editing",
    createdAt: now,
    updatedAt: now,
    visionV6Meta: {
      mergedAnalysisParts: [
        part({ key: "box", label: "Box" }),
        part({ key: "label", label: "label" }),
        part({ key: "front_panel", label: "front_panel" }),
      ],
      taxonomyType: "product",
      openAiPartsUsed: true,
    },
  };
}

describe("vision target branding bridge (Sprint K1.7)", () => {
  it("builds logo placement blueprint with hierarchy linkage", () => {
    const doc = packagingDocument();
    const tree = buildVisionTargetTreeFromDocument(doc);
    const selectable = flattenSelectableTargets(tree.roots);
    assert.ok(selectable.length > 0);

    const primary = selectable.find((node) => node.normalizedKey === "label") ?? selectable[0]!;
    const secondary =
      selectable.find((node) => node.normalizedKey === "front_panel" && node.id !== primary.id) ??
      selectable.find((node) => node.id !== primary.id);
    const ids = secondary ? [primary.id, secondary.id] : [primary.id];
    const selection = buildVisionTargetSelection(doc, ids, tree.roots);

    const blueprint = buildLogoPlacementBlueprintFromVisionTargets({
      document: doc,
      selection,
      logoAssetUrl: "https://example.com/logo.png",
      preserveLogoExact: true,
    });
    assert.ok(blueprint);
    assert.equal(blueprint.normalizedTargetKey, primary.normalizedKey);
    assert.ok(blueprint.hierarchyNodeId || blueprint.targetObjectId);
    if (secondary) {
      assert.ok((blueprint.additionalPlacementTargets?.length ?? 0) >= 1);
    }

    const protection = buildBrandAssetProtectionLayer({
      workflowType: "logo_placement",
      logoPlacement: blueprint,
      logoAssets: [{ referenceId: "logo", url: blueprint.logoAssetUrl }],
    });
    assert.equal(protection.active, true);
    assert.ok(protection.assets.length > 0);

    const roundTripIds = visionTargetIdsFromBlueprint(blueprint);
    assert.ok(roundTripIds.length >= 1);
  });
});
