import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countBundlesPerFolder,
  formatSelectedVersionLabel,
  summarizeBundleRichStats,
  summarizeFolderLibraryView,
} from "@/lib/bundle-rich-summary";
import { resolveSelectedBundleVersion } from "@/lib/bundle-selected-version";
import {
  badgeContextForProject,
  resolveBundleVersionBadges,
} from "@/lib/bundle-version-badges";
import { bundleMatchesFolder } from "@/lib/bundle-folder";
import { buildMotionVersionCatalogForProject } from "@/lib/motion-version-catalog";
import { formatMotionVersionLabel } from "@/lib/motion-version-display";

const nlRenders = [
  {
    id: "rv1",
    renderVersionNumber: 1,
    status: "completed",
    isDefault: false,
    versionNote: "Eerste versie",
    finalVideoUrl: "https://cdn.example/final-v1.mp4",
    cleanVideoUrl: null,
    createdAt: "2026-06-03T10:00:00.000Z",
  },
  {
    id: "rv2",
    renderVersionNumber: 2,
    status: "completed",
    isDefault: true,
    versionNote: "Extra tekstblok",
    finalVideoUrl: "https://cdn.example/final-v2.mp4",
    cleanVideoUrl: null,
    createdAt: "2026-06-04T10:00:00.000Z",
  },
];

function studioCatalog() {
  return buildMotionVersionCatalogForProject({
    projectId: "p-studio",
    exportOutputUrl: null,
    exportStatus: null,
    projectStatus: "completed",
    projectCleanUrl: null,
    renderVersions: nlRenders,
    languageExports: [],
    locale: "nl",
  });
}

describe("Motion V22.5 — folder library & rich bundle cards", () => {
  it("counts bundles per folder chip", () => {
    const counts = countBundlesPerFolder([
      { folderId: "garden" },
      { folderId: "garden" },
      { folderId: "chef" },
    ]);
    assert.equal(counts.garden, 2);
    assert.equal(counts.chef, 1);
    assert.equal(counts.all, 3);
  });

  it("summarizes rich bundle stats with language and source lines", () => {
    const catalog = studioCatalog();
    const badges = resolveBundleVersionBadges(
      badgeContextForProject({
        id: "p-studio",
        studioSourceStoryboardId: "sb-1",
        hasStudioHandoff: true,
        instantMode: "story",
        imageCount: 3,
        status: "completed",
      })
    );
    const rich = summarizeBundleRichStats({
      catalog,
      badgesByProjectId: { "p-studio": badges },
      locale: "nl",
    });
    assert.equal(rich.totalVersions, 2);
    assert.match(rich.languageLine, /NL \(2\)/);
    assert.match(rich.sourceLine, /Studio \(2\)/);
    assert.match(rich.modeLine, /Story Mode \(2\)/);
  });

  it("keeps bundle-level counts stable when selected version changes", () => {
    const catalog = buildMotionVersionCatalogForProject({
      projectId: "p1",
      exportOutputUrl: null,
      exportStatus: null,
      projectStatus: "completed",
      projectCleanUrl: null,
      renderVersions: nlRenders,
      languageExports: [
        {
          id: "le1",
          languageCode: "en",
          languageLabel: "EN",
          status: "completed",
          outputVideoUrl: "https://cdn.example/en.mp4",
          version: 1,
          isDefault: false,
          versionNote: "First version",
          createdAt: "2026-06-05T10:00:00.000Z",
        },
      ],
      locale: "nl",
    });
    const rich = summarizeBundleRichStats({ catalog, locale: "nl" });
    assert.match(rich.languageLine, /NL \(2\)/);
    assert.match(rich.languageLine, /EN \(1\)/);
    assert.equal(rich.totalVersions, 3);

    const v1 = resolveSelectedBundleVersion({
      bundleKey: "bk",
      catalog,
      languageCode: "nl",
      selectionKey: catalog.slotsByLanguage.nl?.[0]?.selectionKey ?? null,
    });
    const v2 = resolveSelectedBundleVersion({
      bundleKey: "bk",
      catalog,
      languageCode: "nl",
      selectionKey: catalog.slotsByLanguage.nl?.[1]?.selectionKey ?? null,
    });
    assert.notEqual(v1?.selectionKey, v2?.selectionKey);
    assert.equal(rich.totalVersions, summarizeBundleRichStats({ catalog, locale: "nl" }).totalVersions);
  });

  it("updates selected version label and URLs on dropdown change", () => {
    const catalog = studioCatalog();
    const slotKey = catalog.slotsByLanguage.nl?.[1]?.selectionKey ?? null;
    const selected = resolveSelectedBundleVersion({
      bundleKey: "bk",
      catalog,
      languageCode: "nl",
      selectionKey: slotKey,
    });
    assert.ok(selected);
    assert.equal(selected.versionLabel, "Extra tekstblok");
    assert.match(selected.openHref, /sel=render%3A/);
    assert.equal(selected.finalVideoUrl, "https://cdn.example/final-v2.mp4");
  });

  it("formats version dropdown labels with note", () => {
    const label = formatMotionVersionLabel(2, "Nieuwe intro", "nl", "2026-06-04T10:00:00.000Z");
    assert.equal(label, "Nieuwe intro");
    const fallback = formatMotionVersionLabel(1, null, "nl", "2026-06-04T10:00:00.000Z");
    assert.match(fallback, /^V1 — /);
  });

  it("formats selected version summary label", () => {
    const label = formatSelectedVersionLabel({
      languageLabel: "NL",
      versionLabel: "Extra tekstblok",
      locale: "nl",
    });
    assert.equal(label, "NL Extra tekstblok");
  });

  it("summarizes folder library view for a single folder", () => {
    const catalog = studioCatalog();
    const summary = summarizeFolderLibraryView(
      [{ folderId: "garden", catalog, badgesByProjectId: {} }],
      "garden",
      "nl"
    );
    assert.ok(summary);
    assert.equal(summary.videoCount, 1);
    assert.equal(summary.totalVersions, 2);
    assert.match(summary.languageLine, /NL \(2\)/);
  });

  it("filters folder bundles client-side", () => {
    assert.equal(bundleMatchesFolder("garden", "garden"), true);
    assert.equal(bundleMatchesFolder("garden", "chef"), false);
  });

  it("assigns legacy and test badges from folder context", () => {
    const testBadges = resolveBundleVersionBadges(
      badgeContextForProject({ id: "p1", folderId: "tests", status: "completed" })
    );
    assert.ok(testBadges.some((b) => b.id === "test"));
    const legacyBadges = resolveBundleVersionBadges(
      badgeContextForProject({
        id: "p-old",
        status: "completed",
        renderVersionCount: 0,
        languageExportCount: 0,
      })
    );
    assert.ok(legacyBadges.some((b) => b.id === "legacy"));
  });
});
