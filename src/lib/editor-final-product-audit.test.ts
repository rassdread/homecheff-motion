import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { startScreenPrimaryOptions, isPreImageStartIntentHidden } from "@/lib/editor-start-flow";
import {
  CLICK_TO_RESULT_AUDIT,
  EDITOR_SESSION_STORAGE_KEY,
  OBJECT_SELECTION_AUDIT,
  PIPELINE_COMPLETION_MATRIX,
  REAL_IMAGE_EDITING_AUDIT,
  TOP_25_BLOCKERS,
  USER_EXPECTATION_AUDIT,
  UX_COMPLEXITY_AUDIT,
  canvasPreviewRendersImportedLayers,
  editorProjectDeleteExists,
  exportUsesCompositorState,
  motionBootstrapWiredInApp,
  replaceReadinessIsPartial,
} from "@/lib/editor-final-product-audit";
import { buildEditorSaveNextActions } from "@/lib/suite-flow-handoffs";

describe("Editor Final Product Audit", () => {
  it("documents at least 10 user expectation gaps", () => {
    assert.ok(USER_EXPECTATION_AUDIT.length >= 10);
    const brokenOrMisleading = USER_EXPECTATION_AUDIT.filter(
      (row) => row.gap === "broken" || row.gap === "misleading"
    );
    assert.ok(brokenOrMisleading.length >= 3);
  });

  it("click chains document pixel breaks for replace remove and brand kit", () => {
    const replace = CLICK_TO_RESULT_AUDIT.find((row) => row.action === "Replace");
    const brand = CLICK_TO_RESULT_AUDIT.find((row) => row.action === "Brand kit insert");
    assert.equal(replace?.status, "breaks_before_pixels");
    assert.equal(brand?.pixelsChange, false);
  });

  it("object selection audit flags face as unreliable", () => {
    const face = OBJECT_SELECTION_AUDIT.find((row) => row.objectType.startsWith("Face"));
    assert.equal(face?.reliable, false);
    const unreliable = OBJECT_SELECTION_AUDIT.filter((row) => !row.reliable);
    assert.ok(unreliable.length >= 4);
  });

  it("real image editing audit marks unmasked ops as fake or broken", () => {
    const unmasked = REAL_IMAGE_EDITING_AUDIT.find((row) => row.operation.includes("Unmasked"));
    const blur = REAL_IMAGE_EDITING_AUDIT.find((row) => row.operation.includes("blur"));
    assert.equal(unmasked?.status, "fake");
    assert.equal(blur?.status, "broken");
  });

  it("start screen hides gif print motion combine before image", () => {
    assert.deepEqual(startScreenPrimaryOptions(), ["upload", "library"]);
    assert.equal(isPreImageStartIntentHidden("make_gif"), true);
    assert.equal(isPreImageStartIntentHidden("combine_images"), true);
  });

  it("canvas preview renders importedLayers via compositor", () => {
    assert.equal(canvasPreviewRendersImportedLayers(), true);
  });

  it("server export uses compositor state", () => {
    assert.equal(exportUsesCompositorState(), true);
  });

  it("replace is partially_works per UX cleanup readiness", () => {
    assert.equal(replaceReadinessIsPartial(), true);
  });

  it("editor project delete API exists", () => {
    assert.equal(editorProjectDeleteExists(), true);
  });

  it("motion bootstrap wired in instant page", () => {
    assert.equal(motionBootstrapWiredInApp(), true);
  });

  it("studio handoff link includes editorSession", () => {
    const actions = buildEditorSaveNextActions({ sessionId: "audit-sess", assetId: "asset-1" });
    const studio = actions.find((a) => a.id === "use-studio");
    assert.ok(studio?.href.includes("editorSession=audit-sess"));
  });

  it("pipeline matrix marks Motion as fail", () => {
    const motion = PIPELINE_COMPLETION_MATRIX.find((row) => row.step === "Motion");
    assert.equal(motion?.status, "fail");
  });

  it("lists 25 ranked blockers", () => {
    assert.equal(TOP_25_BLOCKERS.length, 25);
    assert.equal(TOP_25_BLOCKERS[0]?.rank, 1);
    assert.ok(TOP_25_BLOCKERS[0]?.blocker.includes("backgroundUrl"));
  });

  it("UX audit marks dead UI as remove_candidate or redundant", () => {
    const dead = UX_COMPLEXITY_AUDIT.filter(
      (row) => row.category === "remove_candidate" || row.category === "redundant"
    );
    assert.ok(dead.length >= 2);
  });

  it("session storage key is localStorage canvas sessions", () => {
    assert.equal(EDITOR_SESSION_STORAGE_KEY, "hc-editor-canvas-sessions-v1");
  });
});
