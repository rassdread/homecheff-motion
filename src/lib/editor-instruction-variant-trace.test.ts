import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  clearEditorVariantTraces,
  listEditorVariantTraces,
  recordEditorVariantTrace,
  subscribeEditorVariantTraces,
} from "@/lib/editor-instruction-variant-trace";

afterEach(() => {
  clearEditorVariantTraces();
});

describe("editor instruction variant trace", () => {
  it("stores at most 20 trace entries", () => {
    for (let i = 0; i < 25; i += 1) {
      recordEditorVariantTrace({
        triggerSource: "instruction_generate_variant",
        sessionId: "sess_1",
        componentName: "EditorInstructionStudioWorkspace",
        buttonName: `btn_${i}`,
        route: "/api/editor/instruction/variant",
        blocked: false,
        sent: true,
        responseStatus: 200,
        captureStack: false,
      });
    }
    const rows = listEditorVariantTraces();
    assert.equal(rows.length, 20);
    assert.equal(rows[0]?.buttonName, "btn_24");
    assert.equal(rows[19]?.buttonName, "btn_5");
  });

  it("notifies subscribers when a trace is recorded", () => {
    let count = 0;
    const unsubscribe = subscribeEditorVariantTraces(() => {
      count += 1;
    });
    recordEditorVariantTrace({
      triggerSource: "combine_generate",
      sessionId: "sess_2",
      componentName: "EditorCombineWorkspace",
      buttonName: "combine-generate-button",
      route: "/api/editor/instruction/variant",
      blocked: true,
      sent: false,
      responseStatus: "client_blocked",
      validationCode: "missing_prompt",
      captureStack: false,
    });
    unsubscribe();
    assert.equal(count, 1);
    assert.equal(listEditorVariantTraces()[0]?.blocked, true);
  });
});
