import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { groupProjectsIntoBundles } from "@/lib/project-bundles";
import type { BuildBundleInput } from "@/lib/project-bundles";

function baseProject(overrides: Partial<BuildBundleInput> = {}): BuildBundleInput {
  return {
    id: "p1",
    ownerId: "user-1",
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-03T10:00:00.000Z",
    status: "completed",
    presetId: "standard",
    intent: null,
    advancedSettingsEnabled: false,
    viduResolution: null,
    viduDurationSeconds: null,
    estimatedCredits: null,
    estimatedTotalDurationSeconds: 12,
    imageCount: 3,
    transitionCount: 2,
    latestExport: {
      status: "completed",
      progress: 100,
      outputVideoUrl: "https://cdn.example/final.mp4",
      errorMessage: null,
    },
    thumbnailUrl: "https://cdn.example/thumb.jpg",
    thumbnailFallbackUrl: null,
    firstTransitionVideoUrl: null,
    allTransitionsCompleted: true,
    projectType: "instant_premium",
    title: "HomeCheff Promo",
    displayTitle: "HomeCheff Promo",
    renderVersions: [],
    languageExports: [],
    ...overrides,
  };
}

describe("project-bundles", () => {
  it("groups projects by normalized name for same owner and type", () => {
    const bundles = groupProjectsIntoBundles(
      [
        baseProject({ id: "p1", title: "HomeCheff Promo" }),
        baseProject({
          id: "p2",
          title: "homecheff   promo",
          createdAt: "2026-06-02T10:00:00.000Z",
          updatedAt: "2026-06-04T10:00:00.000Z",
        }),
        baseProject({ id: "p3", title: "Garden Story", projectType: "instant_premium" }),
      ],
      { locale: "en" }
    );
    assert.equal(bundles.length, 2);
    const promo = bundles.find((b) => b.displayTitle === "HomeCheff Promo");
    assert.ok(promo);
    assert.deepEqual(promo!.memberProjectIds.sort(), ["p1", "p2"]);
  });

  it("does not group same title across owners", () => {
    const bundles = groupProjectsIntoBundles(
      [
        baseProject({ id: "a", ownerId: "owner-a", title: "HomeCheff Promo" }),
        baseProject({ id: "b", ownerId: "owner-b", title: "HomeCheff Promo" }),
      ],
      {}
    );
    assert.equal(bundles.length, 2);
  });

  it("splits same title when bundleKey differs", () => {
    const bundles = groupProjectsIntoBundles(
      [
        baseProject({ id: "a", bundleKey: "key-a", title: "Same" }),
        baseProject({ id: "b", bundleKey: "key-b", title: "Same" }),
      ],
      {}
    );
    assert.equal(bundles.length, 2);
  });

  it("keeps separate project IDs inside a bundle", () => {
    const bundles = groupProjectsIntoBundles(
      [baseProject({ id: "a" }), baseProject({ id: "b", title: "HomeCheff Promo" })],
      {}
    );
    assert.equal(bundles.length, 1);
    assert.equal(bundles[0]!.memberProjectIds.length, 2);
    assert.ok(bundles[0]!.memberProjectIds.includes("a"));
    assert.ok(bundles[0]!.memberProjectIds.includes("b"));
  });
});
