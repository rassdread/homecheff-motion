import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mapHandoffSceneToPersistedText,
  mapHandoffToPersistedWizardState,
  mapStudioEmotionToMotion,
} from "@/lib/studio-motion-handoff-map";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";

const samplePayload: MotionHandoffPayload = {
  version: 1,
  storyboardId: "sb-1",
  title: "HomeCheff Promo",
  description: "Rotterdam + garden",
  scenes: [
    {
      sceneId: "scene-1",
      order: 0,
      title: "Chef cooking",
      description: "Kitchen scene",
      location: null,
      characters: [],
      props: [],
      action: "cooking",
      emotion: "proud",
      camera: "wide_shot",
      transitionToNext: "",
      durationSeconds: 8,
      studioContext: {
        source: "studio",
        storyboardId: "sb-1",
        sceneId: "scene-1",
        action: "cooking",
        emotion: "proud",
        camera: "wide_shot",
        transitionToNext: "",
        location: null,
        characters: [],
        props: [],
        notes: "Kitchen scene\ncooking",
      },
    },
  ],
};

describe("studio motion handoff map", () => {
  it("maps studio emotions to motion ids", () => {
    const mapped = mapStudioEmotionToMotion("proud");
    assert.equal(mapped.emotionMode, "manual");
    if (mapped.emotionMode === "manual") {
      assert.equal(mapped.emotion, "proud");
    }
  });

  it("maps scene title and description to motion text fields", () => {
    const text = mapHandoffSceneToPersistedText(samplePayload.scenes[0]!, 5);
    assert.equal(text.title, "Chef cooking");
    assert.equal(text.subtitle, "Kitchen scene");
  });

  it("builds persisted wizard with story slots and studio metadata", () => {
    const state = mapHandoffToPersistedWizardState(samplePayload);
    assert.equal(state.instantMode, "story");
    assert.equal(state.sceneSlots?.length, 1);
    assert.equal(state.studioHandoff?.storyboardId, "sb-1");
    assert.equal(state.sceneSlots?.[0]?.studioContext?.sceneId, "scene-1");
  });
});
