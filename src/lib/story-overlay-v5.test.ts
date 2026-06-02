import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatLanguageVersionTitle,
  lifecycleBadgeLabelKey,
} from "@/lib/language-version-display";
import {
  buildStoryboardOverlayPreviewLines,
  storyboardPreviewHasContent,
} from "@/lib/storyboard-overlay-preview";
import {
  appendTextVersionNote,
  findTextVersionNote,
  parseTextVersionNotesJson,
} from "@/lib/text-version-notes";
import { computeExtendedStorageAuditMetrics } from "@/lib/storage-audit-extended";
import { resolveTextRerenderProgress } from "@/lib/text-language-render-progress";
import { splitDownloadOptionsBySection } from "@/lib/project-download-options";
import type { ProjectStorageAudit } from "@/types/storage-audit";

describe("story-overlay-v5 polish", () => {
  it("shows current and archived badge label keys", () => {
    assert.equal(lifecycleBadgeLabelKey("current"), "projectDetail.versions.currentBadge");
    assert.equal(lifecycleBadgeLabelKey("archived"), "projectDetail.versions.archivedBadge");
    assert.equal(formatLanguageVersionTitle("en", "English", 3), "🇬🇧 English v3");
  });

  it("persists version notes for text rerenders", () => {
    const notes = appendTextVersionNote(null, {
      version: 2,
      note: "Footer added",
      createdAt: "2026-06-02T00:00:00.000Z",
    });
    assert.equal(findTextVersionNote(notes, 2), "Footer added");
    assert.equal(parseTextVersionNotesJson(notes).length, 1);
  });

  it("calculates storage card totals from audit", () => {
    const audit: ProjectStorageAudit = {
      projectId: "p1",
      assets: [],
      blobCount: 4,
      totalSizeBytes: 30_000_000,
      breakdown: {
        originalBytes: 12_000_000,
        cleanBytes: 10_000_000,
        languageBytes: 8_000_000,
        segmentBytes: 0,
        previousFinalBytes: 0,
      },
      currentVersionCount: 3,
      archivedVersionCount: 1,
      activeStorageBytes: 24_000_000,
      archivedStorageBytes: 6_000_000,
      estimatedMonthlyStorageCostUsd: 0.02,
      estimatedTransferCostUsd: 0.01,
      retentionRecommendationIds: [],
      probedAt: new Date().toISOString(),
    };
    assert.equal(audit.activeStorageBytes + audit.archivedStorageBytes, 30_000_000);
    assert.equal(audit.currentVersionCount, 3);
    assert.equal(audit.archivedVersionCount, 1);
  });

  it("renders footer in storyboard preview order", () => {
    const lines = buildStoryboardOverlayPreviewLines(
      {
        template: "hero",
        heroText: "THIS ISN'T",
        title: "JUST AN APP.",
        subtitle: "IT'S A MOVEMENT.",
        extraLines: [],
        accentWords: "",
        lines: [],
        heroFinale: false,
        heroFinaleText: "",
        finaleFooter: "homecheff.eu",
        durationSeconds: 5,
        transitionDurationSeconds: 5,
      },
      { isFinalFrame: true }
    );
    assert.equal(storyboardPreviewHasContent(lines), true);
    assert.equal(lines.at(-1)?.kind, "footer");
    assert.equal(lines.at(-1)?.text, "homecheff.eu");
  });

  it("filters archived language history rows", () => {
    const options = [
      { id: "1", section: "primary" as const },
      { id: "2", section: "history" as const },
    ];
    const split = splitDownloadOptionsBySection(options as never);
    assert.equal(split.primary.length, 1);
    assert.equal(split.history.length, 1);
  });

  it("exposes rerender progress with estimated wait", () => {
    const view = resolveTextRerenderProgress({
      localPhase: "polling",
      finalExportStage: "overlay",
      isRebuildingFinalVideo: true,
    });
    assert.equal(view.phase, "running");
    assert.ok(view.estimatedWaitSeconds != null && view.estimatedWaitSeconds > 0);
    assert.equal(view.activeStepId, "building_overlay");
  });

  it("computes extended storage audit metrics", () => {
    const metrics = computeExtendedStorageAuditMetrics({
      audits: [
        {
          projectId: "a",
          assets: [
            {
              id: "1",
              kind: "original",
              label: "",
              url: "u1",
              blobExists: true,
              sizeBytes: 10_000_000,
              createdAt: null,
            },
            {
              id: "2",
              kind: "clean",
              label: "",
              url: "u2",
              blobExists: true,
              sizeBytes: 8_000_000,
              createdAt: null,
            },
            {
              id: "3",
              kind: "language",
              label: "",
              url: "u3",
              blobExists: true,
              sizeBytes: 6_000_000,
              createdAt: null,
            },
            {
              id: "4",
              kind: "previous_final",
              label: "",
              url: "u4",
              blobExists: true,
              sizeBytes: 9_000_000,
              createdAt: null,
            },
          ],
          blobCount: 4,
          totalSizeBytes: 33_000_000,
          breakdown: {
            originalBytes: 10_000_000,
            cleanBytes: 8_000_000,
            languageBytes: 6_000_000,
            segmentBytes: 0,
            previousFinalBytes: 9_000_000,
          },
          currentVersionCount: 2,
          archivedVersionCount: 2,
          activeStorageBytes: 24_000_000,
          archivedStorageBytes: 9_000_000,
          estimatedMonthlyStorageCostUsd: 0,
          estimatedTransferCostUsd: 0,
          retentionRecommendationIds: [],
          probedAt: new Date().toISOString(),
        },
      ],
    });
    assert.equal(metrics.averageVideoSizeBytes, 10_000_000);
    assert.equal(metrics.averageCleanVideoSizeBytes, 8_000_000);
    assert.equal(metrics.averageLanguageVersionSizeBytes, 6_000_000);
    assert.equal(metrics.averageTextRerenderSizeBytes, 9_000_000);
    assert.equal(metrics.expectedStorageBytesPer1000Projects, 33_000_000_000);
    assert.ok(metrics.estimatedBlobMonthlyCostUsd > 0);
  });
});
