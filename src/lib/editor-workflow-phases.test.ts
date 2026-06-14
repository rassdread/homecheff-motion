import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import {
  detectEditorWorkflowIntent,
  resolveWorkflowIntent,
} from "@/lib/editor-workflow-orchestration";
import {
  isMotionWorkspaceUnlocked,
  resolveDefaultEditorImagePhase,
} from "@/lib/editor-workflow-phases";
import { evaluateMotionReadiness } from "@/lib/editor-motion-workflow";

describe("editor workflow phases — edit first, motion second", () => {
  it("motion_prepare post-upload opens edit tab not motion", () => {
    const doc = createEditorDocumentFromUpload({
      name: "mascot.png",
      backgroundUrl: "https://example.com/m.png",
    });
    doc.editorFlowMode = "motion_prepare";
    assert.equal(resolveWorkflowIntent(doc), "edit");
  });

  it("motion intent from director stays on edit until variant approved", () => {
    const doc = createEditorDocumentFromUpload({
      name: "mascot.png",
      backgroundUrl: "https://example.com/m.png",
    });
    doc.instructionStudioState = {
      directorPrompt: "Prepare Globe Man for animation",
    };
    assert.equal(detectEditorWorkflowIntent(doc), "edit");
    assert.equal(isMotionWorkspaceUnlocked(doc), false);
  });

  it("defaults image phase to parts when hierarchy exists", () => {
    const doc = createEditorDocumentFromUpload({
      name: "mascot.png",
      backgroundUrl: "https://example.com/m.png",
    });
    doc.visionHierarchy = [
      {
        id: "root",
        label: "Character / Mascot",
        category: "objects",
        editable: true,
        estimated: false,
        children: [],
      },
    ];
    assert.equal(resolveDefaultEditorImagePhase(doc), "parts");
  });

  it("motion readiness stays locked until variant approved", () => {
    const doc = createEditorDocumentFromUpload({
      name: "mascot.png",
      backgroundUrl: "https://example.com/m.png",
    });
    doc.editorFlowMode = "motion_prepare";
    assert.equal(isMotionWorkspaceUnlocked(doc), false);
    assert.equal(resolveWorkflowIntent(doc), "edit");
    const report = evaluateMotionReadiness(doc);
    assert.equal(report.usesApprovedVariant, false);
  });
});
