import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  pickLatestVersionRow,
  rowsForSimpleTab,
  type VersionCenterRow,
} from "@/lib/version-center-tabs";

function row(partial: Partial<VersionCenterRow> & Pick<VersionCenterRow, "id" | "tab">): VersionCenterRow {
  return {
    title: partial.title ?? partial.id,
    status: partial.status ?? "completed",
    createdAt: partial.createdAt ?? null,
    videoUrl: partial.videoUrl ?? null,
    thumbnailUrl: partial.thumbnailUrl ?? null,
    projectId: partial.projectId ?? "p1",
    href: partial.href ?? `/videos/p1`,
    canOpenEditor: partial.canOpenEditor ?? false,
    ...partial,
  };
}

describe("version center simple mode", () => {
  it("picks the newest completed row with a video url", () => {
    const rows = [
      row({ id: "o", tab: "original", createdAt: "2024-01-01T00:00:00.000Z", videoUrl: "a" }),
      row({
        id: "t",
        tab: "text",
        createdAt: "2024-06-01T00:00:00.000Z",
        videoUrl: "b",
        renderVersionNumber: 2,
      }),
    ];
    const latest = pickLatestVersionRow(rows);
    assert.equal(latest?.id, "t");
    assert.equal(rowsForSimpleTab(rows, "latest").length, 1);
  });
});
