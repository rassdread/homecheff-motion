import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bundleMatchesFolder,
  resolveBundleFolderId,
} from "@/lib/bundle-folder";
import {
  badgeContextForProject,
  resolveBundleVersionBadges,
} from "@/lib/bundle-version-badges";
import {
  buildBundleSlotOpenHref,
  resolveSelectedBundleVersion,
} from "@/lib/bundle-selected-version";
import { summarizeBundleVersionCounts } from "@/lib/bundle-version-summary";
import { buildMotionVersionCatalogForProject } from "@/lib/motion-version-catalog";
import { formatMotionVersionLabel } from "@/lib/motion-version-display";
import {
  isExplicitMotionUrlSelectionInvalid,
  resolveMotionSelectionFromUrl,
} from "@/lib/motion-version-catalog";
import { MOTION_AUDIO_EXPORT_JSON_VERSION } from "@/types/motion-voice-export";

const nlRenders = [
  {
    id: "rv1",
    renderVersionNumber: 1,
    status: "completed",
    isDefault: false,
    versionNote: "Eerste versie",
    finalVideoUrl: "https://cdn.example/final-v1.mp4",
    cleanVideoUrl: "https://cdn.example/clean-v1.mp4",
    createdAt: "2026-06-03T10:00:00.000Z",
  },
  {
    id: "rv2",
    renderVersionNumber: 2,
    status: "completed",
    isDefault: true,
    versionNote: "Extra tekstblok",
    finalVideoUrl: "https://cdn.example/final-v2.mp4",
    cleanVideoUrl: "https://cdn.example/clean-v2.mp4",
    createdAt: "2026-06-04T10:00:00.000Z",
  },
];

