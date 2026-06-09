import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEditorSavePayload } from "@/lib/editor-canvas-export";
import {
  bodyDesignerToCharacterConstructionProfile,
  buildEditorBodyDesignerPromptBlock,
  clampBodyDesignerParams,
  documentSupportsBodyDesigner,
  identityMarkerLayersLocked,
  patchBodyDesignerParams,
  resolveBodyDesignerPreset,
  resolveBodyDesignerSliderRange,
} from "@/lib/editor-body-designer";
import { createEditorDocumentFromUpload, saveEditorCanvasDocument } from "@/lib/editor-canvas-session";
import { seedEditorLayersFromVision } from "@/lib/editor-canvas-layers";
import { mapVisionJsonToAnalysis } from "@/lib/studio-asset-vision-analysis";
import { DEFAULT_CHARACTER_BODY_DESIGNER_PARAMS } from "@/types/homecheff-visual-editor";

describe("editor-body-designer phase 4", () => {
  it("resolves preset values", () => {
    const mascot = resolveBodyDesignerPreset("mascot");
    assert.equal(mascot.stylizationPreset, "mascot");
    assert.ok(mascot.headScale > 1.2);
  });

  it("updates profile via sliders with clamping", () => {
    const next = patchBodyDesignerParams(DEFAULT_CHARACTER_BODY_DESIGNER_PARAMS, { headScale: 2 }, "mascot");
    assert.ok(next.headScale <= 1.45);
    assert.ok(next.headScale > 1);
  });

  it("uses safer ranges for realistic humans", () => {
    const human = resolveBodyDesignerSliderRange("headScale", "human");
    const mascot = resolveBodyDesignerSliderRange("headScale", "mascot");
    assert.ok(human.max - human.min < mascot.max - mascot.min);
  });

  it("allows wider mascot ranges", () => {
    const range = resolveBodyDesignerSliderRange("shoulderWidth", "mascot");
    assert.equal(range.max, 1.4);
  });

  it("maps body designer to character construction profile", () => {
    const profile = bodyDesignerToCharacterConstructionProfile(resolveBodyDesignerPreset("hero"));
    assert.equal(profile.bodyType, "hero");
    assert.match(profile.limbProportions ?? "", /shoulders/i);
  });

  it("persists body profile in draft save payload", () => {
    const layers = seedEditorLayersFromVision({
      vision: mapVisionJsonToAnalysis({ objectType: "Mascot", keyFeatures: ["Globe body"], confidence: 0.9 }, { sourceName: "Mascot" }),
      sourceKind: "character",
    });
    const doc = saveEditorCanvasDocument({
      ...createEditorDocumentFromUpload({ name: "Mascot", backgroundUrl: "https://example.com/bg.png" }),
      objects: layers,
      sourceKind: "character",
      bodyDesigner: resolveBodyDesignerPreset("mascot"),
    });
    const payload = buildEditorSavePayload(doc);
    assert.ok(payload.bodyDesignerProfile);
    assert.ok(payload.semanticRecordPatch.characterConstructionProfile);
    assert.match(payload.bodyDesignerPromptBlock, /Character body design/i);
  });

  it("includes body profile in generation prompt block", () => {
    const doc = {
      ...createEditorDocumentFromUpload({ name: "Char", backgroundUrl: "https://example.com/bg.png" }),
      bodyDesigner: resolveBodyDesignerPreset("stylized"),
    };
    assert.match(buildEditorBodyDesignerPromptBlock(doc), /stylized/i);
  });

  it("detects identity marker layers as locked", () => {
    const locked = identityMarkerLayersLocked([
      {
        id: "m1",
        label: "Globe marker",
        sourceKind: "character",
        assetId: null,
        storageKey: "",
        previewUrl: "",
        transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
        locked: true,
        visible: true,
        bounds: { x: 0.3, y: 0.1, width: 0.2, height: 0.2 },
        layerType: "semantic",
        metadata: { identityRelevance: "identity_marker" },
      },
    ]);
    assert.equal(locked, true);
  });

  it("supports body designer for character documents", () => {
    const doc = {
      ...createEditorDocumentFromUpload({ name: "Char", backgroundUrl: "https://example.com/bg.png" }),
      sourceKind: "character" as const,
      objects: seedEditorLayersFromVision({
        vision: mapVisionJsonToAnalysis({ objectType: "Mascot", keyFeatures: ["Body"], confidence: 0.9 }, { sourceName: "M" }),
        sourceKind: "character",
      }),
    };
    assert.equal(documentSupportsBodyDesigner(doc), true);
    assert.equal(clampBodyDesignerParams(resolveBodyDesignerPreset("realistic"), "human").headScale <= 1.05, true);
  });
});
