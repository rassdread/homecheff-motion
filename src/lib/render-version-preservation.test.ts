import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { readFullRerenderAudit } from "@/lib/full-rerender-audit";
import { projectMatchesCompletedGalleryFilter } from "@/server/animation-projects/gallery-completed-where";
import { buildProjectVideoVersionCatalog } from "@/lib/project-video-versions";

/**
 * Models AnimationProject.instantPreviousFinalVideoUrl: one slot, overwritten on each rerender start.
 */
function simulatePreviousFinalSlot(
  finals: Array<{ startRerender: boolean; successUrl: string | null }>
): { exportUrl: string | null; previousUrl: string | null } {
  let exportUrl: string | null = null;
  let previousUrl: string | null = null;

  for (const step of finals) {
    if (step.startRerender && exportUrl) {
      previousUrl = exportUrl;
      exportUrl = null;
    }
    if (step.successUrl) {
      exportUrl = step.successUrl;
    }
  }
  return { exportUrl, previousUrl };
}

describe("render version preservation (documented behavior)", () => {
  it("project-level previous slot is still one deep; render version rows keep full chain", () => {
    const end = simulatePreviousFinalSlot([
      { startRerender: false, successUrl: "https://blob/v1.mp4" },
      { startRerender: true, successUrl: "https://blob/v2.mp4" },
      { startRerender: true, successUrl: "https://blob/v3.mp4" },
    ]);
    assert.equal(end.previousUrl, "https://blob/v2.mp4");
    const catalog = buildProjectVideoVersionCatalog({
      projectId: "p1",
      originalVideoUrl: end.exportUrl,
      cleanVideoUrl: null,
      languageExports: [],
      renderVersions: [
        {
          id: "rv-1",
          renderVersionNumber: 1,
          kind: "initial",
          status: "completed",
          isDefault: false,
          versionNote: null,
          finalVideoUrl: "https://blob/v1.mp4",
          createdAt: "2026-01-01T00:00:00.000Z",
          completedAt: "2026-01-01T01:00:00.000Z",
        },
        {
          id: "rv-2",
          renderVersionNumber: 2,
          kind: "full_rerender",
          status: "completed",
          isDefault: false,
          versionNote: null,
          finalVideoUrl: "https://blob/v2.mp4",
          createdAt: "2026-02-01T00:00:00.000Z",
          completedAt: "2026-02-01T01:00:00.000Z",
        },
        {
          id: "rv-3",
          renderVersionNumber: 3,
          kind: "full_rerender",
          status: "completed",
          isDefault: true,
          versionNote: null,
          finalVideoUrl: "https://blob/v3.mp4",
          createdAt: "2026-03-01T00:00:00.000Z",
          completedAt: "2026-03-01T01:00:00.000Z",
        },
      ],
    });
    assert.equal(catalog.history.some((i) => i.id === "render-rv-1"), true);
    assert.equal(catalog.history.some((i) => i.id === "render-rv-2"), true);
  });

  it("instantPreviousFinalVideoUrl slot keeps only the immediate predecessor (Case B)", () => {
    const end = simulatePreviousFinalSlot([
      { startRerender: false, successUrl: "https://blob/v1.mp4" },
      { startRerender: true, successUrl: "https://blob/v2.mp4" },
      { startRerender: true, successUrl: "https://blob/v3.mp4" },
    ]);
    assert.equal(end.exportUrl, "https://blob/v3.mp4");
    assert.equal(end.previousUrl, "https://blob/v2.mp4");
    assert.notEqual(end.previousUrl, "https://blob/v1.mp4");
  });

  it("mid-rerender remains visible in completed gallery via archived previous URL", () => {
    assert.equal(
      projectMatchesCompletedGalleryFilter({
        exports: [{ outputVideoUrl: null }],
        instantPreviousFinalVideoUrl: "https://blob/v2.mp4",
      }),
      true
    );
  });

  it("failed rerender with cleared export still has playable archived URL in catalog", () => {
    const catalog = buildProjectVideoVersionCatalog({
      projectId: "proj-fail",
      originalVideoUrl: null,
      cleanVideoUrl: null,
      languageExports: [],
      previousFinalVideoUrl: "https://blob/v2.mp4",
      rebuildCount: 2,
      rebuiltAt: "2026-06-01T12:00:00.000Z",
    });
    const archived = catalog.history.find((row) => row.id === "text-archived-previous");
    assert.ok(archived?.outputVideoUrl?.includes("v2.mp4"));
    assert.equal(archived?.downloadHref.includes("previous_final"), true);
  });

  it("multiple completed ProjectRenderVersion rows surface in version catalog history", () => {
    const catalog = buildProjectVideoVersionCatalog({
      projectId: "proj-rv",
      originalVideoUrl: "https://blob/v3.mp4",
      cleanVideoUrl: null,
      languageExports: [],
      renderVersions: [
        {
          id: "rv-3",
          renderVersionNumber: 3,
          kind: "full_rerender",
          status: "completed",
          isDefault: true,
          versionNote: null,
          finalVideoUrl: "https://blob/v3.mp4",
          createdAt: "2026-06-03T00:00:00.000Z",
          completedAt: "2026-06-03T01:00:00.000Z",
        },
        {
          id: "rv-2",
          renderVersionNumber: 2,
          kind: "full_rerender",
          status: "completed",
          isDefault: false,
          versionNote: "note",
          finalVideoUrl: "https://blob/v2.mp4",
          createdAt: "2026-06-02T00:00:00.000Z",
          completedAt: "2026-06-02T01:00:00.000Z",
        },
        {
          id: "rv-1",
          renderVersionNumber: 1,
          kind: "initial",
          status: "completed",
          isDefault: false,
          versionNote: null,
          finalVideoUrl: "https://blob/v1.mp4",
          createdAt: "2026-06-01T00:00:00.000Z",
          completedAt: "2026-06-01T01:00:00.000Z",
        },
      ],
    });
    assert.equal(catalog.primary.some((i) => i.id === "render-rv-3"), true);
    assert.equal(catalog.history.some((i) => i.id === "render-rv-2"), true);
    assert.equal(catalog.history.some((i) => i.id === "render-rv-1"), true);
  });

  it("full rerender audit JSON archives previous final and segment URLs for the run", () => {
    const audit = readFullRerenderAudit({
      fullRerender: {
        rebuildType: "full_rerender",
        status: "running",
        startedAt: "2026-06-01T00:00:00.000Z",
        previousFinalVideoUrl: "https://blob/v2.mp4",
        previousTransitions: [{ order: 0, outputVideoUrl: "https://seg/0.mp4", providerJobId: "j1" }],
        newProviderJobsCreated: true,
      },
    });
    assert.equal(audit?.previousFinalVideoUrl, "https://blob/v2.mp4");
    assert.equal(audit?.previousTransitions?.[0]?.outputVideoUrl, "https://seg/0.mp4");
  });
});

