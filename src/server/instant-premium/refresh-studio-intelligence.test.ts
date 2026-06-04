import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  REFRESH_STUDIO_NO_SOURCE,
  REFRESH_STUDIO_NOT_IMPLEMENTED,
  refreshStudioIntelligenceForAnimationProject,
} from "@/server/instant-premium/refresh-studio-intelligence";
import { appendStudioRefreshAudit } from "@/lib/studio-project-metadata";

describe("refreshStudioIntelligenceForAnimationProject", () => {
  it("returns not implemented for refreshImages", async () => {
    const result = await refreshStudioIntelligenceForAnimationProject({
      projectId: "nonexistent",
      userId: "user-1",
      options: { refreshQa: true, refreshImages: true },
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, REFRESH_STUDIO_NOT_IMPLEMENTED);
      assert.equal(result.status, 501);
    }
  });

  it("returns not implemented for refreshText", async () => {
    const result = await refreshStudioIntelligenceForAnimationProject({
      projectId: "nonexistent",
      userId: "user-1",
      options: { refreshQa: true, refreshText: true },
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, REFRESH_STUDIO_NOT_IMPLEMENTED);
    }
  });

  it("returns no source when project missing studio storyboard", async () => {
    const result = await refreshStudioIntelligenceForAnimationProject({
      projectId: "definitely-missing-project-id",
      userId: "user-1",
      options: { refreshQa: true },
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(
        result.code === REFRESH_STUDIO_NO_SOURCE || result.code === "REFRESH_STUDIO_NOT_FOUND"
      );
    }
  });
});

describe("appendStudioRefreshAudit", () => {
  it("appends refresh events", () => {
    const entry = {
      refreshedAt: "2026-06-20T12:00:00.000Z",
      refreshedBy: "user-1",
      previousHandoffVersion: 8,
      newHandoffVersion: 9,
      staleReasons: ["Selected scene image changed"],
      scoreChanges: [],
      selectedImageChanges: [],
    };
    const json = appendStudioRefreshAudit(null, entry);
    assert.equal(json.events.length, 1);
    assert.equal(json.lastRefresh?.newHandoffVersion, 9);
  });
});
