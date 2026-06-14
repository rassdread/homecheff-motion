import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyIllustrationPartAnalysisToDocument,
  buildTemplateIllustrationPartAnalysis,
} from "@/lib/editor-vision-v6-part-analysis";
import {
  buildVirtualInstructionObjectFromNode,
  flattenSelectableHierarchyNodes,
  isHierarchyNodeSelectable,
  resolveInstructionObjectFromHierarchyNode,
} from "@/lib/editor-hierarchy-object-resolution";
import { buildChangePlanItemFromSelection } from "@/lib/editor-instruction-change-plan";
import { resolveDynamicActionsForObject } from "@/lib/editor-instruction-dynamic-actions";
import { buildInstructionObjectsFromDocument } from "@/lib/editor-instruction-object-feed";
import { extractPartToLibrary } from "@/lib/editor-part-extraction";
import { DEFAULT_EDITOR_INSTRUCTION_SLIDERS } from "@/types/editor-instruction-studio";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";

function mascotVision(): AssetVisionAnalysis {
  return {
    objectType: "mascot",
    objectTypeLabel: "Mascot",
    visualStyle: "Flat Cartoon",
    colors: [],
    shapeLanguage: [],
    keyFeatures: ["globe", "tie", "shoes"],
    brandIdentity: "HomeCheff",
    materialHints: "",
    environmentHints: "",
    suggestedPreserve: [],
    suggestedChange: [],
    suggestedForbidden: [],
    confidence: 0.9,
    safetyNotes: [],
    assetFamily: "",
    characterLineage: "",
    brandRecognitionConfidence: 0.9,
    identityFingerprint: {
      fingerprintHash: "mascot-parts",
      identityShapeMarkers: [],
      accessoryPattern: "",
      silhouette: "",
    },
  };
}

function enrichedDoc() {
  const now = new Date().toISOString();
  const base = {
    sessionId: "sess_parts",
    name: "Globe mascot.png",
    sourceKind: "character" as const,
    sourceAssetId: null,
    backgroundUrl: "https://example.com/mascot.png",
    workflowStep: "visual_editor" as const,
    objects: [
      {
        id: "background",
        label: "Background",
        layerType: "background" as const,
        sourceKind: "character" as const,
        assetId: null,
        storageKey: "",
        previewUrl: "https://example.com/mascot.png",
        transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
        locked: true,
        visible: true,
        bounds: { x: 0, y: 0, width: 1, height: 1 },
      },
    ],
    placements: [],
    status: "editing" as const,
    createdAt: now,
    updatedAt: now,
  };
  const vision = mascotVision();
  const analysis = buildTemplateIllustrationPartAnalysis(vision);
  return applyIllustrationPartAnalysisToDocument({
    document: base,
    vision,
    detections: [],
    analysis,
    previewUrl: "https://example.com/mascot.png",
    sourceKind: "character",
  });
}

