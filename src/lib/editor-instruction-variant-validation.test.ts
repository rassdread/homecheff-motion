import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  EDITOR_VARIANT_VALIDATION_CODES,
  EDITOR_VARIANT_VALIDATION_I18N,
  validateEditorInstructionVariantRequest,
} from "@/lib/editor-instruction-variant-validation";
import { nl } from "@/i18n/locales/nl";

describe("editor-instruction-variant-validation", () => {
  const validInstruction = {
    objectKey: "combine",
    objectLabel: "Subject",
    category: "other" as const,
    action: "replace" as const,
    customPrompt: "blue logo treatment",
  };

  const documentWithLogo = {
    backgroundUrl: "https://example.com/a.png",
    sessionId: "sess_1",
    objects: [],
    instructionStudioState: {},
  } as never;

  it("rejects empty session, image, and prompt before API call", () => {
    const missingSession = validateEditorInstructionVariantRequest({
      imageUrl: "https://example.com/a.png",
      prompt: "Replace logo",
      instruction: validInstruction,
    });
    assert.equal(missingSession.ok, false);
    if (!missingSession.ok) {
      assert.equal(missingSession.code, EDITOR_VARIANT_VALIDATION_CODES.missing_session);
    }

    const missingImage = validateEditorInstructionVariantRequest({
      sessionId: "sess_1",
      prompt: "Replace logo",
      instruction: validInstruction,
    });
    assert.equal(missingImage.ok, false);
    if (!missingImage.ok) {
      assert.equal(missingImage.code, EDITOR_VARIANT_VALIDATION_CODES.missing_image);
    }

    const missingPrompt = validateEditorInstructionVariantRequest({
      sessionId: "sess_1",
      imageUrl: "https://example.com/a.png",
      instruction: validInstruction,
      prompt: "   ",
    });
    assert.equal(missingPrompt.ok, false);
    if (!missingPrompt.ok) {
      assert.equal(missingPrompt.code, EDITOR_VARIANT_VALIDATION_CODES.missing_prompt);
    }
  });

  it("rejects unknown object with missing_object code and Dutch copy", () => {
    const result = validateEditorInstructionVariantRequest({
      sessionId: "sess_1",
      imageUrl: "https://example.com/a.png",
      prompt: "Replace logo",
      instruction: { objectKey: "obj_main", category: "other", action: "replace" },
      document: documentWithLogo,
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, EDITOR_VARIANT_VALIDATION_CODES.missing_object);
      assert.equal(
        nl[EDITOR_VARIANT_VALIDATION_I18N.missing_object as keyof typeof nl],
        "Kies eerst welk onderdeel je wilt aanpassen."
      );
    }
  });

  it("rejects missing action with Dutch copy", () => {
    const result = validateEditorInstructionVariantRequest({
      sessionId: "sess_1",
      imageUrl: "https://example.com/a.png",
      prompt: "Do something",
      instruction: {
        objectKey: "combine",
        objectLabel: "Logo",
        category: "other",
      },
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, EDITOR_VARIANT_VALIDATION_CODES.missing_action);
      assert.equal(
        nl[EDITOR_VARIANT_VALIDATION_I18N.missing_action as keyof typeof nl],
        "Kies eerst wat je wilt doen."
      );
    }
  });

  it("rejects replace without brief with missing_prompt", () => {
    const result = validateEditorInstructionVariantRequest({
      sessionId: "sess_1",
      imageUrl: "https://example.com/a.png",
      prompt: "Using the reference image, replace only Logo with the described replacement.",
      instruction: {
        objectKey: "combine",
        objectLabel: "Logo",
        category: "other",
        action: "replace",
      },
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, EDITOR_VARIANT_VALIDATION_CODES.missing_prompt);
    }
  });

  it("accepts a complete variant payload", () => {
    const result = validateEditorInstructionVariantRequest({
      sessionId: "sess_1",
      imageUrl: "https://example.com/a.png",
      prompt: "Replace logo with blue version",
      instruction: {
        ...validInstruction,
        customPrompt: "blue brand logo",
      },
      document: documentWithLogo,
    });
    assert.equal(result.ok, true);
  });

  it("handleGenerateVariant validates before runVariantGeneration and API fetch", () => {
    const workspace = readFileSync(
      join(process.cwd(), "src/components/editor/editor-instruction-studio-workspace.tsx"),
      "utf8"
    );
    assert.match(workspace, /preflightEditorInstructionVariant/);
    assert.match(workspace, /data-testid="instruction-generate-variant"/);
    assert.match(workspace, /canGenerateVariant/);
    const preflightIndex = workspace.indexOf("applyVariantPreflight");
    const appendIndex = workspace.indexOf("appendInstructionVariant", preflightIndex);
    const fetchIndex = workspace.indexOf("executeEditorInstructionVariantApi", preflightIndex);
    assert.ok(preflightIndex >= 0);
    assert.ok(appendIndex > preflightIndex);
    assert.ok(fetchIndex > appendIndex);
  });

  it("executeEditorInstructionVariantApi blocks fetch when validation fails", () => {
    const client = readFileSync(
      join(process.cwd(), "src/lib/editor-instruction-variant-client.ts"),
      "utf8"
    );
    assert.match(client, /preflightEditorInstructionVariant/);
    const validationReturn = client.indexOf("if (!audit.validation.ok)");
    const fetchIndex = client.indexOf("await fetch(route");
    assert.ok(validationReturn >= 0);
    assert.ok(fetchIndex > validationReturn);
  });
});
