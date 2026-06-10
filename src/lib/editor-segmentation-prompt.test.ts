import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveEditorSegmentPrompt } from "@/lib/editor-segmentation-prompt";

describe("editor-segmentation-prompt", () => {
  it("maps globe category to globe prompt", () => {
    assert.equal(resolveEditorSegmentPrompt({ category: "globe" }), "globe");
  });

  it("maps logo label to logo prompt", () => {
    assert.equal(resolveEditorSegmentPrompt({ label: "HomeCheff Logo" }), "logo");
  });

  it("maps mascot to person prompt", () => {
    assert.equal(resolveEditorSegmentPrompt({ category: "mascot" }), "person");
  });

  it("maps face semantic to head prompt", () => {
    assert.equal(resolveEditorSegmentPrompt({ semanticType: "face" }), "head");
  });

  it("uses explicit prompt when provided", () => {
    assert.equal(resolveEditorSegmentPrompt({ explicitPrompt: "globe", category: "logo" }), "globe");
  });

  it("defaults to person when empty", () => {
    assert.equal(resolveEditorSegmentPrompt({}), "person");
  });
});
