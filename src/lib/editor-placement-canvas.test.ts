import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEditorSavePayload } from "@/lib/editor-canvas-export";
import { createEditorDocumentFromUpload, saveEditorCanvasDocument } from "@/lib/editor-canvas-session";
import { buildEditorCompositionGraphFromDocument } from "@/lib/editor-composition-graph";
import { seedEditorLayersFromVision } from "@/lib/editor-canvas-layers";
import {
  addEditorPlacement,
  centerPlacementOnTarget,
  createEditorPlacementItem,
  defaultEditorPlacementExactness,
  duplicateEditorPlacement,
  editorDocumentUsesPlacementSource,
  editorPlacementBlocksHardDelete,
  patchEditorPlacement,
  removeEditorPlacement,
  syncLinkedPlacementsOnTargetMove,
  visibleEditorPlacements,
} from "@/lib/editor-placement-canvas";
import { auditEditorPlacements } from "@/lib/editor-placement-qa";
import { semanticRecordUsesPlacementSource } from "@/lib/studio-asset-reference-placement";
import { mapVisionJsonToAnalysis } from "@/lib/studio-asset-vision-analysis";
import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";

function mascotLayers() {
  return seedEditorLayersFromVision({
    vision: mapVisionJsonToAnalysis(
      {
        objectType: "Mascot",
        keyFeatures: ["Globe body", "Garden apron", "Chef hat"],
        brandIdentity: "HomeCheff Globe Mascot",
        assetFamily: "HomeCheff Mascots",
        confidence: 0.9,
      },
      { sourceName: "Mascot" }
    ),
    sourceKind: "character",
  });
}

