import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  studioPropViewerCanModify,
  studioPropViewerCanView,
} from "@/server/studio/studio-prop-access";

describe("studio prop access", () => {
  const owner = { id: "user-1", role: "user" as const };
  const admin = { id: "admin-1", role: "admin" as const };
  const row = { ownerId: "user-1" };

  it("owner can view and modify", () => {
    assert.equal(studioPropViewerCanView(owner, row), true);
    assert.equal(studioPropViewerCanModify(owner, row), true);
  });

  it("admin can view but not modify others", () => {
    assert.equal(studioPropViewerCanView(admin, row), true);
    assert.equal(studioPropViewerCanModify(admin, row), false);
  });
});
