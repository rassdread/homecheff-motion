import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assembleUserStudioAssetRegistry } from "@/lib/assemble-user-studio-asset-registry";
import {
  computeStudioAssetLibraryCounts,
  isAcceptedReferenceAsset,
  isBlobGeneratedReferenceAsset,
} from "@/lib/studio-asset-library-counts";
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
    visibility: "user_owned",
    ...partial,
  };
}

describe("studio-asset-library-counts", () => {
  it("excludes system catalog from empty user library counts", () => {
    const registry = assembleUserStudioAssetRegistry({ userId: "user-1" });
    const counts = computeStudioAssetLibraryCounts(registry, {
      userId: "user-1",
      savedEntities: { characters: 0, props: 0, locations: 0, worlds: 0 },
    });
    assert.equal(counts.all, registry.length);
    assert.equal(counts.all, counts.byTab.all);
    assert.equal(counts.systemOwned, 0);
    assert.equal(counts.userOwned, 0);
    assert.equal(counts.savedEntities.total, 0);
  });

  it("classifies generated blob vs accepted entity references", () => {
    const gen = asset({
      id: "reference_image:gen_abc",
      name: "Blob",
      category: "reference_image",
      origin: "generated",
    });
    const accepted = asset({
      id: "reference_image:char_c1",
      name: "Accepted",
      category: "reference_image",
      origin: "uploaded",
    });
    assert.equal(isBlobGeneratedReferenceAsset(gen), true);
    assert.equal(isAcceptedReferenceAsset(accepted), true);
    assert.equal(isAcceptedReferenceAsset(gen), false);

    const counts = computeStudioAssetLibraryCounts([gen, accepted], {
      userId: "user-1",
      savedEntities: { characters: 1, props: 0, locations: 0, worlds: 0 },
    });
    assert.equal(counts.generatedOnly, 1);
    assert.equal(counts.acceptedReferences, 1);
    assert.equal(counts.byTab.generated, 1);
    assert.equal(counts.byTab.reference_image, 2);
  });

  it("aligns dashboard all count with library tab=all for user-owned only", () => {
    const registry = assembleUserStudioAssetRegistry({
      userId: "user-1",
      generatedReferences: [
        {
          generationId: "g1",
          kind: "character",
          createdAt: "2024-06-01T00:00:00.000Z",
          promptSummary: "Test",
          referenceImageUrl: "https://example.com/a.jpg",
          referenceStorageKey: "studio/user-1/wizard-references/characters/g1/main.jpg",
          thumbnailUrl: "https://example.com/a.jpg",
          sourceAssetName: null,
          origin: "generated",
          ownerId: "user-1",
        },
      ],
    });
    const counts = computeStudioAssetLibraryCounts(registry, { userId: "user-1" });
    assert.equal(counts.all, registry.length);
    assert.equal(counts.byTab.all, counts.all);
    assert.equal(counts.byTab.generated, 1);
    assert.equal(counts.systemOwned, 0);
  });
});
