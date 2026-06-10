import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultAssistantState } from "@/lib/editor-v7-command-history";
import { applyPostUploadMode } from "@/lib/editor-start-flow";
import {
  resolveUxV7NoSelectionActions,
  resolveUxV7ObjectActions,
} from "@/lib/editor-ux-v7-contextual";
import {
  modeShowsAlignmentTools,
  modeShowsComposePanels,
  modeShowsExportAdvancedPanels,
  modeShowsExportHub,
  modeShowsGifExportPanel,
  modeShowsPhotoEditObjectPanels,
  workspaceModeForNoSelectionAction,
} from "@/lib/editor-ux-v7-workspace";
import type { EditorCanvasDocument, EditorCanvasLayer } from "@/types/homecheff-visual-editor";

function mockLayer(overrides: Partial<EditorCanvasLayer> = {}): EditorCanvasLayer {
  return {
    id: "layer_1",
    label: "Chef",
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
    semanticType: "character",
    ...overrides,
  };
}

function mockDocument(): EditorCanvasDocument {
  const now = new Date().toISOString();
  return applyPostUploadMode(
    {
      sessionId: "ux_sess",
      name: "UX",
      sourceKind: "upload",
      sourceAssetId: null,
      backgroundUrl: "https://example.com/bg.png",
      workflowStep: "visual_editor",
      objects: [],
      placements: [],
      status: "editing",
      createdAt: now,
      updatedAt: now,
    },
    "edit"
  );
}

describe("Editor UX V7", () => {
  it("no selection shows five workspace actions", () => {
    const actions = resolveUxV7NoSelectionActions();
    assert.equal(actions.length, 5);
    assert.ok(actions.includes("edit_photo"));
    assert.ok(actions.includes("export"));
  });

  it("character object shows replace remove cutout animate duplicate", () => {
    const actions = resolveUxV7ObjectActions(mockLayer());
    assert.deepEqual(actions, ["replace", "remove", "cutout", "animate", "duplicate"]);
  });

  it("logo object shows replace resize move remove", () => {
    const actions = resolveUxV7ObjectActions(
      mockLayer({ label: "Logo", category: "logo", semanticType: "logo" })
    );
    assert.deepEqual(actions, ["replace", "resize", "move", "remove"]);
  });

  it("background object shows background tools only", () => {
    const actions = resolveUxV7ObjectActions(
      mockLayer({
        id: "bg",
        label: "Background",
        layerType: "background",
        bounds: { x: 0, y: 0, width: 1, height: 1 },
      })
    );
    assert.ok(actions.includes("background_remove"));
    assert.ok(actions.includes("background_blur"));
    assert.equal(actions.includes("cutout"), false);
  });

  it("photo edit workspace hides export advanced panels", () => {
    const document = mockDocument();
    assert.equal(modeShowsPhotoEditObjectPanels("photo_edit", document), true);
    assert.equal(modeShowsExportAdvancedPanels("photo_edit", document), false);
    assert.equal(modeShowsGifExportPanel("photo_edit", document), false);
    assert.equal(modeShowsComposePanels("photo_edit", document), false);
  });

  it("export workspace shows poster social alignment and hub", () => {
    const document = applyPostUploadMode(mockDocument(), "export");
    assert.equal(modeShowsExportAdvancedPanels("export", document), true);
    assert.equal(modeShowsAlignmentTools("export", document), true);
    assert.equal(modeShowsExportHub("export", document), true);
    assert.equal(modeShowsExportHub("quick_motion", document), false);
  });

  it("export flow shows gif export panel only in export mode", () => {
    const document = applyPostUploadMode(mockDocument(), "export");
    assert.equal(modeShowsGifExportPanel("export", document), true);
    assert.equal(modeShowsExportAdvancedPanels("quick_motion", document), false);
  });

  it("compose workspace shows library panels", () => {
    const document = applyPostUploadMode(mockDocument(), "combine");
    assert.equal(modeShowsComposePanels("compose", document), true);
    assert.equal(workspaceModeForNoSelectionAction("add_object"), "compose");
  });

  it("assistant sidebar collapsed by default for first-time flow", () => {
    assert.equal(defaultAssistantState().sidebarCollapsed, true);
  });
});
