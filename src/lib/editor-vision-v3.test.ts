import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEditorCutoutAsset, upsertEditorCutoutAsset } from "@/lib/editor-cutout-layers";
import {
  bboxIoU,
  buildEditorSemanticLayersFromHybrid,
  humanizeDetectorLabel,
  mergeHybridDetectionLabels,
} from "@/lib/editor-hybrid-detection";
import {
  editorLayerHasMaskTruth,
  editorObjectGeometryPriority,
  resolveEditorSelectionGeometry,
} from "@/lib/editor-mask-first";
import {
  cleanupMaskAlpha,
  refineContourPolygon,
  simplifyContourPolygon,
} from "@/lib/editor-mask-contour";
import { prepareEditorMotionForObject } from "@/lib/editor-motion-preparation";
import { maskHitTest, pickTopEditorObjectAtPoint } from "@/lib/editor-object-picking";
import { createMaskSelectionShape } from "@/lib/editor-object-mask";
import { planEditorSmartRemove } from "@/lib/editor-smart-remove";
import { planEditorSmartReplace } from "@/lib/editor-smart-replace";
import {
  buildSam2ProductionStatus,
  enqueueSam2Request,
  resolveSam2HealthState,
  withSam2Retry,
} from "@/lib/editor-sam2-production";
import { auditSam2Availability } from "@/lib/editor-sam2-segmentation";
import {
  getEditorVisionMetricsSnapshot,
  recordEditorVisionMetric,
  resetEditorVisionMetricsForTests,
} from "@/lib/editor-vision-metrics";
import { buildEditorObjectsFromLayers } from "@/lib/editor-object-detection";
import { seedEditorLayersFromVision } from "@/lib/editor-canvas-layers";
import { mapVisionJsonToAnalysis } from "@/lib/studio-asset-vision-analysis";
import type { EditorCanvasLayer, EditorObject } from "@/types/homecheff-visual-editor";

function mascotVision() {
  return mapVisionJsonToAnalysis(
    {
      objectType: "mascot",
      visualStyle: "Flat cartoon mascot",
      colors: [{ label: "Blue", hex: "#0067B1", role: "primary" }],
      keyFeatures: ["Mascot", "Globe", "Logo", "Tie"],
      brandIdentity: "HomeCheff Globe Mascot",
      assetFamily: "HomeCheff Mascots",
      suggestedPreserve: ["globe body"],
      confidence: 0.92,
      silhouette: "round globe mascot",
    },
    { sourceName: "Globe Man" }
  );
}

function mockLayer(overrides: Partial<EditorCanvasLayer> = {}): EditorCanvasLayer {
  return {
    id: "layer_tie",
    label: "Tie",
    sourceKind: "upload",
    assetId: null,
    storageKey: "",
    previewUrl: "",
    transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
    locked: false,
    visible: true,
    bounds: { x: 0.4, y: 0.3, width: 0.15, height: 0.2 },
    layerType: "semantic",
    confidence: 0.9,
    semanticType: "clothing",
    category: "clothing",
    ...overrides,
  };
}