describe("Motion V22.4 — library UX", () => {
  it("resolves folder from bundle name and title", () => {
    assert.equal(
      resolveBundleFolderId({ bundleName: "Garden", displayTitle: "Garden Intro" }),
      "garden"
    );
    assert.equal(
      resolveBundleFolderId({ bundleName: "Test clip", displayTitle: "Sandbox" }),
      "tests"
    );
    assert.equal(resolveBundleFolderId({ displayTitle: "Random clip" }), "uncategorized");
  });

  it("filters bundles by folder client-side", () => {
    assert.equal(bundleMatchesFolder("all", "garden"), true);
    assert.equal(bundleMatchesFolder("garden", "garden"), true);
    assert.equal(bundleMatchesFolder("garden", "chef"), false);
  });

  it("summarizes language and total version counts", () => {
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
          isDefault: true,
          createdAt: "2026-06-05T00:00:00.000Z",
        },
        {
          id: "le2",
          languageCode: "en",
          languageLabel: "EN",
          status: "completed",
          outputVideoUrl: "https://cdn.example/en2.mp4",
          version: 2,
          isDefault: false,
          createdAt: "2026-06-06T00:00:00.000Z",
        },
      ],
      locale: "nl",
    });
    const summary = summarizeBundleVersionCounts(catalog, "nl");
    assert.match(summary.languageLine, /NL \(2\)/);
    assert.match(summary.languageLine, /EN \(2\)/);
    assert.equal(summary.totalVersions, 4);
    assert.match(summary.totalLine, /4 versies/);
  });

  it("selected version updates thumbnail play download and open URLs together", () => {
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
    const v2 = catalog.slotsByLanguage.nl!.find((s) => s.versionNumber === 2)!;

    const sel1 = resolveSelectedBundleVersion({
      bundleKey: "bk",
      catalog,
      languageCode: "nl",
      selectionKey: v1.selectionKey,
    })!;
    const sel2 = resolveSelectedBundleVersion({
      bundleKey: "bk",
      catalog,
      languageCode: "nl",
      selectionKey: v2.selectionKey,
    })!;

    assert.equal(sel1.selectedCatalogSlot.selectionKey, v1.selectionKey);
    assert.equal(sel1.finalVideoUrl, "https://cdn.example/final-v1.mp4");
    assert.notEqual(sel1.openHref, sel2.openHref);
    assert.match(sel2.openHref, /sel=render%3Arv2/);
    assert.match(sel1.openHref, /sel=render%3Arv1/);
    assert.equal(sel1.playKey, `bk:${v1.selectionKey}`);
    assert.notEqual(sel1.playKey, sel2.playKey);
  });

  it("does not use latest URLs when v1 is selected", () => {
    const catalog = buildMotionVersionCatalogForProject({
      projectId: "p1",
      exportOutputUrl: null,
      exportStatus: null,
      projectStatus: "completed",
      projectCleanUrl: null,
      renderVersions: nlRenders,
      languageExports: [],
    });
    const v1 = catalog.slotsByLanguage.nl!.find((s) => s.versionNumber === 1)!;
    const selected = resolveSelectedBundleVersion({
      bundleKey: "bk",
      catalog,
      languageCode: "nl",
      selectionKey: v1.selectionKey,
    })!;
    const latest = catalog.slotsByLanguage.nl!.find((s) => s.versionNumber === 2)!;
    assert.notEqual(selected.finalVideoUrl, latest.finalVideoUrl);
  });

  it("version labels use custom names as-is", () => {
    assert.equal(formatMotionVersionLabel(1, "Eerste versie", "nl"), "Eerste versie");
    const dated = formatMotionVersionLabel(2, null, "nl", "2026-06-04T10:00:00.000Z");
    assert.match(dated, /^V2 — /);
  });

  it("studio and story mode badges from project context", () => {
    const badges = resolveBundleVersionBadges(
      badgeContextForProject({
        id: "p1",
        studioSourceStoryboardId: "sb-1",
        instantMode: "story",
        imageCount: 4,
        status: "completed",
        renderVersionCount: 2,
        languageExportCount: 0,
      }),
      {
        motionAudioExport: {
          version: MOTION_AUDIO_EXPORT_JSON_VERSION,
          voiceEnabled: true,
          voiceAudioUrl: "https://cdn.example/v.mp3",
        },
      }
    );
    assert.ok(badges.some((b) => b.id === "studio"));
    assert.ok(badges.some((b) => b.id === "story_mode"));
    assert.ok(badges.some((b) => b.id === "multi_image"));
    assert.ok(badges.some((b) => b.id === "voice"));
  });

  it("motion badge when not from studio", () => {
    const badges = resolveBundleVersionBadges(
      badgeContextForProject({
        id: "p2",
        instantMode: "transition",
        imageCount: 2,
        status: "completed",
        renderVersionCount: 1,
      })
    );
    assert.ok(badges.some((b) => b.id === "motion"));
    assert.ok(badges.some((b) => b.id === "transition_mode"));
  });

  it("legacy badge when no version metadata", () => {
    const badges = resolveBundleVersionBadges(
      badgeContextForProject({
        id: "p3",
        status: "completed",
        renderVersionCount: 0,
        languageExportCount: 0,
      })
    );
    assert.ok(badges.some((b) => b.id === "legacy"));
  });

  it("detail deep link resolves correct slot", () => {
    const catalog = buildMotionVersionCatalogForProject({
      projectId: "p1",
      exportOutputUrl: null,
      exportStatus: null,
      projectStatus: "completed",
      projectCleanUrl: null,
      renderVersions: nlRenders,
      languageExports: [],
    });
    const resolved = resolveMotionSelectionFromUrl(catalog, "nl", "v2");
    assert.ok(resolved);
    assert.equal(resolved!.slot.versionNumber, 2);
    assert.match(buildBundleSlotOpenHref(resolved!.slot), /sel=render%3Arv2/);
  });

  it("invalid deep link is detected", () => {
    const catalog = buildMotionVersionCatalogForProject({
      projectId: "p1",
      exportOutputUrl: null,
      exportStatus: null,
      projectStatus: "completed",
      projectCleanUrl: null,
      renderVersions: nlRenders,
      languageExports: [],
    });
    assert.equal(isExplicitMotionUrlSelectionInvalid(catalog, "nl", "v99"), true);
  });
});
