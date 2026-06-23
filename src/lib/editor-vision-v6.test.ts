import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { alignDocumentLayer } from "@/lib/editor-v6-alignment";
import { defaultHomeCheffBrandKit, insertBrandKitItemOnCanvas } from "@/lib/editor-v6-brand-kit";
import { computeStudioHandoffScore } from "@/lib/editor-v6-handoff-score";
import {
  dropLibraryAssetOnCanvas,
  librarySourceToDragPayload,
} from "@/lib/editor-v6-library-drag";
import { buildMagicReplacePreview } from "@/lib/editor-v6-magic-replace";
import { attachMotionPreview, motionPreviewProfileForPreset } from "@/lib/editor-v6-motion-preview";
import { applySegmentCutoutToDocument, planOneClickCutout } from "@/lib/editor-v6-one-click-cutout";
import { applyPosterTemplate, posterPixelDimensions } from "@/lib/editor-v6-poster-builder";
import { quickActionsForLayer } from "@/lib/editor-v6-quick-actions";
import { applySocialPreset, socialExportDimensions } from "@/lib/editor-v6-social-kit";
import { shouldShowTechnicalMetadata } from "@/lib/editor-ux-cleanup";
import type { EditorCanvasDocument, EditorCanvasLayer } from "@/types/homecheff-visual-editor";
import type { AssetDerivationSourceListItem } from "@/types/studio-asset-derivation";

function mockLayer(overrides: Partial<EditorCanvasLayer> = {}): EditorCanvasLayer {
  return {
    id: "layer_logo",
    label: "Logo",
    sourceKind: "upload",
    assetId: null,
    storageKey: "",
    previewUrl: "",
    transform: { x: 0.3, y: 0.4, scale: 1, rotation: 0 },
    locked: false,
    visible: true,
    bounds: { x: 0.2, y: 0.2, width: 0.2, height: 0.2 },
    layerType: "semantic",
    category: "logo",
    ...overrides,
  };
}

function mockDocument(objects: EditorCanvasLayer[]): EditorCanvasDocument {
  const now = new Date().toISOString();
  return {
    sessionId: "sess_v6",
    name: "V6",
    sourceKind: "upload",
    sourceAssetId: null,
    backgroundUrl: "https://example.com/bg.png",
    workflowStep: "visual_editor",
    objects,
    placements: [],
    status: "editing",
    createdAt: now,
    updatedAt: now,
  };
}

describe("Editor Vision V6", () => {
  it("quick actions for selected object", () => {
    const actions = quickActionsForLayer(mockLayer());
    assert.ok(actions.includes("replace"));
    assert.ok(actions.includes("cutout"));
    assert.equal(quickActionsForLayer(mockLayer({ layerType: "background" })).length, 2);
  });

  it("one click cutout saves to library metadata", () => {
    const bg = mockLayer({
      id: "background",
      layerType: "background",
      bounds: { x: 0, y: 0, width: 1, height: 1 },
      locked: true,
    });
    const layer = mockLayer({
      selectionShape: {
        cutoutUrl: "https://example.com/c.png",
        maskUrl: "https://example.com/m.png",
        polygon: [],
        boundingBox: { x: 0.2, y: 0.2, width: 0.2, height: 0.2 },
        confidence: 0.9,
        segmentationSource: "sam2",
      },
    });
    const doc = mockDocument([bg, layer]);
    const result = applySegmentCutoutToDocument(doc, layer.id, {
      cutoutUrl: "https://example.com/c.png",
      maskUrl: "https://example.com/m.png",
    });
    assert.equal(result.document.libraryExports?.length, 1);
    assert.equal(result.document.libraryExports?.[0]?.category, "cutout");
    const plan = planOneClickCutout(result.document, layer.id);
    assert.equal(plan.needsSegmentation, false);
  });

  it("library drag creates imported layer", () => {
    const source: AssetDerivationSourceListItem = {
      sourceType: "library",
      kind: "character",
      assetId: "asset_1",
      name: "Garden Chef",
      referenceImageUrl: "https://example.com/mascot.png",
      referenceStorageKey: "key",
      thumbnailUrl: "https://example.com/thumb.png",
    };
    const payload = librarySourceToDragPayload(source);
    assert.equal(payload.kind, "mascot");
    const doc = dropLibraryAssetOnCanvas(mockDocument([mockLayer({ id: "background", layerType: "background", bounds: { x: 0, y: 0, width: 1, height: 1 } })]), payload);
    assert.equal(doc.importedLayers?.length, 1);
  });

  it("brand kit has HomeCheff defaults", () => {
    const kit = defaultHomeCheffBrandKit();
    assert.ok(kit.some((i) => i.kind === "color"));
    assert.ok(kit.some((i) => i.kind === "gradient"));
    const doc = insertBrandKitItemOnCanvas(
      mockDocument([mockLayer({ id: "background", layerType: "background", bounds: { x: 0, y: 0, width: 1, height: 1 } })]),
      kit.find((i) => i.kind === "color")!
    );
    assert.ok(doc);
  });

  it("poster builder applies template dimensions", () => {
    const doc = applyPosterTemplate(mockDocument([]), "a4");
    assert.equal(doc.productivityState?.posterTemplate, "a4");
    const dims = posterPixelDimensions("a4");
    assert.ok(dims.width > 1000);
  });

  it("social kit applies export dimensions", () => {
    const doc = applySocialPreset(mockDocument([]), "instagram_post");
    assert.equal(doc.exportSettings?.production?.width, 1080);
    const dims = socialExportDimensions("youtube_thumbnail");
    assert.equal(dims.width, 1280);
  });

  it("motion preview preset maps to animation profile", () => {
    const doc = attachMotionPreview(mockDocument([mockLayer()]), "layer_logo", "wave");
    assert.equal(doc.productivityState?.motionPreviewPreset, "wave");
    assert.equal(motionPreviewProfileForPreset("wave"), "wave");
  });

  it("handoff score computes readiness", () => {
    const score = computeStudioHandoffScore(mockDocument([mockLayer()]));
    assert.ok(score.score >= 0 && score.score <= 100);
    assert.equal(score.checks.length, 4);
  });

  it("magic replace preview requires input", () => {
    const preview = buildMagicReplacePreview(mockLayer(), {});
    assert.equal(preview.ready, false);
    const ready = buildMagicReplacePreview(mockLayer(), { prompt: "replace globe with football" });
    assert.equal(ready.ready, true);
  });

  it("alignment snaps layer to center", () => {
    const aligned = alignDocumentLayer(mockDocument([mockLayer()]), "layer_logo", "center");
    const layer = aligned.objects.find((o) => o.id === "layer_logo")!;
    assert.equal(layer.transform.x, 0.5);
    assert.equal(layer.transform.y, 0.5);
  });

  it("advanced mode metadata gate", () => {
    assert.equal(shouldShowTechnicalMetadata(false), false);
    assert.equal(shouldShowTechnicalMetadata(true), true);
  });
});
