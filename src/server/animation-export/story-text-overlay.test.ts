import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStoryOverlayAss } from "@/server/animation-export/story-text-overlay";

describe("buildStoryOverlayAss", () => {
  it("skips empty scenes and times equal slices with 0.15s margin", () => {
    const ass = buildStoryOverlayAss({
      sceneTexts: [
        { template: "scene", title: "THE SYSTEM", subtitle: "Line one" },
        { template: "auto" },
        { template: "scene", title: "END", subtitle: "" },
      ],
      durationSeconds: 9,
      width: 1080,
      height: 1920,
    });
    assert.match(ass, /THE SYSTEM/);
    assert.match(ass, /Line one/);
    assert.match(ass, /END/);
    assert.match(ass, /0:00:00\.15,0:00:02\.85/);
  });

  it("language rerender path uses the same staged scene timing", () => {
    const ass = buildStoryOverlayAss({
      sceneTexts: [{ template: "scene", title: "HEADLINE", subtitle: "Subtitle copy" }],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
    });
    const title = ass.split("\n").find((line) => line.includes("HEADLINE"));
    const subtitle = ass.split("\n").find((line) => line.includes("Subtitle copy"));
    assert.ok(title && subtitle);
    assert.notEqual(title.split(",")[1], subtitle.split(",")[1]);
  });
});
