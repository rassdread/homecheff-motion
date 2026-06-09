import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeAssetsHubCounts } from "@/lib/studio-asset-hub-counts";
import {
  ASSETS_HUB_SECTIONS,
  getHubSectionsForGroup,
  isAssetsHubPath,
  resolveHubSection,
} from "@/lib/studio-asset-hub-sections";
import {
  allowedRemoveModes,
  classifyRemoveEligibility,
  resolveAssetKindFromStudioAsset,
} from "@/lib/studio-asset-lifecycle-eligibility";
import {
  filterVisibleRegistryAssets,
  isRegistryAssetHiddenFromLibrary,
} from "@/lib/studio-asset-registry-lifecycle";
import type { StudioAsset } from "@/types/studio-media-asset";

function asset(partial: Partial<StudioAsset> & Pick<StudioAsset, "id" | "category">): StudioAsset {
  return {
    name: "Test",
    description: "",
    tags: [],
    owner: "user-1",
    source: "user",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    sourceRef: { entityType: "scene_image", entityId: "x" },
    collectionIds: [],
    visibility: "user_owned",
    ...partial,
  };
}

describe("studio-assets-hub", () => {
  it("resolves hub sections by group and subsection", () => {
    assert.ok(resolveHubSection("media", "videos"));
    assert.equal(resolveHubSection("media", "invalid"), null);
    assert.equal(getHubSectionsForGroup("creative").length, 4);
    assert.equal(ASSETS_HUB_SECTIONS.length, 10);
  });

  it("detects assets hub paths", () => {
    assert.equal(isAssetsHubPath("/studio/assets"), true);
    assert.equal(isAssetsHubPath("/studio/assets/media/videos"), true);
    assert.equal(isAssetsHubPath("/studio/characters"), false);
  });

  it("computes hub group counts from registry", () => {
    const registry: StudioAsset[] = [
      asset({ id: "voice:1", category: "voice" }),
      asset({ id: "character:1", category: "character", sourceRef: { entityType: "character", entityId: "c1" } }),
      asset({ id: "reference_image:gen_1", category: "reference_image", origin: "generated" }),
      asset({ id: "reference_image:upload_1", category: "reference_image", origin: "uploaded", tags: ["user_upload"] }),
    ];
    const counts = computeAssetsHubCounts(registry, 3);
    assert.equal(counts.sections.videos, 3);
    assert.equal(counts.sections.voices, 1);
    assert.equal(counts.sections.characters, 1);
    assert.equal(counts.sections.generated, 1);
    assert.equal(counts.sections.uploads, 1);
    assert.equal(counts.groups.media, 4);
  });
});

describe("studio-asset-registry-lifecycle", () => {
  it("hides lifecycle-hidden assets from default view", () => {
    const hidden = asset({
      id: "reference_image:upload_h",
      category: "reference_image",
      lifecycle: { hideFromLibrary: true, lifecycleStatus: "hidden" },
    });
    assert.equal(isRegistryAssetHiddenFromLibrary(hidden), true);
    const visible = filterVisibleRegistryAssets([hidden], {});
    assert.equal(visible.length, 0);
  });
});

describe("studio-asset-lifecycle-eligibility", () => {
  it("blocks delete for system assets", () => {
    const sys = asset({
      id: "voice:sys",
      category: "voice",
      owner: "system",
      visibility: "system_hidden",
    });
    assert.equal(
      classifyRemoveEligibility({ asset: sys, userId: "user-1", usageCount: 0, mode: "delete" }),
      "system_protected"
    );
    assert.deepEqual(allowedRemoveModes("system_protected"), []);
  });

  it("allows hide for in-use user uploads", () => {
    const upload = asset({
      id: "reference_image:upload_1",
      category: "reference_image",
      origin: "uploaded",
      tags: ["user_upload"],
    });
    assert.equal(resolveAssetKindFromStudioAsset(upload), "upload");
    assert.deepEqual(
      allowedRemoveModes(
        classifyRemoveEligibility({ asset: upload, userId: "user-1", usageCount: 2, mode: "delete" })
      ),
      ["hide", "archive"]
    );
  });
});
