import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyCompositingOperation } from "@/lib/editor-compositing-tools";
import { openDualComposer, isDualComposerActive } from "@/lib/editor-dual-composer";
import {
  cutoutReadyForDrop,
  dropCutoutIntoTarget,
  updateImportedLayer,
} from "@/lib/editor-imported-layers";
import { isAdvancedExportTerm, userFacingExportLabel } from "@/lib/editor-human-first-v5";
import { appendLibraryExport, categoryForExportProfile } from "@/lib/editor-library-categories";
import { buildMotionReadyExportBundle } from "@/lib/editor-motion-ready-export";
import { buildPrintReadyExportBundle, mmToPixels, printDimensionsPixels } from "@/lib/editor-print-export";
import { assessPosterUpscaleNeeds } from "@/lib/editor-poster-upscale";
import { buildProductionReadyExportBundle } from "@/lib/editor-production-export";
import {
  attachQuickMotionConfig,
  planQuickMotionExport,
  quickMotionFormatMime,
} from "@/lib/editor-quick-gif";
import {
  modeShowsComposer,
  modeShowsExportPanel,
  modeShowsQuickMotion,
  resolveWorkspaceModeFromIntent,
} from "@/lib/editor-workspace-modes";
import { buildEditorSavePayload } from "@/lib/editor-canvas-export";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

function mockDocument(): EditorCanvasDocument {
  const now = new Date().toISOString();
  return {
    sessionId: "sess_v5",
    name: "V5 Test",
    sourceKind: "upload",
    sourceAssetId: null,
    backgroundUrl: "https://example.com/target.png",
    workflowStep: "visual_editor",
    objects: [
      {
        id: "background",
        label: "Background",
        sourceKind: "upload",
        assetId: null,
        storageKey: "",
        previewUrl: "",
        transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
        locked: true,
        visible: true,
        bounds: { x: 0, y: 0, width: 1, height: 1 },
        layerType: "background",
      },
    ],
    placements: [],
    workspaceMode: "photo_edit",
    status: "editing",
    createdAt: now,
    updatedAt: now,
  };
}

