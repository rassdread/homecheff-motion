import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptySceneTextDraft } from "@/components/instant/instant-mode-panel";
import { buildStoryboardOverlayPreviewLines } from "@/lib/storyboard-overlay-preview";

describe("storyboard-overlay-preview beats", () => {
  it("includes every non-empty subtitle beat in live preview", () => {
    const scene = {
      ...emptySceneTextDraft(5),
      template: "auto" as const,
      subtitleBeats: ["One", "Two", "Three"],
      subtitle: "One",
    };
    const lines = buildStoryboardOverlayPreviewLines(scene);
    assert.deepEqual(
      lines.filter((l) => l.kind === "subtitle").map((l) => l.text),
      ["One", "Two", "Three"]
    );
  });
});
