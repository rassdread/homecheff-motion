import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertBundleSlotActionConsistency } from "@/lib/bundle-slot-actions";
import {
  buildBundleSlotDownloadUrl,
  buildBundleSlotOpenHref,
  resolveSelectedBundleVersion,
} from "@/lib/bundle-selected-version";
import {
  buildMotionVersionCatalogForProject,
  isExplicitMotionUrlSelectionInvalid,
  mergeMotionVersionCatalogs,
  resolveMotionSelectionFromUrl,
} from "@/lib/motion-version-catalog";
import { resolveProjectVideoDownload } from "@/server/animation-projects/resolve-video-download";

const PROJECT_A = "cmpxgvdr80001jp04bxnzv7sn";
const PROJECT_B = "cmpyb5kmm0001k1049zozow8z";
const RENDER_A = "rv-journey-a";
const RENDER_B = "rv-journey-b";

function journeyMergedCatalog() {
  const catalogA = buildMotionVersionCatalogForProject({
    projectId: PROJECT_A,
    exportOutputUrl: "https://cdn.example/journey-a.mp4",
    exportStatus: "completed",
    projectStatus: "completed",
    projectCleanUrl: null,
    renderVersions: [
      {
        id: RENDER_A,
        renderVersionNumber: 1,
        status: "completed",
        isDefault: true,
        versionNote: null,
        finalVideoUrl: "https://cdn.example/journey-a-render.mp4",
        cleanVideoUrl: null,
        createdAt: "2026-06-03T10:00:00.000Z",
      },
    ],
    languageExports: [],
  });
  const catalogB = buildMotionVersionCatalogForProject({
    projectId: PROJECT_B,
    exportOutputUrl: null,
    exportStatus: null,
    projectStatus: "failed",
    projectCleanUrl: null,
    renderVersions: [
      {
        id: RENDER_B,
        renderVersionNumber: 1,
        status: "completed",
        isDefault: true,
        versionNote: null,
        finalVideoUrl: "https://cdn.example/journey-b-render.mp4",
        cleanVideoUrl: null,
        createdAt: "2026-06-04T10:00:00.000Z",
      },
    ],
    languageExports: [],
  });
  return mergeMotionVersionCatalogs([
    { catalog: catalogA, memberCreatedAt: "2026-06-03T10:00:00.000Z" },
    { catalog: catalogB, memberCreatedAt: "2026-06-04T10:00:00.000Z" },
  ]);
}

const sameProjectRenders = [
  {
    id: "rv1",
    renderVersionNumber: 1,
    status: "completed",
    isDefault: false,
    versionNote: "First",
    finalVideoUrl: "https://cdn.example/same-v1.mp4",
    cleanVideoUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "rv2",
    renderVersionNumber: 2,
    status: "completed",
    isDefault: true,
    versionNote: "Second",
    finalVideoUrl: "https://cdn.example/same-v2.mp4",
    cleanVideoUrl: null,
    createdAt: "2026-01-02T00:00:00.000Z",
  },
];

