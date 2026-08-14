/**
 * SP.3 — Assistant creation entry routes to guided experience (not Editor/start by default).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAssistantAction } from "@/lib/assistant-action-registry";
import { buildAssistantActionRoute } from "@/lib/assistant-route-builder";

describe("SP.3 assistant orchestration entry", () => {
  it("create_video_production canonical route is guided experience", () => {
    assert.equal(getAssistantAction("create_video_production").canonicalRoute, "/studio/experience");
  });

  it("routes natural video intent to /studio/experience with idea", () => {
    const href = buildAssistantActionRoute("create_video_production", {
      idea: "Instagram video for my restaurant burger launch",
      videoIntent: "photo_story",
    });
    assert.match(href, /^\/studio\/experience\?/);
    assert.match(href, /idea=/);
    assert.match(href, /intent=photo_story/);
  });

  it("keeps /studio/start when an existing project is in context", () => {
    const href = buildAssistantActionRoute("create_video_production", {
      projectId: "proj_123",
      idea: "continue",
    });
    assert.match(href, /^\/studio\/start\?/);
    assert.match(href, /hcProject=proj_123/);
  });
});