describe("editor-placement-canvas phase 3", () => {
  it("creates placement from upload source with target layer", () => {
    const layers = mascotLayers();
    const apron = layers.find((l) => /apron/i.test(l.label));
    assert.ok(apron);
    const placement = createEditorPlacementItem({
      sourceName: "Garden Logo",
      sourcePreviewUrl: "https://example.com/logo.png",
      sourceStorageKey: "uploads/logo.png",
      targetLayer: apron,
      placementType: "logo",
      importance: "exact",
    });
    assert.equal(placement.targetLabel, apron!.label);
    assert.equal(placement.linkedObjectId, apron!.id);
    assert.equal(placement.exactnessMode, "pixel_overlay");
    assert.equal(placement.canvasLocked, true);
  });

  it("supports custom target area placement", () => {
    const placement = createEditorPlacementItem({
      sourceName: "Poster",
      sourcePreviewUrl: "https://example.com/poster.png",
      sourceStorageKey: "uploads/poster.png",
      customTarget: true,
      placementType: "poster",
    });
    assert.equal(placement.customTarget, true);
    assert.equal(placement.targetLabel, "Custom area");
  });

  it("moves and scales placement via patch", () => {
    const doc = createEditorDocumentFromUpload({ name: "Test", backgroundUrl: "https://example.com/bg.png" });
    const placement = createEditorPlacementItem({
      sourceName: "Logo",
      sourcePreviewUrl: "https://example.com/logo.png",
      sourceStorageKey: "logo.png",
      customTarget: true,
    });
    const withPlacement = addEditorPlacement(doc, placement);
    const next = patchEditorPlacement(withPlacement, placement.id, {
      canvasTransform: { ...placement.canvasTransform, x: 0.6, y: 0.4 },
      canvasWidth: 0.25,
      canvasHeight: 0.18,
    });
    const updated = next.placements.find((p) => p.id === placement.id);
    assert.equal(updated?.canvasTransform.x, 0.6);
    assert.equal(updated?.canvasWidth, 0.25);
  });

  it("locks and hides placement", () => {
    const doc = createEditorDocumentFromUpload({ name: "Test", backgroundUrl: "https://example.com/bg.png" });
    const placement = createEditorPlacementItem({
      sourceName: "Badge",
      sourcePreviewUrl: "https://example.com/badge.png",
      sourceStorageKey: "badge.png",
      customTarget: true,
    });
    const hidden = patchEditorPlacement(addEditorPlacement(doc, placement), placement.id, {
      visible: false,
      canvasLocked: true,
    });
    assert.equal(visibleEditorPlacements(hidden).length, 0);
    assert.equal(hidden.placements[0]?.canvasLocked, true);
  });

  it("persists placements in draft save payload", () => {
    const layers = mascotLayers();
    const doc = saveEditorCanvasDocument({
      ...createEditorDocumentFromUpload({ name: "Garden Character", backgroundUrl: "https://example.com/bg.png" }),
      objects: layers,
      placements: [],
    });
    const apron = layers.find((l) => /apron/i.test(l.label))!;
    const withPlacement = addEditorPlacement(
      doc,
      createEditorPlacementItem({
        sourceName: "Garden Logo",
        sourcePreviewUrl: "https://example.com/logo.png",
        sourceStorageKey: "uploads/garden-logo.png",
        sourceAssetId: "asset-logo-1",
        targetLayer: apron,
      })
    );
    const saved = saveEditorCanvasDocument(withPlacement);
    const payload = buildEditorSavePayload(saved);
    assert.equal(payload.placementCount, 1);
    assert.equal(payload.referencePlacements.length, 1);
    assert.equal(payload.semanticRecordPatch.referencePlacements?.[0]?.sourceName, "Garden Logo");
  });

  it("builds composition graph with placement under target", () => {
    const layers = mascotLayers();
    const apron = layers.find((l) => /apron/i.test(l.label))!;
    const doc = addEditorPlacement(
      {
        ...createEditorDocumentFromUpload({ name: "Garden Character", backgroundUrl: "https://example.com/bg.png" }),
        objects: layers,
        placements: [],
      },
      createEditorPlacementItem({
        sourceName: "Garden Logo",
        sourcePreviewUrl: "https://example.com/logo.png",
        sourceStorageKey: "logo.png",
        targetLayer: apron,
      })
    );
    const graph = buildEditorCompositionGraphFromDocument(doc);
    assert.equal(graph[0]?.label, "Garden Character");
    const targetNode = graph[0]?.children.find((c) => c.label === apron.label);
    assert.ok(targetNode);
    assert.ok(targetNode?.children.some((c) => c.label === "Garden Logo"));
  });

  it("syncs linked placement when target layer moves", () => {
    const layers = mascotLayers();
    const apron = layers.find((l) => /apron/i.test(l.label))!;
    const doc = addEditorPlacement(
      {
        ...createEditorDocumentFromUpload({ name: "Test", backgroundUrl: "https://example.com/bg.png" }),
        objects: layers,
        placements: [],
      },
      createEditorPlacementItem({
        sourceName: "Logo",
        sourcePreviewUrl: "https://example.com/logo.png",
        sourceStorageKey: "logo.png",
        targetLayer: apron,
      })
    );
    const prev = apron as EditorCanvasLayer;
    const next = { ...prev, transform: { ...prev.transform, x: prev.transform.x + 0.1, y: prev.transform.y + 0.05 } };
    const synced = syncLinkedPlacementsOnTargetMove(doc, apron.id, prev, next);
    const moved = synced.placements[0];
    assert.ok((moved?.canvasTransform.x ?? 0) > placementStartX(doc));
  });

  it("audits placement QA for missing source", () => {
    const doc = addEditorPlacement(
      createEditorDocumentFromUpload({ name: "Test", backgroundUrl: "https://example.com/bg.png" }),
      createEditorPlacementItem({
        sourceName: "Broken",
        sourcePreviewUrl: "",
        sourceStorageKey: "",
        customTarget: true,
      })
    );
    const qa = auditEditorPlacements(doc);
    assert.equal(qa.failCount, 1);
  });

  it("maps exactness defaults by placement type", () => {
    assert.equal(defaultEditorPlacementExactness("logo"), "pixel_overlay");
    assert.equal(defaultEditorPlacementExactness("photo"), "hybrid");
    assert.equal(defaultEditorPlacementExactness("icon"), "pixel_overlay");
  });

  it("detects used-in relation for library safety", () => {
    const doc = addEditorPlacement(
      createEditorDocumentFromUpload({ name: "Test", backgroundUrl: "https://example.com/bg.png" }),
      createEditorPlacementItem({
        sourceName: "Logo",
        sourcePreviewUrl: "https://example.com/logo.png",
        sourceStorageKey: "uploads/logo.png",
        sourceAssetId: "logo-asset-99",
        customTarget: true,
      })
    );
    assert.equal(editorDocumentUsesPlacementSource(doc, { assetId: "logo-asset-99" }), true);
    assert.equal(
      semanticRecordUsesPlacementSource(buildEditorSavePayload(doc).semanticRecordPatch, {
        assetId: "logo-asset-99",
      }),
      true
    );
    assert.equal(editorPlacementBlocksHardDelete(["session-1"], "logo-asset-99"), true);
  });

  it("duplicates and removes placements", () => {
    const doc = createEditorDocumentFromUpload({ name: "Test", backgroundUrl: "https://example.com/bg.png" });
    const placement = createEditorPlacementItem({
      sourceName: "Logo",
      sourcePreviewUrl: "https://example.com/logo.png",
      sourceStorageKey: "logo.png",
      customTarget: true,
    });
    const withOne = addEditorPlacement(doc, placement);
    const withTwo = duplicateEditorPlacement(withOne, placement.id);
    assert.equal(withTwo.placements.length, 2);
    const removed = removeEditorPlacement(withTwo, withTwo.placements[1]!.id);
    assert.equal(removed.placements.length, 1);
  });

  it("centers placement on linked target", () => {
    const layers = mascotLayers();
    const hat = layers.find((l) => /hat|chef/i.test(l.label));
    assert.ok(hat);
    const doc = addEditorPlacement(
      {
        ...createEditorDocumentFromUpload({ name: "Test", backgroundUrl: "https://example.com/bg.png" }),
        objects: layers,
        placements: [],
      },
      createEditorPlacementItem({
        sourceName: "Designer Logo",
        sourcePreviewUrl: "https://example.com/logo.png",
        sourceStorageKey: "logo.png",
        targetLayer: hat,
      })
    );
    const centered = centerPlacementOnTarget(doc, doc.placements[0]!.id);
    assert.equal(centered.placements[0]?.canvasTransform.x, hat!.transform.x);
  });
});

function placementStartX(doc: ReturnType<typeof addEditorPlacement>) {
  return doc.placements[0]?.canvasTransform.x ?? 0;
}
