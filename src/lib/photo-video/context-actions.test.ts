import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  contextActionsForMode,
  defaultContextAction,
  normalizeContextAction,
} from "@/lib/photo-video/context-actions";

describe("photo-video context actions", () => {
  it("defaults video selection to trim for discoverability", () => {
    assert.equal(defaultContextAction("video"), "trim");
    assert.equal(defaultContextAction("photo"), "text");
  });

  it("normalizes invalid actions per mode", () => {
    assert.equal(normalizeContextAction("video", "trim"), "trim");
    assert.equal(normalizeContextAction("photo", "trim"), "text");
    assert.equal(normalizeContextAction("overlay", "style"), "style");
  });

  it("lists trim in video context actions", () => {
    assert.ok(contextActionsForMode("video").includes("trim"));
    assert.equal(contextActionsForMode("photo").includes("trim"), false);
  });
});
