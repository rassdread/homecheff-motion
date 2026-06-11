import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { listInstructionDetectedObjects } from "@/lib/editor-instruction-objects";
import { buildEditorInstructionPromptV2 } from "@/lib/editor-instruction-prompt-builder";
import {
  DEFAULT_EDITOR_WORKSPACE_MODE,
  instructionStudioShowsLiveSelectionTools,
  isInstructionStudioMode,
  isLegacyCanvasEditorDocument,
} from "@/lib/editor-instruction-studio";
import {
  appendInstructionVariant,
  createPendingInstructionVariant,
  originalImageUrlUnchanged,
} from "@/lib/editor-instruction-version";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { DEFAULT_EDITOR_INSTRUCTION_SLIDERS } from "@/types/editor-instruction-studio";
import { HIDDEN_LIVE_CANVAS_TOOLS, HIDDEN_UX_V7_OBJECT_ACTIONS } from "@/lib/editor-broken-features";

describe("editor instruction studio pivot", () => {
  it("defaults workspace mode to instruction_studio", () => {
    const doc = createEditorDocumentFromUpload({
      name: "test.png",
      backgroundUrl: "https://example.com/a.png",
    });
    assert.equal(doc.workspaceMode, "instruction_studio");
    assert.equal(DEFAULT_EDITOR_WORKSPACE_MODE, "instruction_studio");
    assert.equal(isInstructionStudioMode("instruction_studio"), true);
    assert.equal(instructionStudioShowsLiveSelectionTools("instruction_studio"), false);
  });

  it("lists detected objects from vision layers", () => {
    const doc = createEditorDocumentFromUpload({
      name: "globe-man.png",
      backgroundUrl: "https://example.com/a.png",
    });
    doc.objects.push({
      id: "layer_globe",
      label: "Globe",
      sourceKind: "upload",
      assetId: null,
      storageKey: "",
      previewUrl: "https://example.com/a.png",
      transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
      locked: false,
      visible: true,
      bounds: { x: 0.3, y: 0.3, width: 0.2, height: 0.2 },
      layerType: "object",
      category: "prop",
      semanticType: "globe",
      confidence: 0.9,
    });
    const objects = listInstructionDetectedObjects(doc);
    assert.ok(objects.length >= 2);
  });

  it("builds instruction prompt for replace with cooking pan", () => {
    const prompt = buildEditorInstructionPromptV2({
      objectKey: "obj_globe",
      objectLabel: "globe",
      category: "tool",
      action: "replace",
      replacement: "cooking pan",
      preserveCharacter: true,
      sliders: {
        ...DEFAULT_EDITOR_INSTRUCTION_SLIDERS,
        preserveStyle: 85,
        brandPreservation: 90,
      },
      brandIdentity: "HomeCheff",
    });
    assert.match(prompt, /Replace only globe with cooking pan/i);
    assert.match(prompt, /Preserve: brand identity/i);
  });

  it("stores variants without mutating the original image url", () => {
    const doc = createEditorDocumentFromUpload({
      name: "test.png",
      backgroundUrl: "https://example.com/original.png",
    });
    const variant = createPendingInstructionVariant({
      sourceImageUrl: doc.backgroundUrl,
      sourceImageId: "background",
      instruction: {
        objectKey: "obj_globe",
        objectLabel: "globe",
        category: "tool",
        action: "remove",
        sliders: { ...DEFAULT_EDITOR_INSTRUCTION_SLIDERS },
      },
      prompt: "remove globe",
    });
    const next = appendInstructionVariant(doc, variant);
    assert.equal(originalImageUrlUnchanged(doc, next), true);
    assert.equal(next.instructionVariants?.length, 1);
    assert.equal(next.instructionStudioState?.activeVariantId, undefined);
  });

  it("flags legacy canvas sessions with non-instruction workspace mode", () => {
    const doc = createEditorDocumentFromUpload({
      name: "legacy.png",
      backgroundUrl: "https://example.com/a.png",
      workspaceMode: "photo_edit",
    });
    assert.equal(isLegacyCanvasEditorDocument(doc), true);
  });

  it("hides live canvas object actions", () => {
    assert.ok(HIDDEN_UX_V7_OBJECT_ACTIONS.has("move"));
    assert.ok(HIDDEN_UX_V7_OBJECT_ACTIONS.has("resize"));
    assert.ok(HIDDEN_UX_V7_OBJECT_ACTIONS.has("refine_selection"));
    assert.ok(HIDDEN_LIVE_CANVAS_TOOLS.has("lasso"));
  });
});
