import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  maskToBoundingBox,
  maskToPolygon,
} from "@/lib/editor-mask-contour";
import {
  auditSam2Availability,
  buildSam2RemotePoints,
  clampNormalizedPoint,
  editorMaskActionUsesSam2Shape,
  isSam2SegmentationAvailable,
  parseSam2RemoteResponse,
  sam2ResponseToEditorObjectShape,
  SAM2_UNAVAILABLE_USER_MESSAGE,
} from "@/lib/editor-sam2-segmentation";
import {
  editorMaskActionRequiresAiBackend,
  resolveEditorMaskActionExecutionState,
} from "@/lib/editor-mask-actions";
import { createMaskSelectionShape, applyEditorSelectionShape } from "@/lib/editor-object-mask";
import { validateEditorSegmentImageSource } from "@/server/editor/editor-image-ownership";
import { editorMaskStoragePath } from "@/server/editor/editor-mask-storage";
import { editorHumanUiHidesMaskTerminology } from "@/lib/editor-human-first";
import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";

describe("editor SAM2 click-to-segment", () => {
  it("auditSam2Availability reports missing endpoint", () => {
    const prev = process.env.SAM2_SEGMENTATION_URL;
    delete process.env.SAM2_SEGMENTATION_URL;
    const status = auditSam2Availability();
    assert.equal(status.available, false);
    assert.equal(status.reason, "SAM2_SEGMENTATION_URL missing");
    assert.ok(status.fallbacks.includes("manual_lasso"));
    if (prev) {
      process.env.SAM2_SEGMENTATION_URL = prev;
    }
  });

  it("isSam2SegmentationAvailable follows env", () => {
    const prev = process.env.SAM2_SEGMENTATION_URL;
    process.env.SAM2_SEGMENTATION_URL = "https://sam2.example/segment";
    assert.equal(isSam2SegmentationAvailable(), true);
    if (prev) {
      process.env.SAM2_SEGMENTATION_URL = prev;
    } else {
      delete process.env.SAM2_SEGMENTATION_URL;
    }
  });

  it("click segment route validates clickPoint", () => {
    const route = readFileSync("src/app/api/editor/segment/click/route.ts", "utf8");
    assert.match(route, /clickPoint/);
    assert.match(route, /requireActiveUser/);
    assert.match(route, /segmentByClick/);
  });

  it("clampNormalizedPoint maps client coordinates", () => {
    assert.deepEqual(clampNormalizedPoint({ x: 1.5, y: -0.2 }), { x: 1, y: 0 });
  });

  it("buildSam2RemotePoints supports positive and negative refinement", () => {
    const points = buildSam2RemotePoints({
      clickPoint: { x: 0.5, y: 0.5 },
      positivePoints: [{ x: 0.4, y: 0.4 }],
      negativePoints: [{ x: 0.8, y: 0.8 }],
    });
    assert.ok(points.some((p) => p.label === 1 && p.x === 0.5));
    assert.ok(points.some((p) => p.label === 0));
  });

  it("parseSam2RemoteResponse creates mask shape payload", () => {
    const parsed = parseSam2RemoteResponse({
      maskBase64: "iVBORw0KGgo=",
      confidence: 0.91,
      polygon: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.9, y: 0.9 }],
      boundingBox: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
    });
    assert.ok(parsed?.maskBase64);
    const shape = sam2ResponseToEditorObjectShape({
      maskUrl: "https://example.com/mask.png",
      polygon: parsed!.polygon!,
      boundingBox: parsed!.boundingBox!,
      confidence: parsed!.confidence,
    });
    assert.equal(shape.segmentationSource, "sam2");
    assert.equal(shape.selectionMode, "mask");
  });

  it("SAM2 unavailable message is user friendly", () => {
    assert.match(SAM2_UNAVAILABLE_USER_MESSAGE, /not available/i);
  });

  it("mask contour extraction derives bbox and polygon", () => {
    const width = 4;
    const height = 4;
    const channels = 4;
    const data = new Uint8Array(width * height * channels);
    for (let y = 1; y <= 2; y++) {
      for (let x = 1; x <= 2; x++) {
        const i = (y * width + x) * channels;
        data[i + 3] = 255;
      }
    }
    const bbox = maskToBoundingBox(data, width, height, channels);
    assert.ok(bbox);
    assert.ok(bbox!.width > 0);
    const polygon = maskToPolygon(data, width, height, channels);
    assert.ok(polygon.length >= 3);
  });

  it("mask-aware action prefers mask over bbox for SAM2 shape", () => {
    const layer: EditorCanvasLayer = {
      id: "globe",
      label: "Globe",
      sourceKind: "upload",
      assetId: null,
      storageKey: "",
      previewUrl: "",
      transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
      locked: false,
      visible: true,
      bounds: { x: 0.2, y: 0.2, width: 0.4, height: 0.4 },
      layerType: "semantic",
    };
    const shape = createMaskSelectionShape({
      bounds: layer.bounds,
      maskUrl: "https://example.com/mask.png",
      segmentationSource: "sam2",
    });
    const precise = applyEditorSelectionShape(layer, shape);
    assert.equal(editorMaskActionUsesSam2Shape(precise), true);
    assert.equal(resolveEditorMaskActionExecutionState(precise, "replace"), "ai_variant_pending");
    assert.equal(editorMaskActionRequiresAiBackend(precise, "delete"), true);
  });

  it("ownership validation rejects foreign image URLs", () => {
    const result = validateEditorSegmentImageSource({
      imageUrl: "https://blob.example.com/studio/other-user/editor/foo.png",
      userId: "user-1",
    });
    assert.equal(result.ok, false);
  });

  it("mask storage path is user scoped", () => {
    const path = editorMaskStoragePath({
      userId: "user-1",
      sessionId: "sess",
      objectId: "globe",
      kind: "mask",
    });
    assert.equal(path, "studio/user-1/editor-masks/sess/globe.png");
  });

  it("human-first visual mode hides SAM2 terminology", () => {
    assert.equal(editorHumanUiHidesMaskTerminology("visual"), true);
  });
});
