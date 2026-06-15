import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyLibraryBrowseFilters,
  buildLibraryRelationBadges,
  clearLibraryBrowseFilters,
  defaultLibraryBrowseFilters,
  hasActiveLibraryBrowseFilters,
  isLibraryBrowseEmpty,
} from "@/lib/library-consistency-browse";
import {
  buildLibraryProjectStatsMap,
  filterLibraryRecordsByTab,
  summarizeLibraryAssetsForProject,
} from "@/lib/library-asset-index";
import type { LibraryConsistencyRecord } from "@/types/library-consistency";

function sampleRecord(overrides: Partial<LibraryConsistencyRecord> = {}): LibraryConsistencyRecord {
  return {
    id: "rec_1",
    ownerId: "user_1",
    createdBy: "user_1",
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-10T10:00:00.000Z",
    generationType: "character",
    category: "characters",
    registryAssetId: "asset_char_1",
    backingStore: "prisma_character",
    backingId: "char_1",
    assetUrl: "https://cdn.example/char.png",
    storageKey: "studio/user_1/characters/char_1.png",
    thumbnailUrl: "https://cdn.example/char.png",
    assetName: "Hero",
    promptSummary: "A hero",
    projectId: "proj_1",
    projectTitle: "Studio project",
    sourceModule: "studio",
    sourceRoute: "/studio/characters/new",
    assetType: "character",
    workflow: "character_new",
    characterType: "humanoid",
    motionReady: true,
    motionReadinessScore: 0.9,
    characterCompleteness: "complete",
    missingParts: [],
    fusionIntent: null,
    fusionArchetype: null,
    fusionMetadata: null,
    motionMetadata: null,
    publishMetadata: null,
    usedInModules: ["studio", "motion"],
    status: "completed",
    ...overrides,
  };
}

describe("library-consistency-browse P4.1", () => {
  const records = [
    sampleRecord(),
    sampleRecord({
      id: "rec_2",
      registryAssetId: "asset_motion_1",
      generationType: "motion_output",
      category: "video",
      assetType: "motion_video",
      workflow: "motion_render",
      assetUrl: "https://cdn.example/final.mp4",
      motionReady: null,
      characterType: null,
      usedInModules: ["motion", "studio"],
      motionMetadata: { finalVideoUrl: "https://cdn.example/final.mp4", exportId: "exp_1" },
    }),
    sampleRecord({
      id: "rec_3",
      registryAssetId: "asset_fusion_1",
      generationType: "editor_variant",
      category: "images",
      projectId: "proj_2",
      fusionArchetype: "outfit_from_reference",
      usedInModules: ["editor", "studio"],
    }),
  ];

  it("filter characters tab shows only characters", () => {
    const filtered = applyLibraryBrowseFilters(records, defaultLibraryBrowseFilters({ tab: "characters" }));
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.category, "characters");
  });

  it("filter motion tab shows motion videos", () => {
    const filtered = applyLibraryBrowseFilters(records, defaultLibraryBrowseFilters({ tab: "motion" }));
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.generationType, "motion_output");
  });

  it("project filter shows assets for project", () => {
    const byTab = filterLibraryRecordsByTab(records, "project", "proj_1");
    assert.equal(byTab.length, 2);
    const filtered = applyLibraryBrowseFilters(records, defaultLibraryBrowseFilters({ tab: "project", projectId: "proj_1" }));
    assert.equal(filtered.length, 2);
    assert.ok(filtered.every((r) => r.projectId === "proj_1"));
  });

  it("project card stats summarize asset and video counts", () => {
    const stats = summarizeLibraryAssetsForProject(records, "proj_1");
    assert.equal(stats.assetCount, 2);
    assert.equal(stats.videoCount, 1);
    assert.equal(stats.characterCount, 1);
    assert.ok(stats.lastAssetActivityAt);
    const map = buildLibraryProjectStatsMap(records);
    assert.equal(map.proj_1?.exportCount, 0);
  });

  it("usedInModules badges include studio and motion", () => {
    const badges = buildLibraryRelationBadges(records[0]!);
    assert.ok(badges.some((b) => b.id === "used-studio"));
    assert.ok(badges.some((b) => b.id === "used-motion"));
    assert.ok(badges.some((b) => b.id === "from-project"));
  });

  it("empty filter results are detectable and filters can be cleared", () => {
    assert.equal(
      isLibraryBrowseEmpty(defaultLibraryBrowseFilters({ tab: "publish" }), 0),
      true
    );
    const active = defaultLibraryBrowseFilters({
      tab: "characters",
      characterType: "robot",
      motionReady: true,
    });
    assert.equal(hasActiveLibraryBrowseFilters(active), true);
    const cleared = clearLibraryBrowseFilters();
    assert.equal(cleared.tab, "recent");
    assert.equal(cleared.characterType, undefined);
  });
});
