import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAssetLibraryPreferences,
  filterAssetsByCollectionPreset,
  matchesAssetLibraryTab,
  searchStudioAssets,
  sortStudioAssets,
  userOwnedAssetsOnly,
} from "@/lib/studio-asset-library-filters";
import type { StudioAsset } from "@/types/studio-media-asset";

function asset(partial: Partial<StudioAsset> & Pick<StudioAsset, "id" | "name" | "category">): StudioAsset {
  return {
    description: "",
    tags: [],
    owner: "user-1",
    source: "user",
    status: "active",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-06-01T00:00:00.000Z",
    sourceRef: { entityType: "character", entityId: "c1" },
    collectionIds: [],
    ...partial,
  };
}

describe("studio-asset-library-filters", () => {
  it("filters favorites tab", () => {
    const items = [
      asset({ id: "character:a", name: "A", category: "character", isFavorite: true }),
      asset({ id: "character:b", name: "B", category: "character" }),
    ];
    assert.equal(items.filter((a) => matchesAssetLibraryTab(a, "favorites")).length, 1);
  });

  it("filters generated collection preset", () => {
    const items = [
      asset({ id: "reference_image:g1", name: "Gen", category: "reference_image", origin: "generated" }),
      asset({ id: "character:c", name: "Manual", category: "character", origin: "manual" }),
    ];
    const filtered = filterAssetsByCollectionPreset(items, "generated", new Set(), new Set());
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.origin, "generated");
  });

  it("debounced search matches prompt summary", () => {
    const items = [
      asset({
        id: "reference_image:g1",
        name: "Chef",
        category: "reference_image",
        promptSummary: "Globe Man chef variant",
      }),
    ];
    const found = searchStudioAssets(items, "globe");
    assert.equal(found.length, 1);
  });

  it("sorts by name ascending", () => {
    const items = [
      asset({ id: "character:b", name: "Beta", category: "character" }),
      asset({ id: "character:a", name: "Alpha", category: "character" }),
    ];
    const sorted = sortStudioAssets(items, "name_asc");
    assert.equal(sorted[0]?.name, "Alpha");
  });

  it("scopes to user-owned assets", () => {
    const items = [
      asset({ id: "character:a", name: "Mine", category: "character", owner: "user-1" }),
      asset({ id: "character:b", name: "Other", category: "character", owner: "user-2" }),
      asset({ id: "voice:sys", name: "System", category: "voice", owner: "system" }),
    ];
    const scoped = userOwnedAssetsOnly(items, "user-1");
    assert.equal(scoped.length, 2);
  });

  it("applies favorite ids from preferences", () => {
    const items = [asset({ id: "character:a", name: "A", category: "character" })];
    const withPrefs = applyAssetLibraryPreferences(items, {
      favoriteIds: ["character:a"],
      recentAssetIds: [],
    });
    assert.equal(withPrefs[0]?.isFavorite, true);
  });
});
