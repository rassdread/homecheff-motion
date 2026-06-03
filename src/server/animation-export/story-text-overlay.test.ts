import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertNoDialogueOverlap } from "@/server/animation-export/story-overlay-dialogue";
import { buildStoryOverlayAss } from "@/server/animation-export/story-text-overlay";
import type { FinalizeSceneDialoguesResult } from "@/server/animation-export/story-overlay-dialogue";

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
    assert.match(ass, /0:00:00\.80,0:00:02\.85/);
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

  it("applies collision resolver so resolved drafts never overlap", () => {
    const collisions: FinalizeSceneDialoguesResult[] = [];
    buildStoryOverlayAss({
      sceneTexts: [
        {
          template: "hero",
          heroText: "HERO HEADLINE",
          title: "Scene title",
          subtitle: "Scene subtitle copy",
        },
      ],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
      onSceneCollision: (_index, result) => {
        collisions.push(result);
      },
    });
    assert.equal(collisions.length, 1);
    const check = assertNoDialogueOverlap(collisions[0]!.resolvedDrafts);
    assert.equal(check.ok, true, check.ok ? "" : check.pairs.join(","));
  });
});
