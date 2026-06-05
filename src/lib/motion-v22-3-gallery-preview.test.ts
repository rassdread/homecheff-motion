import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildBundlePlayKey,
  buildBundleSlotDownloadUrl,
  buildBundleSlotOpenHref,
  resolveSelectedBundleVersion,
  resolveThumbnailForSlot,
} from "@/lib/bundle-selected-version";
import { resolveBundleDisplayThumbnail } from "@/lib/bundle-thumbnail-cache";
import { buildMotionVersionCatalogForProject } from "@/lib/motion-version-catalog";
import { groupProjectsIntoBundles as groupBundles } from "@/lib/project-bundles";
import type { BuildBundleInput } from "@/lib/project-bundles";

const nlRenders = [
  {
    id: "rv1",
    renderVersionNumber: 1,
    status: "completed",
    isDefault: false,
    versionNote: "First",
    finalVideoUrl: "https://cdn.example/final-v1.mp4",
    cleanVideoUrl: "https://cdn.example/clean-v1.mp4",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "rv2",
    renderVersionNumber: 2,
    status: "completed",
    isDefault: true,
    versionNote: "Second",
    finalVideoUrl: "https://cdn.example/final-v2.mp4",
    cleanVideoUrl: "https://cdn.example/clean-v2.mp4",
    createdAt: "2026-01-02T00:00:00.000Z",
  },
];

