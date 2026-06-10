import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyEditorLayerOperation,
  patchEditorLayerTransform,
  undoEditorDocument,
} from "@/lib/editor-canvas-session";
import { ensureEditorNonDestructiveState } from "@/lib/editor-non-destructive";
import {
  EDITOR_VISIBILITY_AUDIT,
  controlEditReadiness,
  humanFirstObjectLabelKey,
  isTechnicalSubPartLayer,
  layersForHumanFirstTree,
  resolveContextualHumanActions,
  resolveHumanFirstObjectType,
  shouldShowActionInHumanUi,
  shouldShowControlInHumanUi,
  shouldShowTechnicalMetadata,
} from "@/lib/editor-ux-cleanup";
import type { EditorCanvasDocument, EditorCanvasLayer } from "@/types/homecheff-visual-editor";

function mockLayer(overrides: Partial<EditorCanvasLayer> = {}): EditorCanvasLayer {
  return {
    id: "layer_1",
    label: "Face",
    sourceKind: "upload",
    assetId: null,
    storageKey: "",
    previewUrl: "",
    transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
    locked: false,
    visible: true,
    bounds: { x: 0.2, y: 0.2, width: 0.3, height: 0.4 },
    layerType: "semantic",
    category: "character",
    confidence: 0.91,
    ...overrides,
  };
}

function mockDocument(objects: EditorCanvasLayer[]): EditorCanvasDocument {
  const now = new Date().toISOString();
  return ensureEditorNonDestructiveState({
    sessionId: "sess_ux",
    name: "UX",
    sourceKind: "upload",
    sourceAssetId: null,
    backgroundUrl: "https://example.com/bg.png",
    workflowStep: "visual_editor",
    objects,
    placements: [],
    status: "editing",
    createdAt: now,
    updatedAt: now,
  });
}

describe("Editor UX Cleanup V1", () => {
  it("technical metadata hidden by default", () => {
    assert.equal(shouldShowTechnicalMetadata(false), false);
    assert.equal(shouldShowControlInHumanUi("confidence", false), false);
    assert.equal(shouldShowControlInHumanUi("polygon", false), false);
    const hidden = EDITOR_VISIBILITY_AUDIT.filter((item) => item.visibility !== "keep");
    assert.ok(hidden.some((item) => item.id === "confidence"));
  });

  it("human-first object labels visible", () => {
    const mascot = mockLayer({ label: "Garden Chef Mascot", category: "character" });
    assert.equal(resolveHumanFirstObjectType(mascot), "character");
    assert.equal(humanFirstObjectLabelKey(mascot), "editor.ux.object.character");
    const globe = mockLayer({ label: "Green Globe", category: "prop" });
    assert.equal(resolveHumanFirstObjectType(globe), "globe");
    assert.equal(humanFirstObjectLabelKey(globe), "editor.ux.object.globe");
  });

  it("advanced mode reveals metadata", () => {
    assert.equal(shouldShowTechnicalMetadata(true), true);
    assert.equal(shouldShowControlInHumanUi("confidence", true), true);
    assert.equal(shouldShowControlInHumanUi("confidence", false), false);
    assert.equal(controlEditReadiness("confidence"), "no_effect");
  });

  it("contextual actions change per object", () => {
    const character = mockLayer({ label: "Main Character", category: "character" });
    const logo = mockLayer({ label: "Brand Logo", category: "logo" });
    const characterActions = resolveContextualHumanActions(character).map((a) => a.id);
    const logoActions = resolveContextualHumanActions(logo).map((a) => a.id);
    assert.equal(characterActions.includes("edit_appearance"), false);
    assert.ok(characterActions.includes("remove"));
    assert.ok(logoActions.includes("logo_replace"));
    assert.ok(!logoActions.includes("edit_appearance"));
  });

  it("controls without functionality hidden", () => {
    assert.equal(shouldShowActionInHumanUi("change_clothing"), false);
    assert.equal(shouldShowActionInHumanUi("move"), true);
    assert.equal(shouldShowControlInHumanUi("change_expression", false), false);
  });

  it("technical sub-parts collapse in human tree", () => {
    const face = mockLayer({ label: "Round Face", parentObjectId: "obj_1" });
    const mascot = mockLayer({ id: "mascot", label: "Mascot", category: "character" });
    const background = mockLayer({
      id: "background",
      label: "Background",
      layerType: "background",
      bounds: { x: 0, y: 0, width: 1, height: 1 },
    });
    assert.equal(isTechnicalSubPartLayer(face), true);
    const tree = layersForHumanFirstTree([background, mascot, face]);
    assert.equal(tree.length, 2);
  });

  it("live edit controls update canvas", () => {
    const background = mockLayer({
      id: "background",
      label: "Background",
      layerType: "background",
      bounds: { x: 0, y: 0, width: 1, height: 1 },
      locked: true,
    });
    const layer = mockLayer({ id: "logo", label: "Logo", category: "logo" });
    let doc = mockDocument([background, layer]);
    doc = patchEditorLayerTransform(doc, "logo", { scale: 1.4, rotation: 12 });
    const updated = doc.objects.find((o) => o.id === "logo")!;
    assert.equal(updated.transform.scale, 1.4);
    assert.equal(updated.transform.rotation, 12);
    assert.equal(controlEditReadiness("transform_scale"), "works_live");
  });

  it("undo works after live edits", () => {
    const background = mockLayer({
      id: "background",
      label: "Background",
      layerType: "background",
      bounds: { x: 0, y: 0, width: 1, height: 1 },
      locked: true,
    });
    const layer = mockLayer({ id: "logo", label: "Logo", category: "logo" });
    const original = mockDocument([background, layer]);
    const edited = applyEditorLayerOperation(original, "logo", "scale", { scale: 1.6 });
    const undone = undoEditorDocument(edited);
    const restored = undone.objects.find((o) => o.id === "logo")!;
    assert.equal(restored.transform.scale, 1);
  });
});
