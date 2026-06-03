import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  studioLocationViewerCanModify,
  studioLocationViewerCanView,
} from "@/server/studio/studio-location-access";

describe("studio location access", () => {
  const owner = { id: "user-1", role: "user" as const };
  const other = { id: "user-2", role: "user" as const };
  const admin = { id: "admin-1", role: "admin" as const };
  const row = { ownerId: "user-1" };

  it("owner can view and modify", () => {
    assert.equal(studioLocationViewerCanView(owner, row), true);
    assert.equal(studioLocationViewerCanModify(owner, row), true);
  });

  it("other user cannot view or modify", () => {
    assert.equal(studioLocationViewerCanView(other, row), false);
    assert.equal(studioLocationViewerCanModify(other, row), false);
  });

  it("admin can view but not modify others", () => {
    assert.equal(studioLocationViewerCanView(admin, row), true);
    assert.equal(studioLocationViewerCanModify(admin, row), false);
  });
});
