import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildBrandSheetSemanticLayers } from "@/lib/editor-brand-sheet-detection";
import { detectAssistantPrefillIntent } from "@/lib/assistant-prefill-engine";
import {
  mergeIllustrationPartsWithMascotTaxonomy,
  publicEditablePartLabels,
  resolveMascotTaxonomyKind,
} from "@/lib/editor-mascot-parts-taxonomy";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { buildInstructionObjectsFromDocument } from "@/lib/editor-instruction-object-feed";
import {
  applyIllustrationPartAnalysisToDocument,
  buildTemplateIllustrationPartAnalysis,
  shouldRunIllustrationPartAnalysis,
} from "@/lib/editor-vision-v6-part-analysis";
import { isMeaningfulVisionHierarchy } from "@/lib/editor-vision-v6-stability";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";

function globeManVision(): AssetVisionAnalysis {
  return {
    objectType: "brand_asset",
    objectTypeLabel: "Brand sheet",
    visualStyle: "Flat cartoon illustration",
    colors: [],
    shapeLanguage: [],
    keyFeatures: ["logo", "globe man", "text", "color card", "icon", "banner", "product", "image"],
    brandIdentity: "HomeCheff",
    materialHints: "",
    environmentHints: "",
    suggestedPreserve: [],
    suggestedChange: [],
    suggestedForbidden: [],
    confidence: 0.88,
    safetyNotes: [],
    assetFamily: "HomeCheff",
    characterLineage: "",
    brandRecognitionConfidence: 0.9,
    identityFingerprint: {
      fingerprintHash: "globe-brand",
      identityShapeMarkers: [],
      accessoryPattern: "",
      silhouette: "",
    },
  };
}

function brandSheetDocument() {
  const doc = createEditorDocumentFromUpload({
    name: "HomeCheff brand sheet.png",
    backgroundUrl: "https://example.com/brand-sheet.png",
  });
  const semanticLayers = buildBrandSheetSemanticLayers({
    vision: globeManVision(),
    sourceKind: "upload",
  });
  return {
    ...doc,
    analyzedBackgroundUrl: doc.backgroundUrl,
    semanticLayers,
    objects: semanticLayers.map((layer, index) => ({
      id: layer.id,
      label: layer.label,
      sourceKind: "upload" as const,
      assetId: null,
      storageKey: "",
      previewUrl: doc.backgroundUrl,
      transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
      locked: layer.locked,
      visible: layer.visible,
      bounds: layer.bounds,
      layerType: layer.type === "background" ? ("background" as const) : ("semantic" as const),
      confidence: layer.confidence,
    })),
    detectionMeta: {
      count: 8,
      source: "brand_sheet" as const,
      onnxAvailable: true,
      detectorKind: "rtdetr" as const,
      backend: "fallback" as const,
      status: "fallback" as const,
      inferenceMs: 12,
      lastDetectedAt: new Date().toISOString(),
    },
  };
}

describe("editor parts visibility — admin vs normal user parity", () => {
  it("runs illustration part analysis for brand-sheet mascots even with many semantic layers", () => {
    const vision = globeManVision();
    const labels = buildBrandSheetSemanticLayers({ vision, sourceKind: "upload" }).map((l) => l.label);
    assert.equal(
      shouldRunIllustrationPartAnalysis({
        vision,
        detections: [
          { label: "person", confidence: 0.9, box: { x: 0.2, y: 0.1, width: 0.5, height: 0.8 } },
          { label: "tie", confidence: 0.7, box: { x: 0.3, y: 0.4, width: 0.1, height: 0.2 } },
        ],
        semanticLayerCount: labels.length,
        documentName: "HomeCheff brand sheet.png",
        semanticLayerLabels: labels,
      }),
      true
    );
  });

  it("merges mascot taxonomy fallback with shallow AI detection", () => {
    const vision = globeManVision();
    const shallow = buildTemplateIllustrationPartAnalysis(vision, {
      documentName: "Globe Man.png",
      semanticLayerLabels: ["Globe Man", "Logo"],
    });
    const merged = mergeIllustrationPartsWithMascotTaxonomy(
      shallow,
      resolveMascotTaxonomyKind({
        vision,
        documentName: "Globe Man.png",
        semanticLayerLabels: ["Globe Man"],
      }),
      vision
    );
    const labels = publicEditablePartLabels(merged).map((l) => l.toLowerCase());
    for (const expected of ["face", "eyes", "mouth", "outfit", "shoes", "globe", "happy", "standing", "wave"]) {
      assert.ok(labels.some((l) => l.includes(expected)), `missing ${expected}`);
    }
  });

  it("admin and normal user feeds expose the same mascot parts after enrichment", () => {
    const doc = brandSheetDocument();
    const analysis = buildTemplateIllustrationPartAnalysis(globeManVision(), {
      documentName: doc.name,
      semanticLayerLabels: doc.semanticLayers?.map((l) => l.label),
      sourceKind: doc.sourceKind,
    });
    const enriched = applyIllustrationPartAnalysisToDocument({
      document: doc,
      vision: globeManVision(),
      detections: [],
      analysis,
      previewUrl: doc.backgroundUrl,
      sourceKind: doc.sourceKind,
    });

    const adminFeed = buildInstructionObjectsFromDocument(enriched).editableObjects.map((o) => o.label);
    const normalFeed = buildInstructionObjectsFromDocument({
      ...enriched,
      instructionStudioState: undefined,
    }).editableObjects.map((o) => o.label);

    assert.deepEqual(adminFeed.sort(), normalFeed.sort());
    assert.ok(adminFeed.some((l) => /face|eyes|mouth/i.test(l)));
    assert.ok(!adminFeed.includes("Tekst"));
    assert.ok(isMeaningfulVisionHierarchy(enriched.visionHierarchy, enriched.visionV6Meta));
  });

  it("Globe Man upload exposes face eyes mouth outfit shoes globe without brand-sheet-only labels", () => {
    const doc = createEditorDocumentFromUpload({
      name: "Globe Man.png",
      backgroundUrl: "https://example.com/globe-man.png",
    });
    const labels = buildInstructionObjectsFromDocument(doc).editableObjects.map((o) => o.label);
    for (const part of ["Face", "Eyes", "Mouth", "Jacket", "Shoes", "Globe"]) {
      assert.ok(labels.includes(part), `missing ${part}`);
    }
    assert.ok(!labels.includes("Kleurenkaart"));
  });

  it("generic product photo still uses main subject fallback", () => {
    const doc = createEditorDocumentFromUpload({
      name: "vacation-photo.jpg",
      backgroundUrl: "https://example.com/photo.jpg",
    });
    const labels = buildInstructionObjectsFromDocument(doc).editableObjects.map((o) => o.label);
    assert.ok(labels.includes("Main subject"));
  });

  it("assistant routes mascot update to edit workflow instead of create", () => {
    const detect = detectAssistantPrefillIntent("ik wil Globe Man aanpassen in de editor");
    assert.equal(detect.kind, "prefill");
    if (detect.kind === "prefill") {
      assert.equal(detect.intent, "mascot_edit");
      assert.equal(detect.actionId, "edit_mascot");
    }
    const createLoop = detectAssistantPrefillIntent("nieuw personage maken");
    assert.equal(createLoop.kind, "prefill");
    if (createLoop.kind === "prefill") {
      assert.equal(createLoop.intent, "character_new");
    }
  });
});
