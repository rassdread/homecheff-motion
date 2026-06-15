import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyIllustrationPartAnalysisToDocument,
  buildTemplateIllustrationPartAnalysis,
} from "@/lib/editor-vision-v6-part-analysis";
import { stampEditorAnalyzedBackground } from "@/lib/editor-analysis-reset";
import { stripDocumentForStorage } from "@/lib/editor-local-storage";
import { saveEditorCanvasDocument, loadEditorCanvasDocument } from "@/lib/editor-canvas-session";
import { buildInstructionObjectsFromDocument } from "@/lib/editor-instruction-object-feed";
import { documentNeedsDetectionBootstrap } from "@/lib/editor-detection-bootstrap";
import {
  countVisionHierarchyNodes,
  documentHasRichVisionAnalysis,
  isMeaningfulVisionHierarchy,
  mergePreservingVisionAnalysis,
  resetStickyVisionHierarchyForTests,
  resolveStickyVisionHierarchy,
} from "@/lib/editor-vision-v6-stability";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";

function mascotVision(): AssetVisionAnalysis {
  return {
    objectType: "mascot",
    objectTypeLabel: "Mascot",
    visualStyle: "Flat Cartoon Illustration",
    colors: [{ label: "blue", hex: "#0067B1" }],
    shapeLanguage: ["rounded"],
    keyFeatures: ["globe head", "red tie", "white shoes"],
    brandIdentity: "HomeCheff",
    materialHints: "",
    environmentHints: "",
    suggestedPreserve: ["globe"],
    suggestedChange: [],
    suggestedForbidden: [],
    confidence: 0.92,
    safetyNotes: [],
    assetFamily: "HomeCheff Mascots",
    characterLineage: "Primary Mascot",
    brandRecognitionConfidence: 0.9,
    identityFingerprint: {
      fingerprintHash: "mascot-stability",
      identityShapeMarkers: ["globe head"],
      accessoryPattern: "chef outfit",
      silhouette: "round mascot",
    },
  };
}

function baseDocument() {
  const now = new Date().toISOString();
  return {
    sessionId: "sess_stability",
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
}

function enrichedDoc() {
  const vision = mascotVision();
  const analysis = buildTemplateIllustrationPartAnalysis(vision);
  return stampEditorAnalyzedBackground(
    applyIllustrationPartAnalysisToDocument({
      document: baseDocument(),
      vision,
      detections: [{ label: "person", confidence: 0.85, box: { x: 0.2, y: 0.1, width: 0.5, height: 0.8 } }],
      analysis,
      previewUrl: "https://example.com/mascot.png",
      sourceKind: "character",
    })
  );
}

describe("editor vision v6 stability", () => {
  it("mergePreservingVisionAnalysis keeps rich local over weak remote", () => {
    const rich = enrichedDoc();
    const weak = {
      ...baseDocument(),
      detectionMeta: {
        count: 1,
        detectorKind: "rtdetr" as const,
        analyzedAt: rich.updatedAt,
        source: "fallback" as const,
      },
    };
    const merged = mergePreservingVisionAnalysis(rich, weak);
    assert.equal(documentHasRichVisionAnalysis(merged), true);
    assert.ok(countVisionHierarchyNodes(merged.visionHierarchy) >= 8);
  });

  it("stripDocumentForStorage preserves visionHierarchy and visionV6Meta", () => {
    const rich = enrichedDoc();
    const stripped = stripDocumentForStorage(rich);
    assert.equal(isMeaningfulVisionHierarchy(stripped.visionHierarchy, stripped.visionV6Meta), true);
    assert.ok((stripped.visionV6Meta?.mergedLayerCount ?? 0) >= 8);
  });

  it("save/load preserves V6 hierarchy when localStorage is available", () => {
    const storage = new Map<string, string>();
    const mockStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => storage.clear(),
      key: () => null,
      length: storage.size,
    };
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { ...globalThis, localStorage: mockStorage },
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: mockStorage,
    });
    try {
      const rich = enrichedDoc();
      const saved = saveEditorCanvasDocument(rich);
      const loaded = loadEditorCanvasDocument(saved.sessionId);
      assert.ok(loaded);
      assert.equal(isMeaningfulVisionHierarchy(loaded.visionHierarchy, loaded.visionV6Meta), true);
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  });

  it("enrich does not replace meaningful V6 hierarchy with weak fallback", () => {
    const rich = enrichedDoc();
    const weakOnly = {
      ...rich,
      objects: [rich.objects.find((o) => o.layerType === "background")!],
      semanticLayers: rich.semanticLayers?.filter((l) => l.type === "background"),
      detectedObjects: [],
    };
    const saved = saveEditorCanvasDocument(weakOnly);
    assert.ok(isMeaningfulVisionHierarchy(saved.visionHierarchy, saved.visionV6Meta));
  });

  it("instruction feed does not collapse rich V6 to Main subject", () => {
    const rich = enrichedDoc();
    const feed = buildInstructionObjectsFromDocument(rich);
    const labels = feed.editableObjects.map((o) => o.label.toLowerCase());
    assert.ok(!labels.includes("main subject"));
    assert.ok(labels.some((l) => /head|tie|globe|character|mascot/.test(l)));
    assert.ok(feed.meta.count > 2);
  });

  it("documentNeedsDetectionBootstrap when V6 is stale for new background", () => {
    const rich = enrichedDoc();
    const humanUpload = {
      ...rich,
      name: "Portrait.jpg",
      backgroundUrl: "https://example.com/human.png",
      analyzedBackgroundUrl: "https://example.com/mascot.png",
    };
    assert.equal(documentNeedsDetectionBootstrap(humanUpload), true);
  });

  it("documentNeedsDetectionBootstrap is false when V6 is present", () => {
    const rich = enrichedDoc();
    assert.equal(documentNeedsDetectionBootstrap(rich), false);
  });

  it("analysis cache avoids duplicate bootstrap for same session", () => {
    resetEditorAnalysisCacheForTests();
    const rich = enrichedDoc();
    writeCachedEditorAnalysis(rich);
    assert.equal(documentNeedsDetectionBootstrap(rich), false);
  });

  it("sticky hierarchy does not downgrade after weak overwrite", () => {
    resetStickyVisionHierarchyForTests();
    const rich = enrichedDoc();
    const stickyRich = resolveStickyVisionHierarchy(rich);
    assert.ok(isMeaningfulVisionHierarchy(stickyRich, rich.visionV6Meta));
    const weak = {
      ...rich,
      visionHierarchy: [{ id: "bg", label: "Background", category: "background" as const, editable: false, estimated: true, children: [] }],
      visionV6Meta: undefined,
    };
    const stickyWeak = resolveStickyVisionHierarchy(weak);
    assert.ok(isMeaningfulVisionHierarchy(stickyWeak, rich.visionV6Meta));
    assert.ok(countVisionHierarchyNodes(stickyWeak) >= 8);
  });

  it("globe mascot hierarchy includes required part labels", () => {
    const rich = enrichedDoc();
    const labels: string[] = [];
    const walk = (nodes: typeof rich.visionHierarchy) => {
      for (const n of nodes ?? []) {
        labels.push(n.label.toLowerCase());
        walk(n.children);
      }
    };
    walk(rich.visionHierarchy);
    for (const token of ["head", "tie", "hand", "shoe", "globe", "background", "style"]) {
      assert.ok(labels.some((l) => l.includes(token)), `missing ${token} in ${labels.join(", ")}`);
    }
  });
});
