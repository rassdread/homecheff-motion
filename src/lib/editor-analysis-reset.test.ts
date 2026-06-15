import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  editorAnalysisAppliesToBackground,
  resetEditorAnalysisState,
  stampEditorAnalyzedBackground,
} from "@/lib/editor-analysis-reset";
import { documentNeedsDetectionBootstrap } from "@/lib/editor-detection-bootstrap";
import { buildInstructionObjectsFromDocument } from "@/lib/editor-instruction-object-feed";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

function mascotVision(): AssetVisionAnalysis {
  return {
    objectType: "mascot",
    objectTypeLabel: "Mascot",
    visualStyle: "cartoon",
    colors: [],
    shapeLanguage: [],
    keyFeatures: ["globe head", "red tie"],
    brandIdentity: "HomeCheff",
    materialHints: "",
    environmentHints: "",
    suggestedPreserve: [],
    suggestedChange: [],
    suggestedForbidden: [],
    confidence: 0.9,
    safetyNotes: [],
    assetFamily: "mascots",
    characterLineage: "chef",
    brandRecognitionConfidence: 0.9,
    identityFingerprint: {
      fingerprintHash: "mascot-hash",
      identityShapeMarkers: ["globe"],
      accessoryPattern: "",
      silhouette: "",
    },
  };
}

function analyzedMascotDoc(): EditorCanvasDocument {
  const now = new Date().toISOString();
  return stampEditorAnalyzedBackground({
    sessionId: "sess-reset",
    name: "Globe mascot.png",
    sourceKind: "character",
    sourceAssetId: null,
    backgroundUrl: "https://example.com/mascot.png",
    workflowStep: "visual_editor",
    objects: [
      {
        id: "obj_mascot",
        label: "Globe mascot",
        sourceKind: "character",
        assetId: null,
        storageKey: "",
        previewUrl: "https://example.com/mascot.png",
        transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
        locked: false,
        visible: true,
        bounds: { x: 0.2, y: 0.1, width: 0.5, height: 0.8 },
        layerType: "object",
        confidence: 0.9,
        semanticType: "mascot",
        category: "character",
      },
      {
        id: "background",
        label: "Background",
        sourceKind: "character",
        assetId: null,
        storageKey: "",
        previewUrl: "https://example.com/mascot.png",
        transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
        locked: true,
        visible: true,
        bounds: { x: 0, y: 0, width: 1, height: 1 },
        layerType: "background",
        confidence: 1,
      },
    ],
    placements: [],
    visionAnalysis: mascotVision(),
    assetProfile: {
      assetType: "mascot",
      humanSummaryKey: "editor.assetProfile.mascot",
      variantGroup: { groupId: "globe_man", baseLabel: "Globe mascot" },
      recommendations: [],
      readiness: { motion: "partial", studio: "ready", export: "ready" },
      routingHints: [],
    },
    semanticLayers: [
      { id: "layer_mascot", label: "Globe mascot", type: "character", confidence: 0.9 },
    ],
    detectedObjects: [
      {
        id: "det_mascot",
        label: "Globe mascot",
        category: "character",
        confidence: 0.9,
        layerId: "obj_mascot",
        bounds: { x: 0.2, y: 0.1, width: 0.5, height: 0.8 },
      },
    ],
    instructionStudioState: {
      selection: {
        objectKey: "obj_mascot",
        objectLabel: "Globe mascot",
        category: "character",
        action: "replace",
      },
      instructionObjects: [
        {
          id: "obj_mascot",
          label: "Globe mascot",
          category: "character",
          confidence: 0.9,
          source: "semanticLayers",
          suggestedActions: ["replace"],
        },
      ],
      changePlan: [{ id: "plan_1", index: 0, kind: "object", objectKey: "obj_mascot", action: "replace" }],
      activeVariantId: "variant_old",
      targetOnlyEdit: true,
      strongerProtection: true,
      hcProjectId: "hc_123",
      combineIntent: "custom_composition",
    },
    status: "editing",
    createdAt: now,
    updatedAt: now,
  });
}

describe("editor analysis reset", () => {
  it("editorAnalysisAppliesToBackground requires matching analyzedBackgroundUrl", () => {
    const doc = analyzedMascotDoc();
    assert.equal(editorAnalysisAppliesToBackground(doc), true);
    assert.equal(
      editorAnalysisAppliesToBackground({
        ...doc,
        backgroundUrl: "https://example.com/human.png",
      }),
      false
    );
  });

  it("resetEditorAnalysisState clears stale vision, feed, and selection metadata", () => {
    const stale = {
      ...analyzedMascotDoc(),
      backgroundUrl: "https://example.com/human.png",
      name: "Portrait.jpg",
    };
    const reset = resetEditorAnalysisState(stale, { preserveInstructionWorkflow: true });

    assert.equal(reset.objects.length, 1);
    assert.equal(reset.objects[0]?.layerType, "background");
    assert.equal(reset.visionAnalysis, undefined);
    assert.equal(reset.assetProfile, undefined);
    assert.equal(reset.semanticLayers, undefined);
    assert.equal(reset.detectedObjects, undefined);
    assert.equal(reset.instructionStudioState?.selection, undefined);
    assert.equal(reset.instructionStudioState?.instructionObjects, undefined);
    assert.equal(reset.instructionStudioState?.changePlan, undefined);
    assert.equal(reset.instructionStudioState?.activeVariantId, undefined);
    assert.equal(reset.instructionStudioState?.targetOnlyEdit, undefined);
    assert.equal(reset.instructionStudioState?.hcProjectId, "hc_123");
    assert.equal(reset.instructionStudioState?.combineIntent, "custom_composition");
    assert.equal(reset.analyzedBackgroundUrl, undefined);
  });

  it("object feed ignores stale instructionObjects after background change", () => {
    const stale = {
      ...analyzedMascotDoc(),
      backgroundUrl: "https://example.com/logo.png",
      name: "Logo.png",
    };
    const reset = resetEditorAnalysisState(stale);
    const feed = buildInstructionObjectsFromDocument(reset);
    const labels = feed.editableObjects.map((o) => o.label.toLowerCase());
    assert.ok(!labels.some((label) => /globe|mascot/.test(label)));
    assert.equal(feed.meta.source, "fallback");
  });

  it("documentNeedsDetectionBootstrap returns true when rich analysis is stale", () => {
    const stale = {
      ...analyzedMascotDoc(),
      backgroundUrl: "https://example.com/logo.png",
    };
    assert.equal(documentNeedsDetectionBootstrap(stale), true);
  });
});