describe("Motion V22.3 — version-aware gallery preview", () => {
  it("catalog slots carry per-project thumbnail and duration", () => {
    const catalog = buildMotionVersionCatalogForProject({
      projectId: "p1",
      exportOutputUrl: null,
      exportStatus: null,
      projectStatus: "completed",
      projectCleanUrl: null,
      thumbnailUrl: "https://cdn.example/thumb-v1.jpg",
      durationSeconds: 42,
      renderVersions: nlRenders,
      languageExports: [],
    });
    const slots = catalog.slotsByLanguage.nl ?? [];
    assert.equal(slots.length, 2);
    assert.equal(slots[0]!.thumbnailUrl, "https://cdn.example/thumb-v1.jpg");
    assert.equal(slots[0]!.finalVideoUrl, "https://cdn.example/final-v1.mp4");
    assert.equal(slots[1]!.finalVideoUrl, "https://cdn.example/final-v2.mp4");
  });

  it("resolveSelectedBundleVersion uses v1 slot for play download and open", () => {
    const catalog = buildMotionVersionCatalogForProject({
      projectId: "p1",
      exportOutputUrl: null,
      exportStatus: null,
      projectStatus: "completed",
      projectCleanUrl: null,
      thumbnailUrl: "https://cdn.example/thumb.jpg",
      renderVersions: nlRenders,
      languageExports: [],
    });
    const v1 = catalog.slotsByLanguage.nl!.find((s) => s.versionNumber === 1)!;
    const selected = resolveSelectedBundleVersion({
      bundleKey: "bk-1",
      catalog,
      languageCode: "nl",
      selectionKey: v1.selectionKey,
    });
    assert.ok(selected);
    assert.equal(selected!.finalVideoUrl, "https://cdn.example/final-v1.mp4");
    assert.equal(selected!.thumbnailUrl, "https://cdn.example/thumb.jpg");
    assert.match(selected!.openHref, /sel=render%3Arv1/);
    assert.equal(buildBundleSlotOpenHref(v1), selected!.openHref);
    assert.equal(buildBundleSlotDownloadUrl(v1), selected!.downloadUrl);
    assert.equal(
      buildBundlePlayKey("bk-1", v1.selectionKey),
      selected!.playKey
    );
  });

  it("does not fall back to latest when explicit v1 is selected over v2", () => {
    const catalog = buildMotionVersionCatalogForProject({
      projectId: "p1",
      exportOutputUrl: null,
      exportStatus: null,
      projectStatus: "completed",
      projectCleanUrl: null,
      renderVersions: nlRenders,
      languageExports: [],
    });
    const v1Key = catalog.slotsByLanguage.nl!.find((s) => s.versionNumber === 1)!.selectionKey;
    const v2Key = catalog.slotsByLanguage.nl!.find((s) => s.versionNumber === 2)!.selectionKey;
    const selV1 = resolveSelectedBundleVersion({
      bundleKey: "bk",
      catalog,
      languageCode: "nl",
      selectionKey: v1Key,
    });
    const selV2 = resolveSelectedBundleVersion({
      bundleKey: "bk",
      catalog,
      languageCode: "nl",
      selectionKey: v2Key,
    });
    assert.notEqual(selV1!.finalVideoUrl, selV2!.finalVideoUrl);
  });

  it("thumbnail cache returns prior URL when slot thumbnail is temporarily empty", () => {
    const key = "nl:v1:render:rv1";
    assert.equal(
      resolveBundleDisplayThumbnail({
        selectionKey: key,
        thumbnailUrl: "https://cdn.example/a.jpg",
        fallbackBundleThumbnail: null,
      }),
      "https://cdn.example/a.jpg"
    );
    assert.equal(
      resolveBundleDisplayThumbnail({
        selectionKey: key,
        thumbnailUrl: null,
        fallbackBundleThumbnail: "https://cdn.example/fallback.jpg",
      }),
      "https://cdn.example/a.jpg"
    );
  });

  it("version dropdown updates thumbnail URL per slot", () => {
    const catalog = buildMotionVersionCatalogForProject({
      projectId: "p1",
      exportOutputUrl: null,
      exportStatus: null,
      projectStatus: "completed",
      projectCleanUrl: null,
      thumbnailUrl: "https://cdn.example/thumb-v1.jpg",
      renderVersions: nlRenders,
      languageExports: [],
    });
    const v1Key = catalog.slotsByLanguage.nl!.find((s) => s.versionNumber === 1)!.selectionKey;
    const v2Key = catalog.slotsByLanguage.nl!.find((s) => s.versionNumber === 2)!.selectionKey;
    const slotV1 = catalog.slotsByLanguage.nl!.find((s) => s.selectionKey === v1Key)!;
    const slotV2 = { ...slotV1, selectionKey: v2Key, versionNumber: 2, thumbnailUrl: "https://cdn.example/thumb-v2.jpg" };
    assert.equal(
      resolveThumbnailForSlot(slotV1, null),
      "https://cdn.example/thumb-v1.jpg"
    );
    assert.equal(
      resolveThumbnailForSlot(slotV2, null),
      "https://cdn.example/thumb-v2.jpg"
    );
  });

  it("merged bundle slots use member-specific thumbnails", () => {
    const member = (id: string, thumb: string, url: string): BuildBundleInput => ({
      id,
      ownerId: "u1",
      createdAt: "2026-06-01T10:00:00.000Z",
      updatedAt: "2026-06-02T10:00:00.000Z",
      status: "completed",
      presetId: "standard",
      intent: null,
      advancedSettingsEnabled: false,
      viduResolution: null,
      viduDurationSeconds: null,
      estimatedCredits: null,
      estimatedTotalDurationSeconds: 10,
      imageCount: 1,
      transitionCount: 0,
      latestExport: {
        status: "completed",
        progress: 100,
        outputVideoUrl: url,
        errorMessage: null,
      },
      thumbnailUrl: thumb,
      thumbnailFallbackUrl: null,
      firstTransitionVideoUrl: null,
      allTransitionsCompleted: true,
      projectType: "instant_premium",
      title: "Promo",
      displayTitle: "Promo",
      renderVersions: [],
      languageExports: [],
    });

    const bundles = groupBundles(
      [
        member("p1", "https://cdn.example/thumb-a.jpg", "https://cdn.example/a.mp4"),
        member("p2", "https://cdn.example/thumb-b.jpg", "https://cdn.example/b.mp4"),
      ],
      { locale: "en" }
    );
    assert.equal(bundles.length, 1);
    const slots = bundles[0]!.catalog.slotsByLanguage.nl ?? [];
    assert.equal(slots.length, 2);
    assert.equal(slots[0]!.thumbnailUrl, "https://cdn.example/thumb-a.jpg");
    assert.equal(slots[1]!.thumbnailUrl, "https://cdn.example/thumb-b.jpg");
    assert.equal(slots[0]!.finalVideoUrl, "https://cdn.example/a.mp4");
    assert.equal(slots[1]!.finalVideoUrl, "https://cdn.example/b.mp4");
  });
});
