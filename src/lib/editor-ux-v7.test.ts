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

  it("character without mask hides live selection tools (instruction studio pivot)", () => {
    const actions = resolveUxV7ObjectActions(mockLayer());
    assert.deepEqual(actions, ["duplicate"]);
    assert.equal(actions.includes("refine_selection"), false);
    assert.equal(actions.includes("cutout"), false);
  });

  it("character with mask shows replace remove duplicate (cutout hidden)", () => {
    const actions = resolveUxV7ObjectActions(
      mockLayer({
        selectionShape: {
          selectionMode: "mask",
          maskUrl: "https://example.com/mask.png",
          boundingBox: { x: 0.2, y: 0.2, width: 0.35, height: 0.45 },
          confidence: 0.9,
          segmentationSource: "sam2",
        },
        metadata: { estimatedBounds: false, approximateSelection: false },
      })
    );
    assert.deepEqual(actions, ["replace", "remove", "duplicate"]);
  });

  it("logo without mask hides refine resize move replace (instruction studio pivot)", () => {
    const actions = resolveUxV7ObjectActions(
      mockLayer({ label: "Logo", category: "logo", semanticType: "logo" })
    );
    assert.deepEqual(actions, []);
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
    assert.equal(actions.includes("background_blur"), false);
    assert.equal(actions.includes("cutout"), false);
  });

  it("photo edit tab shows object panels only on photo_edit", () => {
    assert.equal(modeShowsPhotoEditObjectPanels("photo_edit"), true);
    assert.equal(modeShowsPhotoEditObjectPanels("compose"), false);
    assert.equal(modeShowsExportAdvancedPanels("photo_edit"), false);
    assert.equal(modeShowsGifExportPanel("photo_edit"), false);
    assert.equal(modeShowsComposePanels("photo_edit"), false);
  });

  it("export tab shows poster social alignment and hub", () => {
    assert.equal(modeShowsExportAdvancedPanels("export"), true);
    assert.equal(modeShowsAlignmentTools("export"), true);
    assert.equal(modeShowsExportHub("export"), true);
    assert.equal(modeShowsExportHub("quick_motion"), false);
  });

  it("gif panel shows on quick_motion tab not export tab", () => {
    assert.equal(modeShowsGifExportPanel("quick_motion"), true);
    assert.equal(modeShowsGifExportPanel("export"), false);
    assert.equal(modeShowsExportAdvancedPanels("quick_motion"), false);
  });

  it("compose tab shows library panels regardless of start flow", () => {
    assert.equal(modeShowsComposePanels("compose"), true);
    assert.equal(workspaceModeForNoSelectionAction("add_object"), "compose");
  });

  it("assistant sidebar collapsed by default for first-time flow", () => {
    assert.equal(defaultAssistantState().sidebarCollapsed, true);
  });
});
