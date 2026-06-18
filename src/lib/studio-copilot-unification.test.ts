import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  patchStudioCopilotLayout,
  readStudioCopilotLayout,
  resolveWidthForPlacement,
  shouldHideSideCopilotOnEditor,
  writeStudioCopilotLayout,
} from "@/lib/studio-copilot-layout-storage";
import { applyEditorDirectorPrompt } from "@/lib/editor-instruction-director-actions";
import {
  DEFAULT_STUDIO_COPILOT_LAYOUT,
  STUDIO_COPILOT_LAYOUT_STORAGE_KEY,
  STUDIO_COPILOT_WIDTH_DEFAULT,
  STUDIO_COPILOT_WIDTH_WIDE,
} from "@/types/studio-copilot-layout";

describe("studio copilot unification", () => {
  it("reads and writes layout preferences to localStorage key", () => {
    const saved = writeStudioCopilotLayout({
      placement: "wide",
      width: 500,
      collapsedRecent: true,
      compactMode: true,
    });
    assert.equal(saved.placement, "wide");
    assert.ok(saved.width >= STUDIO_COPILOT_WIDTH_WIDE);
    const readBack = readStudioCopilotLayout();
    assert.equal(readBack.placement, "wide");
    assert.equal(readBack.collapsedRecent, true);
    writeStudioCopilotLayout(DEFAULT_STUDIO_COPILOT_LAYOUT);
  });

  it("resolveWidthForPlacement widens for wide and focus modes", () => {
    assert.ok(resolveWidthForPlacement("wide", 400) >= STUDIO_COPILOT_WIDTH_WIDE);
    assert.ok(resolveWidthForPlacement("focus", 400) >= 600);
    assert.equal(resolveWidthForPlacement("side", 440), 440);
  });

  it("hides side copilot on editor when placement is dock", () => {
    assert.equal(shouldHideSideCopilotOnEditor("dock", "/editor/foo"), true);
    assert.equal(shouldHideSideCopilotOnEditor("side", "/editor/foo"), false);
    assert.equal(shouldHideSideCopilotOnEditor("dock", "/studio"), false);
  });

  it("patchStudioCopilotLayout preserves other fields", () => {
    writeStudioCopilotLayout({
      placement: "side",
      width: 460,
      collapsedRecent: false,
      compactMode: false,
    });
    const next = patchStudioCopilotLayout({ placement: "dock" });
    assert.equal(next.placement, "dock");
    assert.equal(next.collapsedRecent, false);
    writeStudioCopilotLayout(DEFAULT_STUDIO_COPILOT_LAYOUT);
  });

  it("preserves editor director change-plan behavior via shared action helper", () => {
    const document = {
      name: "Globe Man",
      editorFlowMode: "edit",
      workspaceMode: "edit",
      instructionStudioState: {},
      objects: [],
      updatedAt: new Date().toISOString(),
    } as import("@/types/homecheff-visual-editor").EditorCanvasDocument;
    const applied = applyEditorDirectorPrompt({
      document,
      prompt: "maak de ogen groter",
      editableObjects: [{ id: "eyes", label: "Ogen", category: "eyes" } as never],
    });
    assert.ok(applied.parsed);
    assert.ok((applied.document.instructionStudioState?.changePlan?.length ?? 0) >= 0);
  });

  it("layout storage key matches spec", () => {
    assert.equal(STUDIO_COPILOT_LAYOUT_STORAGE_KEY, "homecheff:studio-copilot-layout");
    assert.equal(DEFAULT_STUDIO_COPILOT_LAYOUT.width, STUDIO_COPILOT_WIDTH_DEFAULT);
  });
});