describe("Motion V22.6 — bundle version deep links and download alignment", () => {
  it("merged bundle preserves sourceRenderVersionNumber while renumbering catalog display", () => {
    const merged = journeyMergedCatalog();
    const nl = merged.slotsByLanguage.nl ?? [];
    assert.equal(nl.length, 2);
    assert.equal(nl[0]!.catalogVersionNumber, 1);
    assert.equal(nl[1]!.catalogVersionNumber, 2);
    assert.equal(nl[0]!.sourceRenderVersionNumber, 1);
    assert.equal(nl[1]!.sourceRenderVersionNumber, 1);
    assert.equal(nl[0]!.sourceProjectId, PROJECT_A);
    assert.equal(nl[1]!.sourceProjectId, PROJECT_B);
  });

  it("openHref for merged NL V2 uses sel=render and Project B (not ver=v2)", () => {
    const merged = journeyMergedCatalog();
    const v2 = merged.slotsByLanguage.nl![1]!;
    const href = buildBundleSlotOpenHref(v2);
    assert.match(href, new RegExp(`/videos/${PROJECT_B}`));
    assert.match(href, /sel=render%3A/);
    assert.match(href, new RegExp(`sel=render%3A${RENDER_B}`));
    assert.doesNotMatch(href, /ver=v2/);
  });

  it("detail page resolves sel=render to correct slot on per-project catalog", () => {
    const projectBCatalog = buildMotionVersionCatalogForProject({
      projectId: PROJECT_B,
      exportOutputUrl: null,
      exportStatus: null,
      projectStatus: "failed",
      projectCleanUrl: null,
      renderVersions: [
        {
          id: RENDER_B,
          renderVersionNumber: 1,
          status: "completed",
          isDefault: true,
          versionNote: null,
          finalVideoUrl: "https://cdn.example/journey-b-render.mp4",
          cleanVideoUrl: null,
          createdAt: "2026-06-04T10:00:00.000Z",
        },
      ],
      languageExports: [],
    });
    const hit = resolveMotionSelectionFromUrl(
      projectBCatalog,
      null,
      null,
      `render:${RENDER_B}`
    );
    assert.ok(hit);
    assert.equal(hit!.slot.sourceRenderVersionNumber, 1);
    assert.equal(hit!.slot.finalVideoUrl, "https://cdn.example/journey-b-render.mp4");
  });

  it("invalid sel shows warning (no silent fallback)", () => {
    const catalog = buildMotionVersionCatalogForProject({
      projectId: "p1",
      exportOutputUrl: null,
      exportStatus: null,
      projectStatus: "completed",
      projectCleanUrl: null,
      renderVersions: sameProjectRenders,
      languageExports: [],
    });
    assert.equal(
      isExplicitMotionUrlSelectionInvalid(catalog, null, null, "render:missing"),
      true
    );
    assert.equal(resolveMotionSelectionFromUrl(catalog, null, null, "render:missing"), null);
  });

  it("legacy lang+ver resolves source render version on per-project catalog", () => {
    const catalog = buildMotionVersionCatalogForProject({
      projectId: PROJECT_B,
      exportOutputUrl: null,
      exportStatus: null,
      projectStatus: "failed",
      projectCleanUrl: null,
      renderVersions: [
        {
          id: RENDER_B,
          renderVersionNumber: 1,
          status: "completed",
          isDefault: true,
          versionNote: null,
          finalVideoUrl: "https://cdn.example/journey-b-render.mp4",
          cleanVideoUrl: null,
          createdAt: "2026-06-04T10:00:00.000Z",
        },
      ],
      languageExports: [],
    });
    const hit = resolveMotionSelectionFromUrl(catalog, "nl", "v1");
    assert.ok(hit);
    assert.equal(hit!.slot.renderVersionId, RENDER_B);
    assert.equal(
      isExplicitMotionUrlSelectionInvalid(catalog, "nl", "v2"),
      true
    );
  });

  it("download uses renderVersionId finalVideoUrl when export is null", () => {
    const project = {
      id: PROJECT_B,
      status: "failed",
      instantPreviousFinalVideoUrl: null,
      transitions: [],
      exports: [{ outputVideoUrl: null, status: "failed" }],
      languageExports: [],
      renderVersions: [
        {
          id: RENDER_B,
          renderVersionNumber: 1,
          status: "completed",
          finalVideoUrl: "https://cdn.example/journey-b-render.mp4",
        },
      ],
    } as Parameters<typeof resolveProjectVideoDownload>[0];

    const resolved = resolveProjectVideoDownload(
      project,
      undefined,
      undefined,
      undefined,
      undefined,
      RENDER_B
    );
    assert.equal(resolved?.sourceUrl, "https://cdn.example/journey-b-render.mp4");
    assert.match(resolved?.filename ?? "", /-v1\.mp4$/);
  });

  it("download uses languageExportId outputVideoUrl", () => {
    const project = {
      id: "p-lang",
      status: "completed",
      instantPreviousFinalVideoUrl: null,
      transitions: [],
      exports: [],
      languageExports: [
        {
          id: "le1",
          languageCode: "en",
          status: "completed",
          version: 2,
          outputVideoUrl: "https://cdn.example/en-v2.mp4",
        },
      ],
      renderVersions: [],
    } as Parameters<typeof resolveProjectVideoDownload>[0];

    const resolved = resolveProjectVideoDownload(
      project,
      undefined,
      undefined,
      undefined,
      "le1"
    );
    assert.equal(resolved?.sourceUrl, "https://cdn.example/en-v2.mp4");
  });

  it("journey regression — V1 and V2 play/download/open stay aligned", () => {
    const merged = journeyMergedCatalog();
    for (const catalogVersion of [1, 2] as const) {
      const slot = merged.slotsByLanguage.nl!.find(
        (s) => s.catalogVersionNumber === catalogVersion
      )!;
      const selected = resolveSelectedBundleVersion({
        bundleKey: "the-journey",
        catalog: merged,
        languageCode: "nl",
        selectionKey: slot.selectionKey,
      });
      assert.ok(selected);
      assert.equal(selected!.playable, true);
      assert.equal(selected!.finalVideoUrl, slot.finalVideoUrl);
      assert.match(selected!.downloadUrl, /renderVersionId=/);
      assert.match(selected!.openHref, /sel=render%3A/);
      assertBundleSlotActionConsistency(selected!);
    }
  });

  it("same-project V1/V2 — play and download target each render finalVideoUrl", () => {
    const catalog = buildMotionVersionCatalogForProject({
      projectId: "p-multi",
      exportOutputUrl: "https://cdn.example/latest-export.mp4",
      exportStatus: "completed",
      projectStatus: "completed",
      projectCleanUrl: null,
      renderVersions: sameProjectRenders,
      languageExports: [],
    });

    for (const version of [1, 2] as const) {
      const slot = catalog.slotsByLanguage.nl!.find(
        (s) => s.sourceRenderVersionNumber === version
      )!;
      const selected = resolveSelectedBundleVersion({
        bundleKey: "bk-multi",
        catalog,
        languageCode: "nl",
        selectionKey: slot.selectionKey,
      });
      assert.ok(selected);
      assert.equal(
        selected!.finalVideoUrl,
        version === 1
          ? "https://cdn.example/same-v1.mp4"
          : "https://cdn.example/same-v2.mp4"
      );
      assert.match(selected!.downloadUrl, new RegExp(`renderVersionId=${version === 1 ? "rv1" : "rv2"}`));
      assert.doesNotMatch(selected!.downloadUrl, /latest-export/);
      assertBundleSlotActionConsistency(selected!);
    }
  });

  it("does not fall back to latest export when explicit renderVersionId is invalid", () => {
    const project = {
      id: "p1",
      status: "completed",
      instantPreviousFinalVideoUrl: null,
      transitions: [],
      exports: [{ outputVideoUrl: "https://cdn.example/latest.mp4", status: "completed" }],
      languageExports: [],
      renderVersions: [
        {
          id: "rv1",
          renderVersionNumber: 1,
          status: "completed",
          finalVideoUrl: "https://cdn.example/v1.mp4",
        },
      ],
    } as Parameters<typeof resolveProjectVideoDownload>[0];

    assert.equal(
      resolveProjectVideoDownload(project, undefined, undefined, undefined, undefined, "missing"),
      null
    );
  });
});
