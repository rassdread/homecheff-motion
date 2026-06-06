import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isStudioDirectorV2Enabled } from "@/lib/studio-director-v2-flag";
import {
  inferStoryPurposeForScene,
  storyPurposePatch,
} from "@/lib/studio-director-v2-story-purpose";

describe("studio-director-v2-flag", () => {
  it("is enabled by default", () => {
    const prev = process.env.NEXT_PUBLIC_STUDIO_DIRECTOR_V2;
    delete process.env.NEXT_PUBLIC_STUDIO_DIRECTOR_V2;
    try {
      assert.equal(isStudioDirectorV2Enabled(), true);
    } finally {
      if (prev === undefined) {
        delete process.env.NEXT_PUBLIC_STUDIO_DIRECTOR_V2;
      } else {
        process.env.NEXT_PUBLIC_STUDIO_DIRECTOR_V2 = prev;
      }
    }
  });

  it("can be disabled with false", () => {
    const prev = process.env.NEXT_PUBLIC_STUDIO_DIRECTOR_V2;
    process.env.NEXT_PUBLIC_STUDIO_DIRECTOR_V2 = "false";
    try {
      assert.equal(isStudioDirectorV2Enabled(), false);
    } finally {
      if (prev === undefined) {
        delete process.env.NEXT_PUBLIC_STUDIO_DIRECTOR_V2;
      } else {
        process.env.NEXT_PUBLIC_STUDIO_DIRECTOR_V2 = prev;
      }
    }
  });
});

describe("studio-director-v2-story-purpose", () => {
  it("infers introduction for first scene in multi-scene story", () => {
    assert.equal(inferStoryPurposeForScene(0, 4), "introduction");
  });

  it("returns patch with shot and emotion for purpose", () => {
    const patch = storyPurposePatch("solution");
    assert.equal(patch.shotType, "close_up");
    assert.equal(patch.emotion, "proud");
  });
});
