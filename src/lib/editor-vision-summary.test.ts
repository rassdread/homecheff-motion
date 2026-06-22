import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { portraitWithSunglassesFixture } from "@/lib/editor-vision-evidence-audit";
import {
  applyIllustrationPartAnalysisToDocument,
  buildTemplateIllustrationPartAnalysis,
} from "@/lib/editor-vision-v6-part-analysis";
import {
  buildEditorVisionSummary,
  buildEditorVisionSummaryLegacyDebug,
  extractTruthSummaryLabels,
} from "@/lib/editor-vision-summary";
import { splitAnalysisIntoTruthSections } from "@/lib/editor-vision-truth-mode";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

function mascotVision(): AssetVisionAnalysis {
  return {
    objectType: "mascot",
    objectTypeLabel: "Mascot",
    visualStyle: "Flat Cartoon Illustration",
    colors: [{ label: "blue", hex: "#0067B1" }],
    shapeLanguage: ["rounded"],
    keyFeatures: ["globe head", "chef jacket", "red tie"],
    brandIdentity: "HomeCheff",
    materialHints: "",
    environmentHints: "",
    suggestedPreserve: ["globe"],
    suggestedChange: [],
    suggestedForbidden: [],
    confidence: 0.92,
    safetyNotes: [],
    assetFamily: "",
    characterLineage: "",
    brandRecognitionConfidence: 0.9,
    identityFingerprint: {
      fingerprintHash: "mascot-summary-test",
      identityShapeMarkers: ["globe head"],
      accessoryPattern: "",
      silhouette: "",
    },
  };
}

function mockDocument(name = "test.png"): EditorCanvasDocument {
  const now = new Date().toISOString();
  return {
    sessionId: "sess_summary",
    name,
    sourceKind: "upload",
    sourceAssetId: null,
    backgroundUrl: "https://example.com/test.png",
    workflowStep: "visual_editor",
    objects: [
      {
        id: "background",
        label: "Background",
        sourceKind: "upload",
        assetId: null,
        storageKey: "",
        previewUrl: "https://example.com/test.png",
        transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
        locked: true,
        visible: true,
        bounds: { x: 0, y: 0, width: 1, height: 1 },
        layerType: "background",
      },
      {
        id: "v6_prop_root",
        label: "World globe",
        sourceKind: "upload",
        assetId: null,
        storageKey: "",
        previewUrl: "https://example.com/test.png",
        transform: { x: 0.69, y: 0.53, scale: 1, rotation: 0 },
        locked: false,
        visible: true,
        bounds: { x: 0.52, y: 0.36, width: 0.34, height: 0.34 },
        layerType: "semantic",
        category: "prop",
        semanticType: "held_object",
      },
      {
        id: "v6_character_root",
        label: "Mascot",
        sourceKind: "upload",
        assetId: null,
        storageKey: "",
        previewUrl: "https://example.com/test.png",
        transform: { x: 0.42, y: 0.49, scale: 1, rotation: 0 },
        locked: false,
        visible: true,
        bounds: { x: 0.18, y: 0.05, width: 0.48, height: 0.88 },
        layerType: "semantic",
        category: "character",
        semanticType: "character",
      },
    ],
    placements: [],
    status: "editing",
    createdAt: now,
    updatedAt: now,
  };
}

function applyAnalysis(
  document: EditorCanvasDocument,
  vision: AssetVisionAnalysis,
  analysis = buildTemplateIllustrationPartAnalysis(vision)
): EditorCanvasDocument {
  return applyIllustrationPartAnalysisToDocument({
    document,
    vision,
    detections: [],
    analysis,
    previewUrl: document.backgroundUrl,
    sourceKind: document.sourceKind,
  });
}

