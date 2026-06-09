import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEditorSavePayload } from "@/lib/editor-canvas-export";
import { renderableEditorLayers, seedEditorLayersFromVision } from "@/lib/editor-canvas-layers";
import {
  applyEditorLayerOperation,
  createEditorDocumentFromUpload,
  patchEditorLayerTransform,
  saveEditorCanvasDocument,
} from "@/lib/editor-canvas-session";
import { isEditorOperationAllowed, resolveEditorLayerActionEligibility } from "@/lib/editor-layer-action-eligibility";
import { groupEditorLayerTree } from "@/lib/editor-layer-tree-build";
import { buildEditorSemanticLayersFromVision } from "@/lib/editor-semantic-layers-from-vision";
import { mapVisionJsonToAnalysis } from "@/lib/studio-asset-vision-analysis";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

function personVision() {
  return mapVisionJsonToAnalysis(
    {
      objectType: "human",
      visualStyle: "Realistic portrait photograph",
      colors: [{ label: "Skin", hex: "#E8BEAC", role: "primary" }],
      keyFeatures: ["Head", "Face", "Eyes", "Mouth", "Blue shirt", "Background wall"],
      brandIdentity: "Generic portrait",
      assetFamily: "People",
      suggestedPreserve: ["face"],
      confidence: 0.91,
      silhouette: "standing person",
    },
    { sourceName: "Person photo" }
  );
}

function mascotVision() {
  return mapVisionJsonToAnalysis(
    {
      objectType: "mascot",
      visualStyle: "Flat cartoon mascot",
      colors: [{ label: "Blue", hex: "#0067B1", role: "primary" }],
      keyFeatures: ["Globe body", "White face", "Chef hat", "Garden apron", "Laughing mouth"],
      brandIdentity: "HomeCheff Globe Mascot",
      assetFamily: "HomeCheff Mascots",
      suggestedPreserve: ["globe body"],
      confidence: 0.92,
      silhouette: "round globe mascot",
      accessoryPattern: "apron, hat",
    },
    { sourceName: "Globe Man" }
  );
}

function productVision() {
  return mapVisionJsonToAnalysis(
    {
      objectType: "product",
      visualStyle: "Packshot photo",
      colors: [{ label: "Green", hex: "#006D52", role: "primary" }],
      keyFeatures: ["Product body", "Front label", "Brand logo", "Cap", "Soft shadow"],
      brandIdentity: "Garden Sauce",
      assetFamily: "Packaging",
      confidence: 0.89,
      silhouette: "bottle",
    },
    { sourceName: "Sauce bottle" }
  );
}