describe("Editor Vision V3", () => {
  it("ONNX detection creates editor objects with real bounds", () => {
    const onnxDetections = [
      {
        label: "tie",
        confidence: 0.88,
        box: { x: 0.42, y: 0.32, width: 0.12, height: 0.18 },
      },
      {
        label: "sports ball",
        confidence: 0.81,
        box: { x: 0.55, y: 0.45, width: 0.2, height: 0.2 },
      },
    ];
    const layers = seedEditorLayersFromVision({
      vision: mascotVision(),
      sourceKind: "character",
      onnxDetections,
      detectorKind: "rtdetr",
    });
    const tie = layers.find((l) => l.label === "Tie" || l.label === "Globe");
    assert.ok(tie);
    assert.equal(tie?.metadata?.estimatedBounds, false);
    const objects = buildEditorObjectsFromLayers(layers, { visionObjectType: "mascot" });
    assert.ok(objects.some((o) => o.bbox.width < 0.5));
  });

  it("hybrid detection merges labels correctly", () => {
    const merged = mergeHybridDetectionLabels(
      ["person", "tie", "sports ball"],
      ["Mascot", "Globe", "Logo"]
    );
    assert.ok(merged.includes("Mascot"));
    assert.ok(merged.includes("Globe"));
    assert.ok(merged.includes("Logo"));
    assert.ok(merged.includes("Tie"));
    assert.equal(merged.some((l) => l === "person"), false);
  });

  it("humanizes COCO labels with vision context", () => {
    const vision = mascotVision();
    assert.equal(humanizeDetectorLabel("person", vision), "Mascot");
    assert.equal(humanizeDetectorLabel("sports ball", vision), "Globe");
    assert.equal(humanizeDetectorLabel("tie", vision), "Tie");
  });

  it("buildEditorSemanticLayersFromHybrid prefers ONNX bounds", () => {
    const result = buildEditorSemanticLayersFromHybrid({
      vision: mascotVision(),
      sourceKind: "character",
      onnxDetections: [
        { label: "tie", confidence: 0.9, box: { x: 0.1, y: 0.1, width: 0.2, height: 0.3 } },
      ],
      detectorKind: "rtdetr",
    });
    const onnxLayer = result.layers.find((l) => l.source === "onnx_detector" || l.label === "Tie");
    assert.equal(result.meta.source, "hybrid");
    assert.equal(onnxLayer?.metadata?.estimatedBounds, false);
  });

  it("SAM2 health reporting resolves ONLINE/OFFLINE/DEGRADED", () => {
    const offline = buildSam2ProductionStatus({
      available: false,
      endpointConfigured: false,
      fallbacks: ["approximate_box"],
    });
    assert.equal(offline.health, "OFFLINE");

    const online = resolveSam2HealthState({
      available: true,
      endpointConfigured: true,
      fallbacks: [],
    });
    assert.equal(online, "ONLINE");

    const degraded = resolveSam2HealthState(
      { available: true, endpointConfigured: true, fallbacks: [] },
      { recentFailureRate: 0.6 }
    );
    assert.equal(degraded, "DEGRADED");
  });

  it("mask contour quality pipeline simplifies and cleans", () => {
    const square = [
      { x: 0, y: 0 },
      { x: 0.1, y: 0 },
      { x: 0.1, y: 0.001 },
      { x: 0.1, y: 0.1 },
      { x: 0, y: 0.1 },
    ];
    const simplified = simplifyContourPolygon(square, 0.01);
    assert.ok(simplified.length <= square.length);
    const refined = refineContourPolygon(square);
    assert.ok(refined.length >= 3);

    const alpha = new Uint8Array(16 * 4);
    for (let y = 1; y < 3; y++) {
      for (let x = 1; x < 3; x++) {
        alpha[(y * 4 + x) * 4 + 3] = 255;
      }
    }
    const cleaned = cleanupMaskAlpha(alpha, 4, 4, 4);
    assert.equal(cleaned.length, alpha.length);
    assert.ok(cleaned.some((v, i) => i % 4 === 3 && v === 255));
  });

  it("mask-first selection prioritizes mask over bbox", () => {
    const shape = createMaskSelectionShape({
      bounds: { x: 0, y: 0, width: 0.5, height: 0.5 },
      maskUrl: "https://example.com/mask.png",
      polygon: [
        { x: 0.1, y: 0.1 },
        { x: 0.4, y: 0.1 },
        { x: 0.4, y: 0.4 },
        { x: 0.1, y: 0.4 },
      ],
      segmentationSource: "sam2",
    });
    const layer = mockLayer({ selectionShape: shape });
    assert.equal(editorLayerHasMaskTruth(layer), true);
    const geo = resolveEditorSelectionGeometry(layer);
    assert.equal(geo.priority, "mask");

    const object: EditorObject = {
      id: "obj_1",
      layerId: layer.id,
      label: "Tie",
      confidence: 0.9,
      mask: shape.maskUrl,
      polygon: shape.polygon,
      bbox: { x: 0, y: 0, width: 1, height: 1 },
      category: "clothing",
      zIndex: 2,
      visible: true,
      locked: false,
    };
    assert.equal(editorObjectGeometryPriority(object), "mask");
    assert.equal(maskHitTest({ x: 0.2, y: 0.2 }, object), true);

    const pick = pickTopEditorObjectAtPoint({ x: 0.2, y: 0.2 }, [
      { ...object, zIndex: 2 },
      {
        ...object,
        id: "obj_bg",
        layerId: "bg",
        zIndex: 0,
        bbox: { x: 0, y: 0, width: 1, height: 1 },
        mask: undefined,
        polygon: undefined,
      },
    ]);
    assert.equal(pick?.method, "mask");
  });

  it("masked remove plan is ready when mask exists", () => {
    const bounds = { x: 0.4, y: 0.3, width: 0.15, height: 0.2 };
    const layer = mockLayer({
      bounds,
      selectionShape: createMaskSelectionShape({
        bounds,
        maskUrl: "https://example.com/mask.png",
        segmentationSource: "sam2",
      }),
    });
    const plan = planEditorSmartRemove(layer);
    assert.equal(plan.inpaintMaskedArea, true);
    assert.equal(plan.ready, true);
    assert.equal(plan.preserveSurrounding, true);
  });

  it("masked replace plan constrains to mask", () => {
    const layer = mockLayer({
      selectionShape: createMaskSelectionShape({
        bounds: { x: 0.4, y: 0.3, width: 0.15, height: 0.2 },
        maskUrl: "https://example.com/mask.png",
        segmentationSource: "sam2",
      }),
    });
    const plan = planEditorSmartReplace({ layer, prompt: "Football" });
    assert.equal(plan.constrainedToMask, true);
    assert.equal(plan.usesMask, true);
  });

  it("cutout generation stores library metadata", () => {
    const bounds = { x: 0.4, y: 0.3, width: 0.15, height: 0.2 };
    const layer = mockLayer({
      bounds,
      selectionShape: createMaskSelectionShape({
        bounds,
        maskUrl: "https://example.com/mask.png",
        cutoutUrl: "https://example.com/cutout.png",
        segmentationSource: "sam2",
      }),
    });
    const object: EditorObject = {
      id: "obj_layer_tie",
      layerId: layer.id,
      label: "Tie",
      confidence: 0.9,
      bbox: layer.bounds,
      category: "clothing",
      zIndex: 1,
      visible: true,
      locked: false,
    };
    const asset = buildEditorCutoutAsset({
      object,
      layer,
      cutoutUrl: "https://example.com/cutout.png",
      maskUrl: "https://example.com/mask.png",
    });
    assert.ok(asset.label.includes("Cutout"));
    const stored = upsertEditorCutoutAsset([], asset);
    assert.equal(stored.length, 1);
  });

  it("motion handoff uses mask polygon region", () => {
    const polygon = [
      { x: 0.45, y: 0.35 },
      { x: 0.55, y: 0.35 },
      { x: 0.55, y: 0.5 },
      { x: 0.45, y: 0.5 },
    ];
    const layer = mockLayer({
      selectionShape: createMaskSelectionShape({
        bounds: { x: 0.45, y: 0.35, width: 0.1, height: 0.15 },
        maskUrl: "https://example.com/mask.png",
        polygon,
        cutoutUrl: "https://example.com/cutout.png",
        segmentationSource: "sam2",
      }),
    });
    const object: EditorObject = {
      id: "obj_1",
      layerId: layer.id,
      label: "Tie",
      confidence: 0.9,
      mask: "https://example.com/mask.png",
      polygon,
      bbox: layer.bounds,
      category: "clothing",
      zIndex: 1,
      visible: true,
      locked: false,
    };
    const prep = prepareEditorMotionForObject(object, layer);
    assert.ok(prep.maskUrl);
    assert.ok(prep.cutoutUrl);
    assert.equal(prep.ready, true);
    assert.ok(prep.animationRegion);
  });

  it("failure recovery retries SAM2 requests", async () => {
    let attempts = 0;
    const result = await withSam2Retry(async () => {
      attempts += 1;
      if (attempts < 2) {
        throw new Error("transient");
      }
      return "ok";
    }, { maxRetries: 2, retryDelayMs: 1, requestTimeoutMs: 1000, maxImageDimension: 2048, healthCheckTimeoutMs: 100 });
    assert.equal(result, "ok");
    assert.equal(attempts, 2);
  });

  it("SAM2 queue serializes concurrent requests", async () => {
    const order: number[] = [];
    const p1 = enqueueSam2Request(async () => {
      await new Promise((r) => setTimeout(r, 20));
      order.push(1);
    });
    const p2 = enqueueSam2Request(async () => {
      order.push(2);
    });
    await Promise.all([p1, p2]);
    assert.deepEqual(order, [1, 2]);
  });

  it("editor vision metrics track events", () => {
    resetEditorVisionMetricsForTests();
    recordEditorVisionMetric({ type: "detection", count: 3, source: "hybrid" });
    recordEditorVisionMetric({ type: "mask_created" });
    recordEditorVisionMetric({ type: "segmentation", success: true, durationMs: 120 });
    recordEditorVisionMetric({ type: "openai_edit", success: false, operation: "remove" });
    const snap = getEditorVisionMetricsSnapshot();
    assert.equal(snap.detectionCount, 3);
    assert.equal(snap.maskCount, 1);
    assert.equal(snap.failedObjectEdits, 1);
  });

  it("bbox IoU detects overlap for hybrid merge", () => {
    const a = { x: 0, y: 0, width: 0.5, height: 0.5 };
    const b = { x: 0.25, y: 0.25, width: 0.5, height: 0.5 };
    assert.ok(bboxIoU(a, b) > 0.1);
  });

  it("auditSam2Availability reports endpoint state", () => {
    const status = auditSam2Availability();
    assert.ok(status.fallbacks.length > 0);
    assert.equal(typeof status.endpointConfigured, "boolean");
  });
});
