import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isCentralHcMandatoryAction,
  studioActionToCentralHcAction,
} from "@/server/studio-account/studio-central-hc-spend-policy";

describe("Studio central HC spend mapping", () => {
  it("maps Simple Studio voice and lipsync to canonical actions", () => {
    assert.equal(studioActionToCentralHcAction("voice_generation"), "voice_generation");
    assert.equal(
      studioActionToCentralHcAction("lipsync_talking_avatar"),
      "lipsync_talking_avatar",
    );
    assert.equal(isCentralHcMandatoryAction("voice_generation"), true);
    assert.equal(isCentralHcMandatoryAction("lipsync_talking_avatar"), true);
  });

  it("keeps motion/vision mappings", () => {
    assert.equal(studioActionToCentralHcAction("motion_render"), "motion_render_5s_720p_turbo");
    assert.equal(
      studioActionToCentralHcAction("premium_vision_analysis"),
      "premium_vision_analysis",
    );
  });

  it("does not map unrelated publish actions", () => {
    assert.equal(studioActionToCentralHcAction("publish_photo_story"), null);
    assert.equal(isCentralHcMandatoryAction("publish_photo_story"), false);
  });
});
