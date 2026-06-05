import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertBundleSlotActionConsistency } from "@/lib/bundle-slot-actions";
import {
  buildBundleSlotOpenHref,
  resolveSelectedBundleVersion,
} from "@/lib/bundle-selected-version";
import {
  buildMotionVersionCatalogForProject,
  isExplicitMotionUrlSelectionInvalid,
  mergeMotionVersionCatalogs,
  resolveMotionSelectionFromUrl,
} from "@/lib/motion-version-catalog";
import {
  applyDetailVersionSelection,
  buildDetailVersionNavigationHref,
  isFailedParentWithCompletedRender,
  resolveDetailCatalogSelection,
  resolveDetailSlotCleanVideoUrl,
  resolveDetailSlotDownloadUrl,
} from "@/lib/project-detail-bundle-selection";

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
    durationSeconds: 20,
    renderVersions: [
      {
        id: RENDER_A,
        renderVersionNumber: 1,
        status: "completed",
        isDefault: true,
        versionNote: null,
        finalVideoUrl: "https://cdn.example/final-v1.mp4",
        cleanVideoUrl: "https://cdn.example/clean-v1.mp4",
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
    durationSeconds: 30,
    renderVersions: [
      {
        id: RENDER_B,
        renderVersionNumber: 1,
        status: "completed",
        isDefault: true,
        versionNote: "Extra tekstblok",
        finalVideoUrl: "https://cdn.example/final-v2.mp4",
        cleanVideoUrl: "https://cdn.example/clean-journey-30s.mp4",
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

function sameProjectTwoRenderCatalog() {
  return buildMotionVersionCatalogForProject({
    projectId: "p-same",
    exportOutputUrl: null,
    exportStatus: null,
    projectStatus: "completed",
    projectCleanUrl: null,
    renderVersions: [
      {
        id: "rv1",
        renderVersionNumber: 1,
        status: "completed",
        isDefault: false,
        versionNote: "20s",
        finalVideoUrl: "https://cdn.example/final-v1.mp4",
        cleanVideoUrl: "https://cdn.example/clean-v1.mp4",
        createdAt: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "rv2",
        renderVersionNumber: 2,
        status: "completed",
        isDefault: true,
        versionNote: "30s",
        finalVideoUrl: "https://cdn.example/final-v2.mp4",
        cleanVideoUrl: "https://cdn.example/clean-v2.mp4",
        createdAt: "2026-06-02T00:00:00.000Z",
      },
    ],
    languageExports: [],
    durationSeconds: 30,
  });
}

describe("Motion V22.7 — detail page bundle version switching", () => {
  it("detail loads full bundle catalog with all members", () => {
    const merged = journeyMergedCatalog();
    assert.equal(merged.languages.length, 1);
    assert.equal(merged.slotsByLanguage.nl?.length, 2);
    assert.equal(merged.slotsByLanguage.nl![0]!.sourceProjectId, PROJECT_A);
    assert.equal(merged.slotsByLanguage.nl![1]!.sourceProjectId, PROJECT_B);
  });

  it("detail shows all bundle versions, not only current project", () => {
    const merged = journeyMergedCatalog();
    const projectBCatalogOnly = buildMotionVersionCatalogForProject({
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
    assert.equal(projectBCatalogOnly.slotsByLanguage.nl?.length, 1);
    assert.equal(merged.slotsByLanguage.nl?.length, 2);
  });

  it("selector switches to another project render version via source project URL", () => {
    const merged = journeyMergedCatalog();
    const v2 = merged.slotsByLanguage.nl![1]!;
    const href = buildDetailVersionNavigationHref(v2);
    assert.match(href, new RegExp(`/videos/${PROJECT_B}`));
    assert.match(href, /sel=render%3A/);
    assert.match(href, new RegExp(`sel=render%3A${RENDER_B}`));
    assert.doesNotMatch(href, /ver=v2/);
  });

  it("URL updates to sel=render:{id}", () => {
    const merged = journeyMergedCatalog();
    const v2 = merged.slotsByLanguage.nl![1]!;
    assert.equal(buildBundleSlotOpenHref(v2), buildDetailVersionNavigationHref(v2));
  });

  it("direct sel URL restores selected version on merged catalog", () => {
    const merged = journeyMergedCatalog();
    const hit = resolveDetailCatalogSelection({
      catalog: merged,
      langFromUrl: null,
      versionFromUrl: null,
      selFromUrl: `render:${RENDER_B}`,
    });
    assert.equal(hit.invalidDeepLink, false);
    assert.equal(hit.selectedCatalogSlot?.renderVersionId, RENDER_B);
    assert.equal(hit.selectedCatalogSlot?.sourceProjectId, PROJECT_B);
    assert.equal(hit.selectedCatalogSlot?.finalVideoUrl, "https://cdn.example/final-v2.mp4");
  });

  it("bundle overview row click navigation uses applyDetailVersionSelection", () => {
    const merged = journeyMergedCatalog();
    const v1 = merged.slotsByLanguage.nl![0]!;
    let replaced: string | null = null;
    applyDetailVersionSelection(v1, (href) => {
      replaced = href;
    });
    assert.ok(replaced);
    assert.match(replaced!, new RegExp(`/videos/${PROJECT_A}`));
    assert.match(replaced!, new RegExp(`sel=render%3A${RENDER_A}`));
  });

  it("actions use selected slot for play and download", () => {
    const merged = journeyMergedCatalog();
    const v2 = merged.slotsByLanguage.nl![1]!;
    const selected = resolveSelectedBundleVersion({
      bundleKey: "the-journey",
      catalog: merged,
      languageCode: "nl",
      selectionKey: v2.selectionKey,
    });
    assert.ok(selected);
    assertBundleSlotActionConsistency(selected!);
    assert.equal(selected!.finalVideoUrl, "https://cdn.example/final-v2.mp4");
    assert.equal(
      resolveDetailSlotDownloadUrl(v2),
      selected!.downloadUrl
    );
  });

  it("failed parent + completed render still actionable", () => {
    const merged = journeyMergedCatalog();
    const v2 = merged.slotsByLanguage.nl![1]!;
    assert.equal(
      isFailedParentWithCompletedRender({
        parentProjectStatus: "failed",
        selectedSlot: v2,
      }),
      true
    );
    const selected = resolveSelectedBundleVersion({
      bundleKey: "journey",
      catalog: merged,
      languageCode: "nl",
      selectionKey: v2.selectionKey,
    });
    assert.ok(selected?.playable);
  });

  it("invalid selection shows warning state (no silent latest fallback)", () => {
    const merged = journeyMergedCatalog();
    const hit = resolveDetailCatalogSelection({
      catalog: merged,
      langFromUrl: null,
      versionFromUrl: null,
      selFromUrl: "render:missing-id",
    });
    assert.equal(hit.invalidDeepLink, true);
    assert.equal(hit.selectedCatalogSlot, null);
    assert.equal(
      isExplicitMotionUrlSelectionInvalid(merged, null, null, "render:missing-id"),
      true
    );
    assert.equal(
      resolveMotionSelectionFromUrl(merged, null, null, "render:missing-id"),
      null
    );
  });

  it("Journey regression — V1 and V2 clean videos stay aligned with duration", () => {
    const merged = journeyMergedCatalog();
    const v1 = merged.slotsByLanguage.nl![0]!;
    const v2 = merged.slotsByLanguage.nl![1]!;
    assert.equal(v1.durationSeconds, 20);
    assert.equal(resolveDetailSlotCleanVideoUrl(v1), "https://cdn.example/clean-v1.mp4");
    assert.equal(v1.finalVideoUrl, "https://cdn.example/final-v1.mp4");

    assert.equal(v2.durationSeconds, 30);
    assert.equal(
      resolveDetailSlotCleanVideoUrl(v2),
      "https://cdn.example/clean-journey-30s.mp4"
    );
    assert.equal(v2.finalVideoUrl, "https://cdn.example/final-v2.mp4");
    assert.notEqual(resolveDetailSlotCleanVideoUrl(v2), resolveDetailSlotCleanVideoUrl(v1));
  });

  it("same-project V1/V2 — no fallback to V1 clean when V2 selected", () => {
    const catalog = sameProjectTwoRenderCatalog();
    const v2 = catalog.slotsByLanguage.nl!.find((s) => s.renderVersionId === "rv2")!;
    assert.equal(resolveDetailSlotCleanVideoUrl(v2), "https://cdn.example/clean-v2.mp4");
    assert.equal(v2.finalVideoUrl, "https://cdn.example/final-v2.mp4");
    const v1 = catalog.slotsByLanguage.nl!.find((s) => s.renderVersionId === "rv1")!;
    assert.equal(resolveDetailSlotCleanVideoUrl(v1), "https://cdn.example/clean-v1.mp4");
    assert.equal(v1.finalVideoUrl, "https://cdn.example/final-v1.mp4");
    assert.notEqual(v2.cleanVideoUrl, v1.cleanVideoUrl);
  });

  it("missing clean on selected slot returns null (no cross-version fallback)", () => {
    const catalog = buildMotionVersionCatalogForProject({
      projectId: "p1",
      exportOutputUrl: "https://cdn.example/final.mp4",
      exportStatus: "completed",
      projectStatus: "completed",
      projectCleanUrl: "https://cdn.example/project-clean.mp4",
      renderVersions: [
        {
          id: "rv-no-clean",
          renderVersionNumber: 1,
          status: "completed",
          isDefault: true,
          versionNote: null,
          finalVideoUrl: "https://cdn.example/final.mp4",
          cleanVideoUrl: null,
          createdAt: "2026-06-01T00:00:00.000Z",
        },
      ],
      languageExports: [],
    });
    const slot = catalog.slotsByLanguage.nl![0]!;
    assert.equal(resolveDetailSlotCleanVideoUrl(slot), null);
  });
});
