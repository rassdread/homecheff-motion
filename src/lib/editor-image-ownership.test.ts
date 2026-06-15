import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isEditorDocumentImageUrl,
  isEditorSessionScopedVariantImageUrl,
  validateEditorSegmentImageSource,
} from "@/server/editor/editor-image-ownership";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

describe("editor-image-ownership", () => {
  it("rejects foreign studio blob URLs in sync validation", () => {
    const result = validateEditorSegmentImageSource({
      imageUrl: "https://blob.example.com/studio/other-user/editor/foo.png",
      userId: "user-1",
    });
    assert.equal(result.ok, false);
  });

  it("accepts motion upload background when it matches the editor document", () => {
    const motionUrl =
      "https://blob.example.com/motion/upload-id/working-brand.png.jpg";
    const doc = {
      sessionId: "sess-1",
      backgroundUrl: motionUrl,
      instructionVariants: [],
    } as EditorCanvasDocument;

    assert.equal(isEditorDocumentImageUrl(doc, motionUrl), true);
    assert.equal(
      validateEditorSegmentImageSource({ imageUrl: motionUrl, userId: "user-1" }).ok,
      false
    );
  });

  it("accepts prior variant result URLs registered on the document", () => {
    const variantUrl =
      "https://blob.example.com/editor/instruction-variants/sess-1/123.png";
    const doc = {
      sessionId: "sess-1",
      backgroundUrl: "https://blob.example.com/motion/base.jpg",
      instructionVariants: [{ sourceImageUrl: "https://blob.example.com/motion/base.jpg", resultUrl: variantUrl }],
    } as EditorCanvasDocument;

    assert.equal(isEditorDocumentImageUrl(doc, variantUrl), true);
    assert.equal(isEditorSessionScopedVariantImageUrl(variantUrl, "sess-1"), true);
    assert.equal(isEditorSessionScopedVariantImageUrl(variantUrl, "other"), false);
  });
});
