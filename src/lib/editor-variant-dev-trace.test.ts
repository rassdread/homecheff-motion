import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { recordEditorVariantTrace } from "@/lib/editor-instruction-variant-trace";
import { sanitizeEditorVariantDevPayload } from "@/lib/editor-variant-dev-log";

describe("editor variant dev trace", () => {
  it("sanitizes variant payload for dev logs", () => {
    const sanitized = sanitizeEditorVariantDevPayload({
      sessionId: "sess-1",
      imageUrl: "https://example.com/" + "a".repeat(400),
      prompt: "x".repeat(400),
      instruction: {
        objectKey: "obj_1",
        objectLabel: "Logo",
        category: "logo",
        action: "replace",
        customPrompt: "secret details",
      },
    });
    assert.equal(sanitized.imageUrl?.length, 240);
    assert.equal(sanitized.prompt?.length, 240);
    assert.equal(sanitized.instruction?.customPrompt, undefined);
  });

  it("variant trace records triggerSource on every call", () => {
    const entry = recordEditorVariantTrace({
      triggerSource: "instruction_generate_from_plan",
      sessionId: "sess-1",
      componentName: "EditorInstructionStudioWorkspace",
      buttonName: "instruction-generate-from-plan",
      route: "/api/editor/instruction/variant",
      blocked: true,
      sent: false,
      responseStatus: "client_blocked",
      validationCode: "missing_prompt",
      captureStack: false,
    });
    assert.equal(entry.triggerSource, "instruction_generate_from_plan");
  });

  it("client logs blocked and sent markers around fetch", () => {
    const client = readFileSync(
      join(process.cwd(), "src/lib/editor-instruction-variant-client.ts"),
      "utf8"
    );
    assert.match(client, /logEditorVariantBlockedDev/);
    assert.match(client, /logEditorVariantSentDev/);
    assert.match(client, /logEditorVariantRequestDev/);
    assert.match(client, /if \(!audit\.validation\.ok\)/);
    assert.match(client, /await fetch\(route/);
  });

  it("invalid generate path avoids fetch in workspace preflight", () => {
    const workspace = readFileSync(
      join(process.cwd(), "src/components/editor/editor-instruction-studio-workspace.tsx"),
      "utf8"
    );
    assert.match(workspace, /if \(!audit\.validation\.ok\) \{\s*return null;/);
    assert.match(workspace, /canGenerateVariant/);
  });
});