describe("full rerender wiring (static audit)", () => {
  const fullRerenderSrc = readFileSync(
    new URL("../server/instant-premium/full-rerender-project.ts", import.meta.url),
    "utf8"
  );
  const commitSrc = readFileSync(
    new URL("../server/instant-premium/final-video-export-commit.ts", import.meta.url),
    "utf8"
  );
  const mergeSrc = readFileSync(
    new URL("../server/instant-premium/merge-instant-project.ts", import.meta.url),
    "utf8"
  );

  it("full rerender creates pending render version and uses versioned blob paths on merge", () => {
    assert.match(fullRerenderSrc, /createPendingFullRerenderVersion/);
    assert.match(fullRerenderSrc, /sealDefaultRenderVersion/);
    assert.match(mergeSrc, /resolveFinalBlobVersionForUpload/);
    assert.match(mergeSrc, /readPendingFullRerender/);
  });

  it("merge-only text rebuild deletes previous blob only when not in version history", () => {
    assert.match(commitSrc, /scheduleDeleteOldFinalBlob/);
    assert.match(commitSrc, /isVideoUrlReferencedByVersionHistory/);
    assert.doesNotMatch(fullRerenderSrc, /scheduleDeleteOldFinalBlob/);
  });

  it("merge-only rebuild failure restores export outputVideoUrl to previous final", () => {
    assert.match(commitSrc, /outputVideoUrl: previousFinalUrl/);
    assert.match(commitSrc, /status: "completed"/);
  });
});
