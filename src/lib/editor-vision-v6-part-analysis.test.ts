import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyIllustrationPartAnalysisToDocument,
  buildTemplateIllustrationPartAnalysis,
  isIllustrationLikeImage,
  isWeakRtdetrDetection,
  shouldRunIllustrationPartAnalysis,
} from "@/lib/editor-vision-v6-part-analysis";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";

function mascotVision(): AssetVisionAnalysis {
  return {
    objectType: "mascot",
    objectTypeLabel: "Mascot",
    visualStyle: "Flat Cartoon Illustration",
    colors: [
      { label: "blue", hex: "#0067B1" },
      { label: "white", hex: "#FFFFFF" },
    ],
    shapeLanguage: ["rounded", "friendly"],
    keyFeatures: ["globe head", "chef jacket", "red tie", "white shoes"],
    brandIdentity: "HomeCheff",
    materialHints: "",
    environmentHints: "",
    suggestedPreserve: ["globe", "tie"],
    suggestedChange: [],
    suggestedForbidden: [],
    confidence: 0.92,
    safetyNotes: [],
    assetFamily: "HomeCheff Mascots",
    characterLineage: "Primary Mascot",
    brandRecognitionConfidence: 0.9,
    identityFingerprint: {
      fingerprintHash: "mascot-test",
      identityShapeMarkers: ["globe head"],
      accessoryPattern: "chef outfit",
      silhouette: "round mascot",
    },
  };
}

function mockDocument() {
  const now = new Date().toISOString();
  return {
    sessionId: "sess_v6",
    name: "Globe mascot",
    sourceKind: "character" as const,
    sourceAssetId: null,
    backgroundUrl: "https://example.com/mascot.png",
    workflowStep: "visual_editor" as const,
    objects: [
      {
        id: "background",
        label: "Background",
        sourceKind: "character" as const,
        assetId: null,
        storageKey: "",
        previewUrl: "https://example.com/mascot.png",
        transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
        locked: true,
        visible: true,
        bounds: { x: 0, y: 0, width: 1, height: 1 },
        layerType: "background" as const,
      },
    ],
    placements: [],
    status: "editing" as const,
    createdAt: now,
    updatedAt: now,
  };
}

describe("editor vision v6 illustration part analysis", () => {
  it("detects illustration-like mascot images", () => {
    assert.equal(isIllustrationLikeImage(mascotVision()), true);
  });

  it("flags weak RT-DETR when only person detected", () => {
    assert.equal(
      isWeakRtdetrDetection([{ label: "person", confidence: 0.9, box: { x: 0.2, y: 0.1, width: 0.5, height: 0.8 } }]),
      true
    );
  });

  it("should run part analysis for mascot with weak detections", () => {
    assert.equal(
      shouldRunIllustrationPartAnalysis({
        vision: mascotVision(),
        detections: [{ label: "person", confidence: 0.88, box: { x: 0.2, y: 0.1, width: 0.5, height: 0.8 } }],
        semanticLayerCount: 2,
      }),
      true
    );
  });

  it("should run for character uploads when vision analyze falls back to unknown", () => {
    assert.equal(
      shouldRunIllustrationPartAnalysis({
        vision: {
          ...mascotVision(),
          objectType: "unknown",
          objectTypeLabel: "Image",
          keyFeatures: ["subject"],
        },
        detections: [{ label: "person", confidence: 0.88, box: { x: 0.2, y: 0.1, width: 0.5, height: 0.8 } }],
        semanticLayerCount: 2,
        sourceKind: "character",
      }),
      true
    );
  });

  it("template includes head tie shoes hands globe parts", () => {
    const analysis = buildTemplateIllustrationPartAnalysis(mascotVision());
    const labels = analysis.parts.map((p) => p.label.toLowerCase());
    assert.ok(labels.some((l) => l.includes("head")));
    assert.ok(labels.some((l) => l.includes("tie")));
    assert.ok(labels.some((l) => l.includes("shoe")));
    assert.ok(labels.some((l) => l.includes("hand")));
    assert.ok(labels.some((l) => l.includes("globe")));
    assert.ok(labels.some((l) => l.includes("eye")));
  });

  it("apply produces many layers and v6 hierarchy beyond main subject", () => {
    const vision = mascotVision();
    const analysis = buildTemplateIllustrationPartAnalysis(vision);
    const doc = applyIllustrationPartAnalysisToDocument({
      document: mockDocument(),
      vision,
      detections: [{ label: "person", confidence: 0.85, box: { x: 0.2, y: 0.1, width: 0.5, height: 0.8 } }],
      analysis,
      previewUrl: "https://example.com/mascot.png",
      sourceKind: "character",
    });

    const nonBg = doc.objects.filter((o) => o.layerType !== "background");
    assert.ok(nonBg.length >= 8, `expected >= 8 layers, got ${nonBg.length}`);
    assert.ok(doc.visionV6Meta?.mergedLayerCount >= 8);
    assert.ok(doc.visionHierarchy && doc.visionHierarchy.length >= 1);

    const tree = doc.visionHierarchy ?? [];
    const labels: string[] = [];
    const walk = (nodes: typeof tree) => {
      for (const n of nodes) {
        labels.push(n.label);
        walk(n.children);
      }
    };
    walk(tree);
    assert.ok(labels.some((l) => /head/i.test(l)));
    assert.ok(labels.some((l) => /tie/i.test(l)));
    assert.ok(labels.some((l) => /globe/i.test(l)));
    assert.ok(tree.some((n) => n.truthSection === "detected"));
    assert.ok(tree.some((n) => n.truthSection === "estimated" || n.truthSection === "creative"));
  });
});
