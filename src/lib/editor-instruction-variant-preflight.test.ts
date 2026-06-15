import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { nl } from "@/i18n/locales/nl";
import {
  executeEditorInstructionBulkVariantApi,
  executeEditorInstructionVariantApi,
} from "@/lib/editor-instruction-variant-client";
import {
  preflightEditorInstructionVariant,
  variantValidationMessageKey,
} from "@/lib/editor-instruction-variant-preflight";
import {
  clearEditorVariantTraces,
  listEditorVariantTraces,
} from "@/lib/editor-instruction-variant-trace";
import {
  EDITOR_VARIANT_VALIDATION_I18N,
  validateEditorInstructionVariantRequest,
} from "@/lib/editor-instruction-variant-validation";

const originalFetch = globalThis.fetch;
let fetchCallCount = 0;

afterEach(() => {
  globalThis.fetch = originalFetch;
  fetchCallCount = 0;
  clearEditorVariantTraces();
});

function stubFetch() {
  globalThis.fetch = (async () => {
    fetchCallCount += 1;
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as typeof fetch;
}

describe("editor instruction variant preflight", () => {
  const validInstruction = {
    objectKey: "combine",
    objectLabel: "Combine",
    category: "other" as const,
    action: "replace" as const,
    customPrompt: "Merge references",
  };

  it("blocks unknown object without document on client API", async () => {
    stubFetch();
    const result = await executeEditorInstructionVariantApi({
      sessionId: "sess_1",
      imageUrl: "https://example.com/a.png",
      prompt: "Replace logo with blue version",
      instruction: {
        objectKey: "obj_unknown",
        objectLabel: "Logo",
        category: "logo",
        action: "replace",
        replacement: "blue",
      },
      triggerSource: "instruction_generate_variant",
    });
    assert.equal(fetchCallCount, 0);
    assert.equal(result.ok, false);
    assert.equal(result.code, "missing_object");
    assert.deepEqual(result.missingFields, ["objectKey", "category"]);
    assert.equal(listEditorVariantTraces()[0]?.blocked, true);
    assert.equal(listEditorVariantTraces()[0]?.sent, false);
  });

  it("returns Dutch validation keys for incomplete generate state", () => {
    const objectAudit = preflightEditorInstructionVariant({
      triggerSource: "instruction_generate_variant",
      sessionId: "sess_1",
      imageUrl: "https://example.com/a.png",
      prompt: "Using the reference image, replace only Logo with the described replacement.",
      instruction: { objectKey: "obj_main", category: "other", action: "replace" },
      document: {
        backgroundUrl: "https://example.com/a.png",
        sessionId: "sess_1",
        objects: [],
        instructionStudioState: {},
      } as never,
    });
    assert.equal(objectAudit.blocked, true);
    assert.equal(
      nl[variantValidationMessageKey(objectAudit.validation)! as keyof typeof nl],
      "Kies eerst welk onderdeel je wilt aanpassen."
    );

    const actionAudit = preflightEditorInstructionVariant({
      triggerSource: "instruction_generate_variant",
      sessionId: "sess_1",
      imageUrl: "https://example.com/a.png",
      prompt: "Do something",
      instruction: {
        objectKey: "combine",
        objectLabel: "Combine",
        category: "other",
      },
    });
    assert.equal(actionAudit.validation.ok, false);
    if (!actionAudit.validation.ok) {
      assert.equal(
        nl[EDITOR_VARIANT_VALIDATION_I18N.missing_action as keyof typeof nl],
        "Kies eerst wat je wilt doen."
      );
    }

    const promptAudit = preflightEditorInstructionVariant({
      triggerSource: "instruction_generate_variant",
      sessionId: "sess_1",
      imageUrl: "https://example.com/a.png",
      prompt: "Using the reference image, blur only Main subject.",
      instruction: {
        objectKey: "combine",
        objectLabel: "Combine",
        category: "other",
        action: "blur",
      },
    });
    assert.equal(promptAudit.blocked, true);
    if (!promptAudit.validation.ok) {
      assert.equal(promptAudit.validation.code, "missing_prompt");
      assert.equal(
        nl[EDITOR_VARIANT_VALIDATION_I18N.missing_prompt as keyof typeof nl],
        "Beschrijf kort wat je wilt maken of aanpassen."
      );
    }
  });

  it("allows explicit combine generation payload", async () => {
    stubFetch();
    const audit = preflightEditorInstructionVariant({
      triggerSource: "combine_generate",
      sessionId: "sess_1",
      imageUrl: "https://example.com/a.png",
      prompt: "Combine references into one scene.",
      instruction: validInstruction,
    });
    assert.equal(audit.blocked, false);

    const result = await executeEditorInstructionVariantApi({
      sessionId: "sess_1",
      imageUrl: "https://example.com/a.png",
      prompt: "Combine references into one scene.",
      instruction: validInstruction,
      triggerSource: "combine_generate",
    });
    assert.equal(result.ok, true);
    assert.equal(fetchCallCount, 1);
    const trace = listEditorVariantTraces()[0];
    assert.equal(trace?.sent, true);
    assert.equal(trace?.responseStatus, 200);
    assert.equal(trace?.route, "/api/editor/instruction/variant");
  });

  it("bulk client blocks fetch when instruction is incomplete", async () => {
    stubFetch();
    const response = await executeEditorInstructionBulkVariantApi({
      sessionId: "sess_1",
      imageUrl: "https://example.com/a.png",
      instruction: {
        objectKey: "obj_missing",
        objectLabel: "X",
        category: "other",
        action: "replace",
      },
      plans: [{ id: "p1", name: "A", promptSuffix: "warm" }],
      triggerSource: "instruction_bulk_generate",
      document: {
        backgroundUrl: "https://example.com/a.png",
        sessionId: "sess_1",
        objects: [],
        instructionStudioState: {},
      } as never,
    });
    assert.equal(fetchCallCount, 0);
    assert.equal(response.ok, false);
  });

  it("accepts change_color when color is provided", () => {
    const result = validateEditorInstructionVariantRequest({
      sessionId: "sess_1",
      imageUrl: "https://example.com/a.png",
      prompt: "Using the reference image, change the color of only Logo.",
      instruction: {
        objectKey: "combine",
        objectLabel: "Logo",
        category: "logo",
        action: "change_color",
        color: "#0067B1",
      },
    });
    assert.equal(result.ok, true);
  });
});
