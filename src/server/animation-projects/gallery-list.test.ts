import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mapPrismaRowToAnimationProjectListItem,
  type GalleryListPrismaRow,
} from "@/server/animation-projects/gallery-list";
import { normalizeGalleryRebuildMeta } from "@/server/animation-projects/gallery-list-rebuild-meta";
import { isPrismaMissingColumnError } from "@/server/animation-projects/prisma-schema-compat";

function baseRow(overrides: Partial<GalleryListPrismaRow> = {}): GalleryListPrismaRow {
  return {
    id: "proj-1",
    createdAt: new Date("2026-01-01T12:00:00.000Z"),
    updatedAt: new Date("2026-01-02T12:00:00.000Z"),
    status: "completed",
    projectType: "instant_premium",
    presetId: "standard",
    intent: "cinematic",
    advancedSettingsEnabled: false,
    viduResolution: "720p",
    viduDurationSeconds: 4,
    estimatedCredits: 10,
    images: [{ previewUrl: "https://example.com/thumb.jpg" }],
    _count: { images: 3, transitions: 2 },
    transitions: [
      { status: "completed", outputVideoUrl: "https://example.com/seg1.mp4" },
      { status: "completed", outputVideoUrl: "https://example.com/seg2.mp4" },
    ],
    exports: [
      {
        status: "completed",
        progress: 100,
        outputVideoUrl: "https://example.com/final.mp4",
        errorMessage: null,
      },
    ],
    ...overrides,
  };
}

describe("gallery list rebuild metadata", () => {
  it("defaults missing rebuild fields to safe values", () => {
    const meta = normalizeGalleryRebuildMeta(baseRow());
    assert.equal(meta.rebuildCount, 0);
    assert.equal(meta.rebuildStatus, null);
    assert.equal(meta.rebuiltAt, null);
  });

  it("maps legacy project without rebuild metadata", () => {
    const item = mapPrismaRowToAnimationProjectListItem(baseRow(), { includeOwnerEmail: false });
    assert.equal(item.id, "proj-1");
    assert.equal(item.status, "completed");
    assert.ok(item.latestExport?.outputVideoUrl?.includes("final.mp4"));
  });

  it("maps rendering project with final URL to completed for gallery badge", () => {
    const item = mapPrismaRowToAnimationProjectListItem(
      baseRow({
        status: "rendering",
        exports: [
          {
            status: "rendering",
            progress: 100,
            outputVideoUrl: "https://example.com/final.mp4",
            errorMessage: null,
          },
        ],
      }),
      { includeOwnerEmail: false }
    );
    assert.equal(item.status, "completed");
    assert.equal(item.latestExport?.status, "completed");
  });

  it("maps failed project with export error", () => {
    const item = mapPrismaRowToAnimationProjectListItem(
      baseRow({
        status: "failed",
        exports: [
          {
            status: "failed",
            progress: 0,
            outputVideoUrl: null,
            errorMessage: "merge failed",
          },
        ],
      }),
      { includeOwnerEmail: false }
    );
    assert.equal(item.status, "failed");
    assert.equal(item.latestExport?.errorMessage, "merge failed");
    assert.equal(item.latestExport?.outputVideoUrl, null);
  });

  it("maps completed project with rebuild count for cache bust", () => {
    const item = mapPrismaRowToAnimationProjectListItem(
      baseRow({
        instantFinalRebuildCount: 2,
        instantFinalRebuiltAt: new Date("2026-05-19T15:00:00.000Z"),
        instantFinalRebuildStatus: null,
      }),
      { includeOwnerEmail: false }
    );
    assert.ok(item.latestExport?.outputVideoUrl?.includes("v=2"));
  });

  it("maps mid full rerender: stays in gallery with generating status and archived final", () => {
    const item = mapPrismaRowToAnimationProjectListItem(
      baseRow({
        status: "generating",
        instantPreviousFinalVideoUrl: "https://example.com/previous-final.mp4",
        exports: [
          {
            status: "queued",
            progress: 0,
            outputVideoUrl: null,
            errorMessage: null,
          },
        ],
        transitions: [
          { status: "queued", outputVideoUrl: null },
          { status: "queued", outputVideoUrl: null },
        ],
      }),
      { includeOwnerEmail: false }
    );
    assert.equal(item.status, "generating");
    assert.equal(item.latestExport?.outputVideoUrl, null);
    assert.ok(item.previousFinalVideoUrl?.includes("previous-final.mp4"));
  });

  it("maps project actively rebuilding final video", () => {
    const item = mapPrismaRowToAnimationProjectListItem(
      baseRow({
        status: "rendering",
        instantFinalRebuildCount: 1,
        instantFinalRebuildStatus: "running",
        exports: [
          {
            status: "rendering",
            progress: 75,
            outputVideoUrl: "https://example.com/final.mp4",
            errorMessage: null,
          },
        ],
      }),
      { includeOwnerEmail: false }
    );
    assert.ok(item.latestExport?.outputVideoUrl?.includes("final.mp4"));
  });
});

describe("prisma schema compat", () => {
  it("detects missing column message patterns", () => {
    assert.equal(
      isPrismaMissingColumnError(new Error('column "instantFinalRebuildCount" does not exist')),
      true
    );
  });
});