describe("editor-semantic-layers phase 2", () => {
  it("maps vision key features to typed semantic layers", () => {
    const layers = buildEditorSemanticLayersFromVision({
      vision: personVision(),
      sourceKind: "upload",
    });
    assert.ok(layers.some((l) => l.type === "head" || l.label.toLowerCase().includes("head")));
    assert.ok(layers.some((l) => l.category === "face" || l.type === "face"));
    assert.ok(layers.some((l) => l.category === "background"));
  });

  it("creates mascot head/body/identity marker/accessory layers", () => {
    const vision = mascotVision();
    vision.identityFingerprint.identityShapeMarkers = ["Blue upper-head globe signature"];
    const layers = buildEditorSemanticLayersFromVision({
      vision,
      sourceKind: "character",
    });
    assert.ok(layers.some((l) => l.type === "identity_shape_marker"));
    assert.ok(layers.some((l) => l.category === "accessory" || l.type === "headwear"));
    assert.ok(layers.some((l) => l.category === "character" || l.type === "character"));
    const marker = layers.find((l) => l.type === "identity_shape_marker");
    assert.equal(marker?.locked, true);
    assert.equal(marker?.metadata?.identityRelevance, "identity_marker");
  });

  it("creates person head/face/clothing/background layers", () => {
    const layers = buildEditorSemanticLayersFromVision({
      vision: personVision(),
      sourceKind: "upload",
    });
    assert.ok(layers.some((l) => /head|face/i.test(l.label) || l.category === "face"));
    assert.ok(layers.some((l) => l.category === "clothing" || /shirt/i.test(l.label)));
    assert.ok(layers.some((l) => l.type === "background"));
  });

  it("creates product/label/logo/background layers", () => {
    const layers = buildEditorSemanticLayersFromVision({
      vision: productVision(),
      sourceKind: "product_photo",
    });
    assert.ok(layers.some((l) => l.type === "product_body" || l.category === "product"));
    assert.ok(layers.some((l) => l.type === "label" || /label/i.test(l.label)));
    assert.ok(layers.some((l) => l.type === "logo" || /logo/i.test(l.label)));
    assert.ok(layers.some((l) => l.type === "background"));
  });

  it("groups layer tree by category with nesting", () => {
    const canvasLayers = seedEditorLayersFromVision({
      vision: mascotVision(),
      sourceKind: "character",
    });
    const groups = groupEditorLayerTree(canvasLayers);
    assert.ok(groups.length >= 1);
    const hasNestedChildren = groups.some((g) => g.nodes.some((n) => n.children.length > 0));
    assert.ok(hasNestedChildren);
  });

  it("blocks delete on locked identity marker", () => {
    const canvasLayers = seedEditorLayersFromVision({
      vision: mascotVision(),
      sourceKind: "character",
    });
    const marker = canvasLayers.find((l) => l.semanticType === "identity_shape_marker");
    assert.ok(marker);
    assert.equal(isEditorOperationAllowed(marker, "delete"), false);
    assert.equal(resolveEditorLayerActionEligibility(marker).delete, false);
  });

  it("allows move/delete on accessory layers", () => {
    const canvasLayers = seedEditorLayersFromVision({
      vision: personVision(),
      sourceKind: "upload",
    });
    const accessory = canvasLayers.find(
      (l) => l.category === "clothing" || l.metadata?.identityRelevance === "editable_accessory"
    );
    assert.ok(accessory);
    assert.equal(isEditorOperationAllowed(accessory, "move"), true);
    assert.equal(isEditorOperationAllowed(accessory, "delete"), true);
  });

  it("does not render hidden layers on canvas", () => {
    const doc = createEditorDocumentFromUpload({
      name: "Test",
      backgroundUrl: "https://example.com/bg.png",
    });
    const layers = seedEditorLayersFromVision({ vision: productVision(), sourceKind: "upload" });
    const hidden = layers.find((l) => l.layerType === "semantic");
    assert.ok(hidden);
    const withHidden: EditorCanvasDocument = {
      ...doc,
      objects: layers.map((l) => (l.id === hidden.id ? { ...l, visible: false } : l)),
    };
    assert.equal(renderableEditorLayers(withHidden).some((l) => l.id === hidden.id), false);
  });

  it("marks low-confidence estimated bounds", () => {
    const layers = buildEditorSemanticLayersFromVision({
      vision: {
        ...productVision(),
        keyFeatures: ["Mystery blob"],
        confidence: 0.4,
      },
      sourceKind: "upload",
    });
    const unknown = layers.find((l) => l.label === "Mystery blob");
    assert.ok(unknown);
    assert.equal(unknown.metadata?.estimatedBounds, true);
    assert.ok(unknown.confidence < 0.55);
  });

  it("persists semantic layers in draft save payload", () => {
    const doc = createEditorDocumentFromUpload({
      name: "Upload",
      backgroundUrl: "https://example.com/upload.png",
    });
    const objects = seedEditorLayersFromVision({ vision: personVision(), sourceKind: "upload" });
    const saved = saveEditorCanvasDocument({ ...doc, objects });
    const payload = buildEditorSavePayload(saved);
    assert.ok(payload.semanticLayers.length > 1);
    assert.ok(payload.editorObjects.length > 1);
    assert.ok(payload.semanticRecordPatch.keyFeatures?.length);
  });

  it("seeds semantic layers for upload source kind", () => {
    const doc = createEditorDocumentFromUpload({
      name: "Uploaded photo",
      backgroundUrl: "https://example.com/photo.jpg",
    });
    const objects = seedEditorLayersFromVision({
      vision: personVision(),
      sourceKind: doc.sourceKind,
    });
    assert.ok(objects.filter((l) => l.layerType === "semantic").length >= 3);
    const next = patchEditorLayerTransform(
      { ...doc, objects },
      objects.find((l) => l.layerType === "semantic")!.id,
      { x: 0.5, y: 0.5 }
    );
    assert.ok(next.objects.some((l) => l.transform.x === 0.5));
  });

  it("prevents deleting identity marker via applyEditorLayerOperation", () => {
    const objects = seedEditorLayersFromVision({ vision: mascotVision(), sourceKind: "character" });
    const doc = createEditorDocumentFromUpload({
      name: "Mascot",
      backgroundUrl: "https://example.com/m.png",
    });
    const marker = objects.find((l) => l.semanticType === "identity_shape_marker");
    assert.ok(marker);
    const withLayers = { ...doc, objects };
    const after = applyEditorLayerOperation(withLayers, marker.id, "delete");
    assert.equal(after.objects.length, withLayers.objects.length);
  });
});
