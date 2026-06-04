import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  studioStoryboardViewerCanModify,
  studioStoryboardViewerCanView,
} from "@/server/studio/studio-storyboard-access";

describe("studio storyboard access", () => {
  const owner = { id: "user-1", role: "user" as const };
  const admin = { id: "admin-1", role: "admin" as const };
  const row = { ownerId: "user-1" };

  it("owner can view and modify", () => {
    assert.equal(studioStoryboardViewerCanView(owner, row), true);
    assert.equal(studioStoryboardViewerCanModify(owner, row), true);
  });

  it("admin can view but not modify others", () => {
    assert.equal(studioStoryboardViewerCanView(admin, row), true);
    assert.equal(studioStoryboardViewerCanModify(admin, row), false);
  });
});
