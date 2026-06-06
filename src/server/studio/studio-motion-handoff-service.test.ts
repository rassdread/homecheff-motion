import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toSceneSnapshot } from "@/server/studio/studio-storyboard-service";
import type { StudioStoryboardSceneRow } from "@/server/studio/studio-storyboard-service";
import { fixture } from "@/test/studio-api-fixtures";

describe("motion handoff snapshot mapping", () => {
  it("includes notes on scene snapshot", () => {
    const snap = toSceneSnapshot(
      fixture<StudioStoryboardSceneRow>({
        id: "s1",
        order: 0,
        title: "Scene",
        description: "Desc",
        action: "walking",
        emotion: "happy",
        camera: "medium_shot",
        transitionToNext: "",
        durationSeconds: 5,
        location: null,
        characters: [],
        props: [],
        selectedSceneImageId: null,
        sceneImages: [],
      })
    );
    assert.equal(snap.notes, "Desc\nwalking");
  });
});
