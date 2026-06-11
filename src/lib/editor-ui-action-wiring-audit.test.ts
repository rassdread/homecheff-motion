/**
 * Editor UI action wiring & display audit — contract tests.
 * Run: npx tsx --test src/lib/editor-ui-action-wiring-audit.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { isUxV7ObjectActionHidden } from "@/lib/editor-broken-features";
import { editorAdminCanShowAiAnalysis } from "@/lib/editor-ux-cleanup";
import {
  modeShowsComposePanels,
  modeShowsExportHub,
  modeShowsMotionPreparePanels,
  modeShowsPhotoEditObjectPanels,
  modeShowsQuickMotionPanel,
} from "@/lib/editor-ux-v7-workspace";
import { resolveUxV7ObjectActions } from "@/lib/editor-ux-v7-contextual";
import { evaluateEditorMaskGate } from "@/lib/editor-mask-gate";
import type { EditorCanvasDocument, EditorCanvasLayer } from "@/types/homecheff-visual-editor";

const ROOT = process.cwd();

function mockLayer(overrides: Partial<EditorCanvasLayer> = {}): EditorCanvasLayer {
  return {
    id: "sub_globe_1",
    label: "Globe",
    sourceKind: "upload",
    assetId: null,
    storageKey: "",
    previewUrl: "",
    transform: { x: 0.5, y: 0.2, scale: 1, rotation: 0 },
    locked: false,
    visible: true,
    bounds: { x: 0.38, y: 0.14, width: 0.24, height: 0.24 },
    layerType: "semantic",
    category: "brand_element",
    semanticType: "globe",
    parentObjectId: "semantic_0_globe_man",
    metadata: { promptCreatedSubLayer: true, approximateSelection: false },
    selectionShape: {
      selectionMode: "mask",
      maskUrl: "https://example.com/mask.png",
      boundingBox: { x: 0.38, y: 0.14, width: 0.24, height: 0.24 },
      polygon: [
        { x: 0.38, y: 0.14 },
        { x: 0.62, y: 0.14 },
        { x: 0.62, y: 0.38 },
        { x: 0.38, y: 0.38 },
      ],
      confidence: 0.9,
      segmentationSource: "replicate_sam3",
    },
    ...overrides,
  };
}

describe("Editor UI action wiring audit", () => {
  it("open photo default: mode tabs and human list wired in visual workspace", () => {
    const workspace = readFileSync(
      join(ROOT, "src/components/editor/editor-canvas-workspace.tsx"),
      "utf8"
    );
    assert.match(workspace, /EditorHumanObjectList/);
    assert.match(workspace, /EditorMagicEditBar/);
    assert.match(workspace, /humanFirst/);
    assert.doesNotMatch(workspace, /EditorFloatingToolbar/);
  });

  it("admin-only: selection verification and AI analysis gated", () => {
    const workspace = readFileSync(
      join(ROOT, "src/components/editor/editor-canvas-workspace.tsx"),
      "utf8"
    );
    assert.match(workspace, /isAdmin \?/);
    assert.match(workspace, /EditorSelectionVerificationPanel/);
    assert.match(workspace, /editorAdminCanShowAiAnalysis/);
    assert.equal(editorAdminCanShowAiAnalysis(false), false);
    assert.equal(editorAdminCanShowAiAnalysis(true), true);
    assert.match(workspace, /isAdmin && showAiAnalysis[\s\S]*EditorPlacementQaPanel/);
  });

  it("mode gating: workspace tab drives panel visibility", () => {
    assert.equal(modeShowsPhotoEditObjectPanels("photo_edit"), true);
    assert.equal(modeShowsPhotoEditObjectPanels("compose"), false);
    assert.equal(modeShowsComposePanels("compose"), true);
    assert.equal(modeShowsComposePanels("photo_edit"), false);
    assert.equal(modeShowsQuickMotionPanel("quick_motion"), true);
    assert.equal(modeShowsQuickMotionPanel("export"), false);
    assert.equal(modeShowsExportHub("export"), true);
    assert.equal(modeShowsExportHub("photo_edit"), false);
  });

  it("motion prepare flow adds handoff panels on any tab", () => {
    const doc: EditorCanvasDocument = {
      sessionId: "s",
      name: "m",
      sourceKind: "upload",
      sourceAssetId: null,
      backgroundUrl: "https://example.com/x.png",
      workflowStep: "visual_editor",
      editorFlowMode: "motion_prepare",
      objects: [],
      placements: [],
      status: "editing",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    assert.equal(modeShowsMotionPreparePanels(doc), true);
  });

  it("precise globe child: replace/duplicate enabled; live cutout hidden (instruction pivot)", () => {
    const layer = mockLayer();
    const gate = evaluateEditorMaskGate(layer);
    assert.equal(gate.allowed, true);
    const actions = resolveUxV7ObjectActions(layer);
    assert.ok(actions.includes("replace"));
    assert.ok(actions.includes("duplicate"));
    assert.equal(actions.includes("cutout"), false);
  });

  it("hint-only resize/move hidden from contextual bar", () => {
    assert.equal(isUxV7ObjectActionHidden("resize"), true);
    assert.equal(isUxV7ObjectActionHidden("move"), true);
    const logoActions = resolveUxV7ObjectActions(
      mockLayer({ label: "Logo", category: "logo", semanticType: "logo", parentObjectId: undefined })
    );
    assert.equal(logoActions.includes("resize"), false);
    assert.equal(logoActions.includes("move"), false);
  });

  it("core actions wired: instruction studio panel, duplicate, export hub", () => {
    const workspace = readFileSync(
      join(ROOT, "src/components/editor/editor-canvas-workspace.tsx"),
      "utf8"
    );
    assert.match(workspace, /EditorInstructionStudioWorkspace/);
    assert.match(workspace, /instructionStudioActive/);
    assert.match(workspace, /handleOperation\("duplicate"\)/);
    assert.match(workspace, /EditorExportHubPanel/);
    assert.match(workspace, /handleRemoveBackground/);
  });

  it("contextual bar uses i18n label keys not hardcoded English", () => {
    const bar = readFileSync(
      join(ROOT, "src/components/editor/editor-contextual-action-bar.tsx"),
      "utf8"
    );
    assert.match(bar, /EDITOR_UX_V7_OBJECT_ACTION_LABEL_KEYS/);
    assert.match(bar, /useActiveTranslator/);
    assert.doesNotMatch(bar, />\s*Replace\s*</);
  });
});
