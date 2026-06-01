import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStoryOverlayAss } from "@/server/animation-export/story-text-overlay";

describe("buildStoryOverlayAss", () => {
  it("skips empty scenes and times equal slices", () => {
    const ass = buildStoryOverlayAss({
      sceneTexts: [
        { title: "THE SYSTEM", subtitle: "Line one" },
        { title: "", subtitle: "" },
        { title: "END", subtitle: "" },
      ],
      durationSeconds: 9,
      width: 1080,
      height: 1920,
    });
    assert.match(ass, /THE SYSTEM/);
    assert.match(ass, /Line one/);
    assert.match(ass, /END/);
    assert.doesNotMatch(ass, /Dialogue:.*Scene 2/i);
    assert.match(ass, /0:00:00\.20,0:00:03\.80/);
  });
});
