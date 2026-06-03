import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  studioCharacterViewerCanModify,
  studioCharacterViewerCanView,
} from "@/server/studio/studio-character-access";

describe("studio character access", () => {
  const owner = { id: "user-1", role: "user" as const };
  const other = { id: "user-2", role: "user" as const };
  const admin = { id: "admin-1", role: "admin" as const };
  const row = { ownerId: "user-1" };

  it("owner can view and modify", () => {
    assert.equal(studioCharacterViewerCanView(owner, row), true);
    assert.equal(studioCharacterViewerCanModify(owner, row), true);
  });

  it("other user cannot view or modify", () => {
    assert.equal(studioCharacterViewerCanView(other, row), false);
    assert.equal(studioCharacterViewerCanModify(other, row), false);
  });

  it("admin can view but not modify others", () => {
    assert.equal(studioCharacterViewerCanView(admin, row), true);
    assert.equal(studioCharacterViewerCanModify(admin, row), false);
  });
});
