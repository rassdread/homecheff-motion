import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { finalBlobPathname } from "@/lib/final-video-storage";
import { buildMotionVersionCatalogForProject } from "@/lib/motion-version-catalog";
import {
  resolveFinalBlobVersionForUpload,
  readPendingFullRerender,
  mergeAuditWithPendingFullRerender,
} from "@/server/instant-premium/render-version-service";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");

function readSrc(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("Motion text rerender versioning", () => {
  it("rebuild-final-video seals prior version and creates pending text rerender row", () => {
    const src = readSrc("src/server/instant-premium/rebuild-final-video.ts");
    assert.match(src, /sealDefaultRenderVersion/);
    assert.match(src, /createPendingTextRerenderVersion/);
    assert.match(src, /pendingFullRerender/);
    assert.match(src, /resolveVersionNameAgainstBundle/);
  });

  it("export commit completes pending render version on text rebuild", () => {
    const src = readSrc("src/server/instant-premium/final-video-export-commit.ts");
    assert.match(src, /completePendingFullRerenderVersion/);
    assert.match(src, /lastTextRerender/);
    assert.match(src, /failPendingFullRerenderVersion/);
  });

  it("render-version-service defines text_rerender kind", () => {
    const src = readSrc("src/server/instant-premium/render-version-service.ts");
    assert.match(src, /createPendingTextRerenderVersion/);
    assert.match(src, /kind: "text_rerender"/);
  });

  it("uses render version number for text rerender blob path when pending", () => {
    const version = resolveFinalBlobVersionForUpload({
      pendingRenderVersionNumber: 2,
      isMergeOnlyTextRebuild: true,
      nextTextRebuildCount: 5,
    });
    assert.equal(version, 2);
    assert.equal(finalBlobPathname("proj-a", 2), "motion/final/proj-a/final-v2.mp4");
  });

  it("does not use legacy final.mp4 when pending text rerender version exists", () => {
    const version = resolveFinalBlobVersionForUpload({
      pendingRenderVersionNumber: 3,
      isMergeOnlyTextRebuild: true,
      nextTextRebuildCount: 1,
    });
    assert.notEqual(finalBlobPathname("proj-a", version), "motion/final/proj-a/final.mp4");
  });

  it("bundle catalog shows multiple render versions including text rerender", () => {
    const catalog = buildMotionVersionCatalogForProject({
      projectId: "proj-1",
      exportOutputUrl: "https://cdn.example/final-v2.mp4",
      exportStatus: "completed",
      projectStatus: "completed",
      projectCleanUrl: "https://cdn.example/clean-v2.mp4",
      renderVersions: [
        {
          id: "rv1",
          renderVersionNumber: 1,
          status: "completed",
          isDefault: false,
          versionNote: "NL V1",
          finalVideoUrl: "https://cdn.example/final-v1.mp4",
          cleanVideoUrl: "https://cdn.example/clean-v1.mp4",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "rv2",
          renderVersionNumber: 2,
          status: "completed",
          isDefault: true,
          versionNote: "Extra footer",
          finalVideoUrl: "https://cdn.example/final-v2.mp4",
          cleanVideoUrl: "https://cdn.example/clean-v2.mp4",
          createdAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      languageExports: [],
      locale: "nl",
    });
    const nlSlots = catalog.slotsByLanguage.nl ?? [];
    assert.equal(nlSlots.length, 2);
    assert.equal(nlSlots[0]!.finalVideoUrl, "https://cdn.example/final-v1.mp4");
    assert.equal(nlSlots[1]!.finalVideoUrl, "https://cdn.example/final-v2.mp4");
    assert.match(nlSlots[1]!.displayLabel, /Extra footer|V2/);
  });

  it("previous version final URL differs from new text rerender version URL", () => {
    const v1 = "https://cdn.example/final-v1.mp4";
    const v2 = "https://cdn.example/final-v2.mp4";
    assert.notEqual(v1, v2);
    const catalog = buildMotionVersionCatalogForProject({
      projectId: "proj-1",
      exportOutputUrl: v2,
      exportStatus: "completed",
      projectStatus: "completed",
      projectCleanUrl: "https://cdn.example/clean-v2.mp4",
      renderVersions: [
        {
          id: "rv1",
          renderVersionNumber: 1,
          status: "completed",
          isDefault: false,
          versionNote: null,
          finalVideoUrl: v1,
          cleanVideoUrl: "https://cdn.example/clean-v1.mp4",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "rv2",
          renderVersionNumber: 2,
          status: "completed",
          isDefault: true,
          versionNote: "Tekst update",
          finalVideoUrl: v2,
          cleanVideoUrl: "https://cdn.example/clean-v2.mp4",
          createdAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      languageExports: [],
    });
    const urls = (catalog.slotsByLanguage.nl ?? []).map((s) => s.finalVideoUrl);
    assert.deepEqual(urls, [v1, v2]);
  });

  it("clean video URL is preserved per render version slot", () => {
    const catalog = buildMotionVersionCatalogForProject({
      projectId: "proj-1",
      exportOutputUrl: "https://cdn.example/final-v2.mp4",
      exportStatus: "completed",
      projectStatus: "completed",
      projectCleanUrl: "https://cdn.example/clean-v2.mp4",
      renderVersions: [
        {
          id: "rv2",
          renderVersionNumber: 2,
          status: "completed",
          isDefault: true,
          versionNote: "Footer",
          finalVideoUrl: "https://cdn.example/final-v2.mp4",
          cleanVideoUrl: "https://cdn.example/clean-v2.mp4",
          createdAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      languageExports: [],
    });
    const slot = catalog.slotsByLanguage.nl?.[0];
    assert.equal(slot?.cleanVideoUrl, "https://cdn.example/clean-v2.mp4");
  });

  it("pending audit tracks render version for merge blob upload", () => {
    const audit = mergeAuditWithPendingFullRerender(null, { type: "final_video_rebuild" }, {
      renderVersionId: "rv-pending",
      renderVersionNumber: 4,
      startedAt: "2026-06-04T12:00:00.000Z",
    });
    const pending = readPendingFullRerender(audit);
    assert.equal(pending?.renderVersionId, "rv-pending");
    assert.equal(pending?.renderVersionNumber, 4);
  });

  it("rebuild route passes versionNote into rebuild service", () => {
    const src = readSrc("src/app/api/instant-premium/projects/[id]/rebuild-final-video/route.ts");
    assert.match(src, /rebuildInstantPremiumFinalVideo\(id,\s*\{/);
    assert.match(src, /versionNote/);
  });

  it("render history panel labels text rerender kind", () => {
    const src = readSrc("src/components/instant/render-history-panel.tsx");
    assert.match(src, /text_rerender/);
    assert.match(src, /kindTextRerender/);
  });

  it("concept editor uses render new version label not copy-as-concept", () => {
    const src = readSrc("src/components/instant/full-rerender-editor.tsx");
    assert.match(src, /projects\.concept\.renderNewVersion/);
    assert.doesNotMatch(src, /Kopieer als concept/);
  });

  it("text rerender modal uses Tekstversie renderen label key", () => {
    const src = readSrc("src/components/instant/text-rerender-editor-modal.tsx");
    assert.match(src, /instant\.textRerender\.render/);
  });

  it("blob cleanup skips URLs referenced by render version history", () => {
    const src = readSrc("src/server/instant-premium/final-video-export-commit.ts");
    assert.match(src, /isVideoUrlReferencedByVersionHistory/);
    assert.match(src, /referenced_by_render_version_history/);
  });
});
