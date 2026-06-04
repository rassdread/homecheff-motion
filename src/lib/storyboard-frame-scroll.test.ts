import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  STORYBOARD_FRAME_ROW_ATTR,
  STORYBOARD_FRAME_SCROLL_INSET_PX,
  frameScrollTopInContainer,
} from "@/lib/storyboard-frame-scroll";

describe("storyboard frame scroll", () => {
  it("computes container scrollTop with sticky offset", () => {
    assert.equal(frameScrollTopInContainer(100, 240, 80, 16), 244);
    assert.equal(frameScrollTopInContainer(0, 50, 100, 16), 0);
    assert.equal(
      frameScrollTopInContainer(200, 120, 64, STORYBOARD_FRAME_SCROLL_INSET_PX),
      240
    );
  });

  it("storyboard editor scrolls only on user frame expand intent", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/instant/storyboard-editor.tsx"),
      "utf8"
    );
    assert.ok(source.includes("scrollFrameRowIntoView"));
    assert.ok(source.includes("pendingUserScrollSceneId"));
    assert.ok(source.includes("STORYBOARD_FRAME_ROW_ATTR"));
    assert.equal(source.includes("scrollIntoView"), false);
  });

  it("modals pass scroll container ref to storyboard editor", () => {
    const full = readFileSync(
      join(process.cwd(), "src/components/instant/full-rerender-editor-modal.tsx"),
      "utf8"
    );
    const text = readFileSync(
      join(process.cwd(), "src/components/instant/text-rerender-editor-modal.tsx"),
      "utf8"
    );
    assert.ok(full.includes("scrollContainerRef"));
    assert.ok(text.includes("scrollContainerRef"));
  });

  it("wizard wires scroll container from InstantWizardContent", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/animate/instant/page.tsx"),
      "utf8"
    );
    const content = readFileSync(
      join(process.cwd(), "src/components/instant/instant-wizard-content.tsx"),
      "utf8"
    );
    assert.ok(content.includes("contentRef"));
    assert.ok(page.includes("scrollContainerRef"));
  });
});
