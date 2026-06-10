import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  applyPostUploadMode,
  isPreImageStartIntentHidden,
  startScreenPrimaryOptions,
  workspaceModeForPostUpload,
} from "@/lib/editor-start-flow";
import {
  brandKitItemHasRenderablePreview,
  defaultHomeCheffBrandKit,
  resolveVisibleBrandKitItems,
} from "@/lib/editor-v6-brand-kit";
import {
  modeShowsComposePanels,
  modeShowsExportAdvancedPanels,
  modeShowsExportHub,
  modeShowsGifExportPanel,
  modeShowsMotionPreparePanels,
  modeShowsPhotoEditObjectPanels,
} from "@/lib/editor-ux-v7-workspace";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

function mockDocument(overrides: Partial<EditorCanvasDocument> = {}): EditorCanvasDocument {
  const now = new Date().toISOString();
  return {
    sessionId: "sess_start",
    name: "Start flow",
    sourceKind: "upload",
    sourceAssetId: null,
    backgroundUrl: "https://example.com/bg.png",
    workflowStep: "visual_editor",
    objects: [],
    placements: [],
    status: "editing",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("Editor start flow", () => {
  it("start screen only shows upload and library primary options", () => {
    assert.deepEqual(startScreenPrimaryOptions(), ["upload", "library"]);
  });

  it("hides gif print motion and combine intents before image exists", () => {
    assert.equal(isPreImageStartIntentHidden("make_gif"), true);
    assert.equal(isPreImageStartIntentHidden("export_print"), true);
    assert.equal(isPreImageStartIntentHidden("prepare_motion"), true);
    assert.equal(isPreImageStartIntentHidden("combine_images"), true);
    assert.equal(isPreImageStartIntentHidden("edit_photo"), false);
  });

  it("post-upload modes map to workspace modes", () => {
    assert.equal(workspaceModeForPostUpload("edit"), "photo_edit");
    assert.equal(workspaceModeForPostUpload("combine"), "compose");
    assert.equal(workspaceModeForPostUpload("motion_prepare"), "photo_edit");
    assert.equal(workspaceModeForPostUpload("export"), "export");
  });

  it("applyPostUploadMode stamps editorFlowMode on document", () => {
    const base = mockDocument();
    const edited = applyPostUploadMode(base, "combine");
    assert.equal(edited.editorFlowMode, "combine");
    assert.equal(edited.workspaceMode, "compose");
  });

  it("workspace tools are gated by active post-upload mode", () => {
    const editDoc = applyPostUploadMode(mockDocument(), "edit");
    const combineDoc = applyPostUploadMode(mockDocument(), "combine");
    const motionDoc = applyPostUploadMode(mockDocument(), "motion_prepare");
    const exportDoc = applyPostUploadMode(mockDocument(), "export");

    assert.equal(modeShowsPhotoEditObjectPanels("photo_edit"), true);
    assert.equal(modeShowsComposePanels("compose"), true);
    assert.equal(modeShowsMotionPreparePanels(motionDoc), true);
    assert.equal(modeShowsMotionPreparePanels(editDoc), false);
    assert.equal(modeShowsExportHub("export"), true);
    assert.equal(modeShowsExportAdvancedPanels("export"), true);
    assert.equal(modeShowsGifExportPanel("quick_motion"), true);
    assert.equal(modeShowsGifExportPanel("export"), false);
  });
});

describe("Editor brand kit assets", () => {
  it("brand assets exist under public/brand", () => {
    const root = process.cwd();
    assert.equal(existsSync(join(root, "public/brand/homecheff-logo.svg")), true);
    assert.equal(existsSync(join(root, "public/brand/garden-chef-mascot.svg")), true);
  });

  it("broken brand preview paths are hidden from visible kit items", () => {
    const items = defaultHomeCheffBrandKit();
    const broken = {
      ...items[0],
      id: "broken_logo",
      previewUrl: "/brand/missing-logo.svg",
    };
    assert.equal(brandKitItemHasRenderablePreview(broken), false);
    const visible = resolveVisibleBrandKitItems([...items, broken]);
    assert.equal(visible.some((item) => item.id === "broken_logo"), false);
    assert.ok(visible.some((item) => item.id === "hc_logo_primary"));
  });
});
