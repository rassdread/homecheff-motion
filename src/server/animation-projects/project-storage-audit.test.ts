import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { estimateMonthlyStorageCostUsd } from "@/lib/blob-storage-pricing";
import { formatStorageBytes, sumNullableBytes } from "@/lib/format-storage-bytes";
import {
  aggregateAdminStorageAudit,
  aggregateProjectStorageBreakdown,
  auditProjectStorage,
  buildStorageRetentionRecommendationIds,
  collectProjectStorageUrlEntries,
  projectStorageRowFromAudit,
} from "@/server/animation-projects/project-storage-audit";

describe("project-storage-audit", () => {
  const project = {
    id: "proj-audit",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    instantCleanFinalVideoUrl: "https://blob/clean.mp4",
    instantPreviousFinalVideoUrl: null,
    instantFinalRebuiltAt: null,
    exports: [
      {
        id: "exp-1",
        status: "completed",
        outputVideoUrl: "https://blob/final.mp4",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ],
    languageExports: [
      {
        id: "lang-1",
        languageCode: "nl",
        languageLabel: "Nederlands",
        version: 1,
        isDefault: true,
        status: "completed",
        outputVideoUrl: "https://blob/nl.mp4",
        createdAt: new Date("2026-01-02T00:00:00.000Z"),
      },
      {
        id: "lang-draft",
        languageCode: "en",
        languageLabel: "English",
        version: 1,
        isDefault: false,
        status: "draft",
        outputVideoUrl: null,
        createdAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ],
    transitions: [
      {
        id: "tr-1",
        order: 0,
        status: "completed",
        outputVideoUrl: "https://blob/seg-0.mp4",
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: "tr-2",
        order: 1,
        status: "failed",
        outputVideoUrl: "https://blob/seg-failed.mp4",
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ],
  } as never;

  it("collects unique completed video URLs for audit", () => {
    const entries = collectProjectStorageUrlEntries(project);
    assert.ok(entries.some((row) => row.kind === "original"));
    assert.ok(entries.some((row) => row.kind === "clean"));
    assert.ok(entries.some((row) => row.kind === "language"));
    assert.ok(entries.some((row) => row.kind === "segment"));
    assert.equal(entries.filter((row) => row.kind === "language").length, 1);
  });

  it("calculates total project storage from probed assets", async () => {
    const audit = await auditProjectStorage({
      project,
      probe: async (url) => ({
        blobExists: true,
        contentLength:
          url.includes("clean") ? 10_000_000
          : url.includes("nl") ? 9_000_000
          : url.includes("final") ? 12_000_000
          : 4_000_000,
        mimeType: "video/mp4",
      }),
    });
    assert.equal(audit.totalSizeBytes, 35_000_000);
    assert.equal(audit.breakdown.cleanBytes, 10_000_000);
    assert.equal(audit.breakdown.languageBytes, 9_000_000);
    assert.equal(audit.breakdown.originalBytes, 12_000_000);
    assert.equal(audit.estimatedMonthlyStorageCostUsd, estimateMonthlyStorageCostUsd(35_000_000));
    assert.ok(audit.currentVersionCount >= 2);
  });

  it("includes retention recommendations for drafts and failed segments", () => {
    const ids = buildStorageRetentionRecommendationIds(project);
    assert.ok(ids.includes("keep_clean_video"));
    assert.ok(ids.includes("optional_delete_language_drafts"));
    assert.ok(ids.includes("optional_delete_failed_segments"));
  });

  it("aggregates admin totals and top projects", () => {
    const rowA = projectStorageRowFromAudit({
      projectId: "a",
      assets: [],
      blobCount: 3,
      totalSizeBytes: 20_000_000,
      breakdown: aggregateProjectStorageBreakdown([
        {
          id: "1",
          kind: "original",
          label: "",
          url: null,
          blobExists: true,
          sizeBytes: 12_000_000,
          createdAt: null,
        },
        {
          id: "2",
          kind: "clean",
          label: "",
          url: null,
          blobExists: true,
          sizeBytes: 8_000_000,
          createdAt: null,
        },
      ]),
      estimatedMonthlyStorageCostUsd: 0,
      estimatedTransferCostUsd: 0,
      currentVersionCount: 2,
      archivedVersionCount: 0,
      activeStorageBytes: 20_000_000,
      archivedStorageBytes: 0,
      retentionRecommendationIds: [],
      probedAt: new Date().toISOString(),
    });
    const rowB = projectStorageRowFromAudit({
      projectId: "b",
      assets: [],
      blobCount: 1,
      totalSizeBytes: 5_000_000,
      breakdown: aggregateProjectStorageBreakdown([
        {
          id: "1",
          kind: "original",
          label: "",
          url: null,
          blobExists: true,
          sizeBytes: 5_000_000,
          createdAt: null,
        },
      ]),
      estimatedMonthlyStorageCostUsd: 0,
      estimatedTransferCostUsd: 0,
      currentVersionCount: 2,
      archivedVersionCount: 0,
      activeStorageBytes: 20_000_000,
      archivedStorageBytes: 0,
      retentionRecommendationIds: [],
      probedAt: new Date().toISOString(),
    });

    const summary = aggregateAdminStorageAudit([rowA, rowB]);
    assert.equal(summary.totalVideoStorageBytes, 25_000_000);
    assert.equal(summary.projectCount, 2);
    assert.equal(summary.topProjects[0]?.projectId, "a");
    assert.equal(summary.averageBytesPerProject, Math.round(25_000_000 / 2));
  });
});

describe("format-storage-bytes", () => {
  it("formats bytes and sums nullable values", () => {
    assert.match(formatStorageBytes(1_500_000), /MB/);
    assert.equal(sumNullableBytes([1_000, null, 2_000]), 3_000);
  });
});
