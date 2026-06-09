import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEditorSavePayload } from "@/lib/editor-canvas-export";
import {
  applyEditorLayerOperation,
  createEditorDocumentFromUpload,
  mapLibrarySourceKind,
  patchEditorLayerTransform,
} from "@/lib/editor-canvas-session";
import { seedEditorLayersFromVision, visibleEditorLayers } from "@/lib/editor-canvas-layers";
import { resolveProductHref } from "@/lib/homecheff-product-suite";
import { mapVisionJsonToAnalysis } from "@/lib/studio-asset-vision-analysis";
import type { AssetDerivationSourceListItem } from "@/types/studio-asset-derivation";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

function genericVision() {
  return mapVisionJsonToAnalysis(
    {
      objectType: "Product",
      visualStyle: "Packshot photo",
      colors: [{ label: "White", hex: "#FFFFFF", role: "background" }],
      shapeLanguage: ["Rectangular"],
      keyFeatures: ["Product body", "Label", "Cap"],
      brandIdentity: "Generic Brand",
      assetFamily: "Packaging",
      suggestedPreserve: ["logo"],
      suggestedChange: ["background"],
      suggestedForbidden: [],
      confidence: 0.88,
      silhouette: "bottle on white",
    },
    { sourceName: "Sample product" }
  );
}

function homeCheffVision() {
  return mapVisionJsonToAnalysis(
    {
      objectType: "Mascot",
      visualStyle: "Cartoon mascot",
      colors: [{ label: "Blue", hex: "#0067B1", role: "primary" }],
      shapeLanguage: ["Round"],
      keyFeatures: ["Globe body", "Chef hat", "Garden apron"],
      brandIdentity: "HomeCheff Globe Mascot",
      assetFamily: "HomeCheff Mascots",
      suggestedPreserve: ["globe"],
      suggestedChange: ["outfit"],
      suggestedForbidden: [],
      confidence: 0.9,
      silhouette: "round mascot",
    },
    { sourceName: "Globe Man" }
  );
}

describe("editor-canvas", () => {
  it("resolves editor product href to /editor", () => {
    assert.equal(resolveProductHref("editor"), "/editor");
  });

  it("seeds semantic layers from vision key features", () => {
    const layers = seedEditorLayersFromVision({
      vision: genericVision(),
      sourceKind: "product_photo",
    });
    assert.equal(layers[0]?.layerType, "background");
    assert.equal(layers.length, 4);
    assert.ok(layers.some((l) => l.label === "Product body"));
  });

  it("filters HomeCheff-specific labels when brand is not HomeCheff", () => {
    const vision = genericVision();
    const layers = seedEditorLayersFromVision({
      vision: {
        ...vision,
        keyFeatures: ["Globe body", "Chef hat"],
      },
      sourceKind: "character",
    });
    const labels = layers.filter((l) => l.layerType === "semantic").map((l) => l.label);
    assert.ok(!labels.some((l) => /chef|globe/i.test(l)));
  });

  it("keeps HomeCheff-specific labels when brand matches", () => {
    const layers = seedEditorLayersFromVision({
      vision: homeCheffVision(),
      sourceKind: "character",
    });
    const labels = layers.filter((l) => l.layerType === "semantic").map((l) => l.label);
    assert.ok(labels.some((l) => /globe|chef|garden/i.test(l)));
  });

  it("maps library source kinds for canonical and uploads", () => {
    const canonical = { isCanonicalCharacterBase: true } as AssetDerivationSourceListItem;
    const upload = { sourceType: "upload" } as AssetDerivationSourceListItem;
    assert.equal(mapLibrarySourceKind(canonical), "canonical");
    assert.equal(mapLibrarySourceKind(upload), "upload");
  });

  it("patches layer transform when layer is unlocked", () => {
    const doc = createEditorDocumentFromUpload({
      name: "Test",
      backgroundUrl: "https://example.com/bg.png",
    });
    const semantic = {
      ...doc.objects[0]!,
      id: "semantic_0_head",
      layerType: "semantic" as const,
      locked: false,
      bounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
    };
    const withSemantic: EditorCanvasDocument = { ...doc, objects: [doc.objects[0]!, semantic] };
    const next = patchEditorLayerTransform(withSemantic, "semantic_0_head", { x: 0.4, y: 0.5 });
    const layer = next.objects.find((o) => o.id === "semantic_0_head");
    assert.equal(layer?.transform.x, 0.4);
    assert.equal(layer?.transform.y, 0.5);
  });

  it("duplicates a semantic layer", () => {
    const doc = createEditorDocumentFromUpload({
      name: "Test",
      backgroundUrl: "https://example.com/bg.png",
    });
    const semantic = {
      ...doc.objects[0]!,
      id: "semantic_0_head",
      label: "Head",
      layerType: "semantic" as const,
      locked: false,
      bounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
    };
    const withSemantic: EditorCanvasDocument = { ...doc, objects: [doc.objects[0]!, semantic] };
    const next = applyEditorLayerOperation(withSemantic, "semantic_0_head", "duplicate");
    assert.equal(next.objects.length, 3);
    assert.ok(next.objects.some((o) => o.label === "Head (copy)"));
  });

  it("builds save payload with semantic record patch", () => {
    const doc = createEditorDocumentFromUpload({
      name: "Product shot",
      backgroundUrl: "https://example.com/bg.png",
      backgroundStorageKey: "uploads/test.png",
    });
    const semantic = {
      ...doc.objects[0]!,
      id: "semantic_0_label",
      label: "Label",
      layerType: "semantic" as const,
      locked: false,
      visible: true,
      bounds: { x: 0.2, y: 0.3, width: 0.2, height: 0.15 },
      transform: { x: 0.3, y: 0.35, scale: 1, rotation: 0 },
    };
    const payload = buildEditorSavePayload({ ...doc, objects: [doc.objects[0]!, semantic] });
    assert.equal(payload.objectCount, 1);
    assert.match(payload.compositionSummary, /Label/);
    assert.equal(payload.semanticRecordPatch.version, 1);
    assert.equal(payload.downloadableHint, doc.backgroundUrl);
  });

  it("visibleEditorLayers excludes hidden layers", () => {
    const doc = createEditorDocumentFromUpload({
      name: "Test",
      backgroundUrl: "https://example.com/bg.png",
    });
    const hidden = {
      ...doc.objects[0]!,
      id: "semantic_hidden",
      visible: false,
      layerType: "semantic" as const,
      bounds: { x: 0, y: 0, width: 0.1, height: 0.1 },
    };
    assert.equal(visibleEditorLayers({ objects: [doc.objects[0]!, hidden] }).length, 1);
  });
});
