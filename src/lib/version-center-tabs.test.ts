import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildVersionCenterRows, rowsForTab } from "@/lib/version-center-tabs";
import type { AnimationProjectDetailResponse } from "@/types/animation-api";

function stubDetail(
  partial: Partial<AnimationProjectDetailResponse>
): AnimationProjectDetailResponse {
  return {
    id: "p1",
    status: "completed",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    advancedSettingsEnabled: false,
    images: [],
    exports: [],
    renderVersions: [],
    languageExports: [],
    ...partial,
  } as AnimationProjectDetailResponse;
}

describe("version center tabs", () => {
  it("groups render versions by kind", () => {
    const rows = buildVersionCenterRows(
      stubDetail({
        renderVersions: [
          {
            id: "rv1",
            renderVersionNumber: 1,
            kind: "initial",
            status: "completed",
            isDefault: true,
            versionNote: null,
            finalVideoUrl: "https://example.com/v1.mp4",
            cleanVideoUrl: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            completedAt: null,
            createdFromRenderId: null,
          },
          {
            id: "rv2",
            renderVersionNumber: 2,
            kind: "text_rerender",
            status: "completed",
            isDefault: false,
            versionNote: "NL copy",
            finalVideoUrl: "https://example.com/v2.mp4",
            cleanVideoUrl: null,
            createdAt: "2026-01-02T00:00:00.000Z",
            completedAt: null,
            createdFromRenderId: null,
          },
        ],
      })
    );
    assert.equal(rowsForTab(rows, "original").length, 1);
    assert.equal(rowsForTab(rows, "text").length, 1);
  });
});