describe("Editor Vision V5", () => {
  it("dual composer opens with source image", () => {
    const doc = mockDocument();
    const next = openDualComposer(doc, {
      imageUrl: "https://example.com/source.png",
      name: "Source",
    });
    assert.equal(next.workspaceMode, "compose");
    assert.equal(isDualComposerActive(next), true);
    assert.equal(next.composerState?.sourceImageUrl, "https://example.com/source.png");
  });

  it("source object can become cutout when mask present", () => {
    assert.equal(cutoutReadyForDrop({ cutoutUrl: "https://example.com/c.png" }), true);
    assert.equal(cutoutReadyForDrop({ maskUrl: "https://example.com/m.png" }), true);
    assert.equal(cutoutReadyForDrop({}), false);
  });

  it("cutout can be dropped into target composition", () => {
    const doc = openDualComposer(mockDocument(), {
      imageUrl: "https://example.com/source.png",
    });
    const next = dropCutoutIntoTarget(doc, {
      label: "Product",
      sourceImageUrl: "https://example.com/source.png",
      cutoutUrl: "https://example.com/cutout.png",
      maskUrl: "https://example.com/mask.png",
      dropPoint: { x: 0.4, y: 0.6 },
    });
    assert.equal(next.importedLayers?.length, 1);
    assert.equal(next.importedLayers?.[0]?.label, "Product");
    assert.equal(next.importedLayers?.[0]?.transform.x, 0.4);
  });

  it("transform persists on imported layer", () => {
    let doc = dropCutoutIntoTarget(mockDocument(), {
      label: "Logo",
      sourceImageUrl: "https://example.com/logo.png",
    });
    const layerId = doc.importedLayers![0]!.id;
    doc = updateImportedLayer(doc, layerId, {
      transform: { x: 0.2, y: 0.3, scale: 1.5, rotation: 45 },
    });
    doc = applyCompositingOperation(doc, layerId, "rotate", { rotation: 90 });
    const layer = doc.importedLayers!.find((l) => l.id === layerId)!;
    assert.equal(layer.transform.rotation, 90);
    assert.equal(layer.transform.scale, 1.5);
  });

  it("GIF preset creates animation config", () => {
    const doc = attachQuickMotionConfig(mockDocument(), { preset: "bounce", format: "gif" });
    assert.equal(doc.quickMotionConfig?.preset, "bounce");
    assert.equal(doc.workspaceMode, "quick_motion");
    const job = planQuickMotionExport(doc);
    assert.ok(job.frameCount > 0);
    assert.equal(job.format, "gif");
  });

  it("GIF WebP MP4 export routes exist", () => {
    assert.equal(quickMotionFormatMime("gif"), "image/gif");
    assert.equal(quickMotionFormatMime("webp"), "image/webp");
    assert.equal(quickMotionFormatMime("mp4"), "video/mp4");
    const gifJob = planQuickMotionExport(
      attachQuickMotionConfig(mockDocument(), { format: "gif" })
    );
    const webpJob = planQuickMotionExport(
      attachQuickMotionConfig(mockDocument(), { format: "webp" })
    );
    const mp4Job = planQuickMotionExport(
      attachQuickMotionConfig(mockDocument(), { format: "mp4" })
    );
    assert.equal(gifJob.format, "gif");
    assert.equal(webpJob.format, "webp");
    assert.equal(mp4Job.format, "mp4");
  });

  it("Motion Ready export includes masks and cutouts", () => {
    const doc = dropCutoutIntoTarget(mockDocument(), {
      label: "Mascot",
      sourceImageUrl: "https://example.com/m.png",
      maskUrl: "https://example.com/mask.png",
      cutoutUrl: "https://example.com/cutout.png",
    });
    const bundle = buildMotionReadyExportBundle(doc);
    assert.equal(bundle.profile, "motion_ready");
    assert.equal(bundle.importedLayers.length, 1);
    assert.equal(bundle.includesMasks, true);
  });

  it("Production Ready export supports PNG JPG WebP", () => {
    const bundle = buildProductionReadyExportBundle(mockDocument());
    assert.equal(bundle.profile, "production_ready");
    assert.ok(bundle.formats.includes("png"));
    assert.ok(bundle.formats.includes("jpg") || bundle.formats.includes("jpeg"));
    assert.ok(bundle.formats.includes("webp"));
  });

  it("Print Ready export calculates DPI dimensions", () => {
    const dims = printDimensionsPixels({
      dpi: 300,
      unit: "mm",
      preset: "a4",
      width: 210,
      height: 297,
      bleedMm: 3,
      safeMarginMm: 5,
      formats: ["png", "pdf"],
      retinaScale: 1,
    });
    assert.equal(dims.width, mmToPixels(216, 300));
    assert.equal(dims.height, mmToPixels(303, 300));
    const bundle = buildPrintReadyExportBundle(mockDocument());
    assert.ok(bundle.pixelWidth > 1000);
    assert.ok(bundle.pixelHeight > 1000);
  });

  it("Library stores export metadata", () => {
    const doc = appendLibraryExport(mockDocument(), {
      category: categoryForExportProfile("motion_ready"),
      label: "Test — motion_ready",
      profile: "motion_ready",
      format: "motion_ready",
      metadata: { advanced: false },
    });
    assert.equal(doc.libraryExports?.length, 1);
    assert.equal(doc.libraryExports?.[0]?.category, "motion_ready");
    const payload = buildEditorSavePayload(doc);
    assert.equal(payload.libraryExports?.length, 1);
    assert.equal(payload.workspaceMode, "photo_edit");
  });

  it("user-facing UI hides technical terms by default", () => {
    assert.equal(isAdvancedExportTerm("DPI bleed margin"), true);
    assert.equal(isAdvancedExportTerm("For web & social"), false);
    assert.equal(
      userFacingExportLabel(false, "300 DPI PNG", "High-quality image"),
      "High-quality image"
    );
    assert.equal(
      userFacingExportLabel(true, "300 DPI PNG", "High-quality image"),
      "300 DPI PNG"
    );
  });

  it("workspace modes map from user intent", () => {
    assert.equal(resolveWorkspaceModeFromIntent("combine_images"), "compose");
    assert.equal(resolveWorkspaceModeFromIntent("make_gif"), "quick_motion");
    assert.equal(modeShowsComposer("compose"), true);
    assert.equal(modeShowsQuickMotion("quick_motion"), true);
    assert.equal(modeShowsExportPanel("export"), true);
  });

  it("poster upscale assesses quality status", () => {
    const good = assessPosterUpscaleNeeds(mockDocument(), 8000, 12000);
    assert.equal(good.status, "good");
    const needs = assessPosterUpscaleNeeds(mockDocument(), 400, 300);
    assert.ok(["needs_upscale", "unavailable", "acceptable"].includes(needs.status));
  });
});