describe("editor hierarchy part selection", () => {
  it("every V6 leaf with layerId is selectable", () => {
    const doc = enrichedDoc();
    const nodes = flattenSelectableHierarchyNodes(doc.visionHierarchy ?? []);
    assert.ok(nodes.length >= 8);
    for (const node of nodes) {
      if (node.layerId || node.partId) {
        assert.equal(isHierarchyNodeSelectable(node), true);
      }
    }
  });

  it("part without feed match gets virtual editable layer", () => {
    const doc = enrichedDoc();
    const globeNode = flattenSelectableHierarchyNodes(doc.visionHierarchy ?? []).find((n) =>
      /globe/i.test(n.label)
    );
    assert.ok(globeNode);
    const feed = buildInstructionObjectsFromDocument(doc).editableObjects;
    const obj = resolveInstructionObjectFromHierarchyNode(doc, feed, globeNode!);
    assert.ok(obj.layerId || obj.bounds);
    assert.ok(resolveDynamicActionsForObject(obj).some((a) => a.action === "replace"));
  });

  it("selecting Globe resolves object with extract action", () => {
    const doc = enrichedDoc();
    const globeNode = flattenSelectableHierarchyNodes(doc.visionHierarchy ?? []).find((n) =>
      /globe/i.test(n.label)
    );
    assert.ok(globeNode);
    const feed = buildInstructionObjectsFromDocument(doc).editableObjects;
    const globe = resolveInstructionObjectFromHierarchyNode(doc, feed, globeNode!);
    const actions = resolveDynamicActionsForObject(globe);
    assert.ok(actions.some((a) => a.action === "detach_asset"));
    assert.ok(actions.some((a) => a.action === "replace"));
  });

  it("extract Globe creates library asset metadata", () => {
    const doc = enrichedDoc();
    const feed = buildInstructionObjectsFromDocument(doc).editableObjects;
    const globe = feed.find((o) => /globe/i.test(o.label)) ??
      buildVirtualInstructionObjectFromNode(
        doc,
        flattenSelectableHierarchyNodes(doc.visionHierarchy ?? []).find((n) =>
          /globe/i.test(n.label)
        )!,
        0
      );
    const next = extractPartToLibrary(doc, { object: globe, quality: "estimated_crop" });
    const asset = next.partLibraryAssets?.find((a) => /globe/i.test(a.label));
    assert.ok(asset);
    assert.equal(asset?.extractionMeta?.sourceSessionId, doc.sessionId);
    assert.equal(asset?.extractionMeta?.extractionQuality, "estimated_crop");
  });

  it("replace Tie creates change plan item with target ids", () => {
    const doc = enrichedDoc();
    const tieNode = flattenSelectableHierarchyNodes(doc.visionHierarchy ?? []).find((n) =>
      /tie/i.test(n.label)
    );
    assert.ok(tieNode);
    const feed = buildInstructionObjectsFromDocument(doc).editableObjects;
    const tie = resolveInstructionObjectFromHierarchyNode(doc, feed, tieNode!);
    const item = buildChangePlanItemFromSelection(
      {
        objectKey: tie.id,
        objectLabel: tie.label,
        category: tie.category,
        action: "replace",
        replacement: "bow tie",
        targetPartId: tieNode!.partId,
        targetLayerId: tieNode!.layerId,
        sliders: DEFAULT_EDITOR_INSTRUCTION_SLIDERS,
      },
      0
    );
    assert.match(item.instruction, /bow tie/i);
    assert.equal(item.targetPartId, tieNode!.partId);
  });

  it("recolor Shoes creates change plan item", () => {
    const doc = enrichedDoc();
    const shoeNode = flattenSelectableHierarchyNodes(doc.visionHierarchy ?? []).find((n) =>
      /shoe/i.test(n.label)
    );
    assert.ok(shoeNode);
    const feed = buildInstructionObjectsFromDocument(doc).editableObjects;
    const shoes = resolveInstructionObjectFromHierarchyNode(doc, feed, shoeNode!);
    const item = buildChangePlanItemFromSelection(
      {
        objectKey: shoes.id,
        objectLabel: shoes.label,
        category: shoes.category,
        action: "change_color",
        color: "black",
        sliders: DEFAULT_EDITOR_INSTRUCTION_SLIDERS,
      },
      0
    );
    assert.match(item.instruction, /black/i);
  });

  it("estimated part includes refine selection action", () => {
    const doc = enrichedDoc();
    const node = flattenSelectableHierarchyNodes(doc.visionHierarchy ?? []).find(
      (n) => n.estimated && n.layerId
    );
    assert.ok(node);
    const feed = buildInstructionObjectsFromDocument(doc).editableObjects;
    const obj = resolveInstructionObjectFromHierarchyNode(doc, feed, node!);
    assert.ok(resolveDynamicActionsForObject(obj).some((a) => a.action === "refine_selection"));
  });
});
