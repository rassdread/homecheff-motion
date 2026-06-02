import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  selectCleanupDryRunCandidates,
  STORAGE_RETENTION_POLICY,
} from "@/lib/storage-retention-policy";
import type { ProjectStorageAsset } from "@/types/storage-audit";

describe("storage-retention-policy", () => {
  const now = Date.parse("2026-06-02T00:00:00.000Z");

  it("dry-run never deletes files", () => {
    const result = selectCleanupDryRunCandidates({
      assets: [
        {
          id: "failed-lang",
          kind: "language",
          label: "Failed NL",
          languageCode: "nl",
          url: "https://blob/failed.mp4",
          blobExists: true,
          sizeBytes: 5_000_000,
          createdAt: "2026-01-01T00:00:00.000Z",
          status: "failed",
        },
      ],
      nowMs: now,
    });
    assert.equal(result.dryRun, true);
    assert.equal(result.deleted, false);
  });

  it("never selects current versions for deletion", () => {
    const result = selectCleanupDryRunCandidates({
      assets: [
        {
          id: "original",
          kind: "original",
          label: "Original",
          url: "https://blob/original.mp4",
          blobExists: true,
          sizeBytes: 12_000_000,
          createdAt: "2026-01-01T00:00:00.000Z",
          status: "completed",
        },
        {
          id: "clean",
          kind: "clean",
          label: "Clean",
          url: "https://blob/clean.mp4",
          blobExists: true,
          sizeBytes: 10_000_000,
          createdAt: "2026-01-01T00:00:00.000Z",
          status: "completed",
        },
      ],
      languageVersions: [
        {
          languageCode: "nl",
          version: 2,
          lifecycle: "current",
          url: "https://blob/nl-v2.mp4",
        },
      ],
      nowMs: now,
    });
    assert.equal(
      result.candidates.some((row) => row.assetId === "original" || row.assetId === "clean"),
      false
    );
    assert.equal(
      result.candidates.some((row) => row.languageCode === "nl" && row.versionNumber === 2),
      false
    );
  });

  it("selects old failed outputs in dry-run after retention window", () => {
    const result = selectCleanupDryRunCandidates({
      assets: [
        {
          id: "failed-lang",
          kind: "language",
          label: "Failed NL",
          languageCode: "nl",
          url: "https://blob/failed.mp4",
          blobExists: true,
          sizeBytes: 5_000_000,
          createdAt: "2026-01-01T00:00:00.000Z",
          status: "failed",
        },
      ],
      nowMs: now,
    });
    assert.equal(result.candidateCount, 1);
    assert.equal(result.candidates[0]?.reason, "failed_output_expired");
    assert.equal(result.bytesRecoverable, 5_000_000);
  });

  it("selects excess archived language versions beyond policy limit", () => {
    const result = selectCleanupDryRunCandidates({
      assets: [],
      languageVersions: [
        {
          languageCode: "nl",
          version: 2,
          lifecycle: "archived",
          url: "https://blob/nl-v2.mp4",
        },
        {
          languageCode: "nl",
          version: 1,
          lifecycle: "archived",
          url: "https://blob/nl-v1.mp4",
        },
      ],
      nowMs: now,
    });
    assert.equal(result.candidates.length, 1);
    assert.equal(result.candidates[0]?.versionNumber, 1);
    assert.equal(result.candidates[0]?.reason, "excess_archived_language");
  });

  it("exposes default retention policy constants", () => {
    assert.equal(STORAGE_RETENTION_POLICY.keepCurrentOriginal, true);
    assert.equal(STORAGE_RETENTION_POLICY.maxArchivedVersionsPerLanguage, 1);
    assert.equal(STORAGE_RETENTION_POLICY.failedOutputRetentionDays, 7);
  });
});