describe("editor vision summary — truth mode datasource", () => {
  it("uses detected truth sections, not document.objects", () => {
    const vision = mascotVision();
    const doc = applyAnalysis(mockDocument(), vision);
    const summary = buildEditorVisionSummary(doc);

    assert.equal(summary.hasTruthSource, true);
    assert.equal(
      summary.detectedLabels.some((l) => /\b(globe|world|wereldbol)\b/i.test(l)),
      false,
      "estimated globe template must not appear in detected summary"
    );
    assert.equal(
      summary.detectedLabels.some((l) => /\b(mascot|personage|character)\b/i.test(l)),
      false,
      "character root must not appear as detected summary item"
    );

    const legacy = buildEditorVisionSummaryLegacyDebug(doc);
    assert.ok(legacy.itemKeys.includes("editor.visionSummary.item.globe"));
    assert.ok(legacy.itemKeys.includes("editor.visionSummary.item.character"));
  });

  it("globe from v6_prop_root estimated source does NOT appear in main summary", () => {
    const doc = applyAnalysis(mockDocument(), mascotVision());
    const summary = buildEditorVisionSummary(doc);
    const allLabels = [...summary.detectedLabels, ...summary.estimatedLabels].map((l) => l.toLowerCase());

    assert.equal(allLabels.some((l) => l.includes("globe")), false);
    assert.equal(allLabels.some((l) => l.includes("world")), false);
  });

  it("human portrait with sunglasses shows sunglasses in detected summary", () => {
    const vision: AssetVisionAnalysis = {
      objectType: "human",
      objectTypeLabel: "Person",
      visualStyle: "Photograph",
      colors: [],
      shapeLanguage: [],
      keyFeatures: ["portrait", "sunglasses"],
      brandIdentity: "",
      materialHints: "",
      environmentHints: "",
      suggestedPreserve: [],
      suggestedChange: [],
      suggestedForbidden: [],
      confidence: 0.88,
      safetyNotes: [],
      assetFamily: "",
      characterLineage: "",
      brandRecognitionConfidence: 0.5,
      identityFingerprint: {
        fingerprintHash: "portrait-summary",
        identityShapeMarkers: [],
        accessoryPattern: "",
        silhouette: "",
      },
    };

    const doc = applyAnalysis(mockDocument("portrait.png"), vision, portraitWithSunglassesFixture());
    const summary = buildEditorVisionSummary(doc);
    const detected = summary.detectedLabels.map((l) => l.toLowerCase());

    assert.ok(detected.some((l) => l.includes("sunglasses")));
    assert.ok(detected.some((l) => l.includes("head")));
    assert.ok(detected.some((l) => l.includes("shirt")));
    assert.equal(detected.some((l) => l.includes("pants")), false);
    assert.equal(detected.some((l) => l.includes("shoes")), false);
    assert.equal(detected.some((l) => l.includes("tie")), false);
    assert.equal(detected.some((l) => l.includes("jacket")), false);
  });

  it("dog head does NOT show paws/tail/body in detected summary without evidence", () => {
    const dogVision: AssetVisionAnalysis = {
      objectType: "animal",
      objectTypeLabel: "Dog",
      visualStyle: "Photograph",
      colors: [],
      shapeLanguage: [],
      keyFeatures: ["dog", "collar"],
      brandIdentity: "",
      materialHints: "",
      environmentHints: "",
      suggestedPreserve: [],
      suggestedChange: [],
      suggestedForbidden: [],
      confidence: 0.86,
      safetyNotes: [],
      assetFamily: "",
      characterLineage: "",
      brandRecognitionConfidence: 0.5,
      identityFingerprint: {
        fingerprintHash: "dog-summary",
        identityShapeMarkers: [],
        accessoryPattern: "",
        silhouette: "",
      },
    };

    const analysis = buildTemplateIllustrationPartAnalysis(dogVision);
    const doc = applyAnalysis(mockDocument("dog-head.png"), dogVision, analysis);
    const summary = buildEditorVisionSummary(doc);
    const detected = summary.detectedLabels.map((l) => l.toLowerCase());

    for (const forbidden of ["paw", "tail", "pants", "tie", "shoe", "jacket", "globe"]) {
      assert.equal(
        detected.some((l) => l.includes(forbidden)),
        false,
        `detected summary must not include ${forbidden}`
      );
    }
  });

  it("style and color labels do NOT appear in summary", () => {
    const doc = applyAnalysis(mockDocument(), mascotVision());
    const summary = buildEditorVisionSummary(doc);
    const all = [...summary.detectedLabels, ...summary.estimatedLabels].map((l) => l.toLowerCase());

    for (const noise of ["realistic", "cartoon", "blue", "white", "shadow", "safe empty"]) {
      assert.equal(all.some((l) => l.includes(noise)), false, `summary must not include ${noise}`);
    }
  });

  it("estimated items appear only in estimatedLabels, not detectedLabels", () => {
    const doc = applyAnalysis(mockDocument(), mascotVision());
    const summary = buildEditorVisionSummary(doc);

    const detectedKeys = new Set(summary.detectedLabels.map((l) => l.toLowerCase()));
    for (const label of summary.estimatedLabels) {
      assert.equal(detectedKeys.has(label.toLowerCase()), false);
    }
  });

  it("extractTruthSummaryLabels matches splitAnalysisIntoTruthSections detected tier", () => {
    const vision = mascotVision();
    const doc = applyAnalysis(mockDocument(), vision);
    const hierarchy = doc.visionHierarchy ?? [];
    const extracted = extractTruthSummaryLabels(hierarchy);

    const sections = splitAnalysisIntoTruthSections(
      buildTemplateIllustrationPartAnalysis(vision),
      { assetType: vision.objectType }
    );
    const truthDetected = sections.detected.map((p) => p.label.toLowerCase());

    for (const label of extracted.detectedLabels) {
      assert.ok(
        truthDetected.some((t) => t === label.toLowerCase() || t.includes(label.toLowerCase())),
        `${label} should come from truth detected tier`
      );
    }
  });

  it("without vision hierarchy, summary does not trust raw object layers", () => {
    const doc = mockDocument();
    const summary = buildEditorVisionSummary(doc);

    assert.equal(summary.hasTruthSource, false);
    assert.equal(summary.detectedLabels.length, 0);
    assert.equal(summary.estimatedLabels.length, 0);

    const legacy = buildEditorVisionSummaryLegacyDebug(doc);
    assert.ok(legacy.itemKeys.includes("editor.visionSummary.item.globe"));
  });
});
