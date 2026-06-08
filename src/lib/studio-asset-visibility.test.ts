import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assembleUserStudioAssetRegistry } from "@/lib/assemble-user-studio-asset-registry";
import {
  buildSystemAudioRegistryAssets,
  buildStudioAssetRegistry,
  buildVoicePresetRegistryAssets,
} from "@/lib/studio-media-asset-registry";
import {
  buildUserUploadRegistryAssets,
  buildUserVoiceCloneRegistryAssets,
} from "@/lib/studio-user-asset-registry-extensions";
import {
  classifyStudioAssetVisibility,
  filterAssetsForPickerContext,
  filterUserLibraryAssets,
} from "@/lib/studio-asset-visibility";
import { computeStudioAssetLibraryCounts } from "@/lib/studio-asset-library-counts";
import type { StudioAsset } from "@/types/studio-media-asset";
import type { UserLibraryUploadRecord } from "@/types/studio-user-upload-library";
import type { UserVoiceLibraryEntry } from "@/types/studio-user-voice-library";

const USER = "user-1";

function asset(partial: Partial<StudioAsset> & Pick<StudioAsset, "id" | "name" | "category">): StudioAsset {
  return {
    description: "",
    tags: [],
    owner: USER,
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

describe("studio-asset-visibility", () => {
  it("hides system placeholders and catalog for normal users", () => {
    const registry = buildStudioAssetRegistry({ includeSystemCatalog: true, userId: USER });
    const filtered = filterUserLibraryAssets(registry, {
      userId: USER,
      isAdmin: false,
      showSystemAssets: false,
    });
    assert.equal(filtered.length, 0);
    assert.ok(buildVoicePresetRegistryAssets().every((a) => classifyStudioAssetVisibility(a) === "placeholder"));
    assert.ok(
      buildSystemAudioRegistryAssets().every((a) => classifyStudioAssetVisibility(a) === "system_hidden")
    );
  });

  it("lets admin optionally view system assets", () => {
    const registry = buildStudioAssetRegistry({ includeSystemCatalog: true, userId: USER });
    const hidden = filterUserLibraryAssets(registry, {
      userId: USER,
      isAdmin: true,
      showSystemAssets: false,
    });
    const shown = filterUserLibraryAssets(registry, {
      userId: USER,
      isAdmin: true,
      showSystemAssets: true,
    });
    assert.equal(hidden.length, 0);
    assert.ok(shown.length > hidden.length);
  });

  it("shows uploaded image in My Assets registry", () => {
    const upload: UserLibraryUploadRecord = {
      id: "up-1",
      ownerId: USER,
      assetType: "reference_image",
      sourceType: "uploaded",
      mimeType: "image/jpeg",
      fileName: "hero.jpg",
      storageKey: "studio/user-1/uploads/hero.jpg",
      publicUrl: "https://example.com/hero.jpg",
      thumbnailUrl: "https://example.com/hero-thumb.jpg",
      createdAt: "2024-06-01T00:00:00.000Z",
      originContext: "character_create",
    };
    const registry = assembleUserStudioAssetRegistry({
      userId: USER,
      userUploads: [upload],
    });
    assert.equal(registry.length, 1);
    assert.equal(registry[0]?.name, "hero");
    assert.equal(classifyStudioAssetVisibility(registry[0]!), "user_owned");
  });

  it("shows uploaded audio in My Assets registry", () => {
    const upload: UserLibraryUploadRecord = {
      id: "aud-1",
      ownerId: USER,
      assetType: "music",
      sourceType: "uploaded",
      mimeType: "audio/mpeg",
      fileName: "theme.mp3",
      storageKey: "studio/user-1/audio/theme.mp3",
      publicUrl: "https://example.com/theme.mp3",
      createdAt: "2024-06-01T00:00:00.000Z",
    };
    const registry = assembleUserStudioAssetRegistry({
      userId: USER,
      userUploads: [upload],
    });
    assert.equal(registry.length, 1);
    assert.equal(registry[0]?.category, "music");
  });

  it("reuses uploaded reference in character derivation picker context", () => {
    const upload: UserLibraryUploadRecord = {
      id: "up-ref",
      ownerId: USER,
      assetType: "character_image",
      sourceType: "uploaded",
      mimeType: "image/jpeg",
      fileName: "mascot.jpg",
      storageKey: "k",
      publicUrl: "https://example.com/mascot.jpg",
      thumbnailUrl: "https://example.com/mascot.jpg",
      createdAt: "2024-06-01T00:00:00.000Z",
    };
    const assets = buildUserUploadRegistryAssets([upload], USER);
    const picked = filterAssetsForPickerContext(assets, {
      userId: USER,
      pickerContext: "reference_image",
    });
    assert.equal(picked.length, 1);
  });

  it("shows voice clone but hides placeholder system voice in voice picker", () => {
    const clone: UserVoiceLibraryEntry = {
      cloneId: "vc-1",
      name: "My Clone",
      language: "en",
      provider: "elevenlabs",
      status: "completed",
      createdAt: "2024-06-01T00:00:00.000Z",
      lastUsedAt: "2024-06-01T00:00:00.000Z",
      previewUrl: "https://example.com/preview.mp3",
      voiceProfileRef: "warm_narrator",
      characterCount: 0,
      storyboardCount: 0,
      characterIds: [],
      storyboardIds: [],
    };
    const userVoice = buildUserVoiceCloneRegistryAssets([clone], USER);
    const systemVoice = buildVoicePresetRegistryAssets()[0]!;
    const picked = filterAssetsForPickerContext([...userVoice, systemVoice], {
      userId: USER,
      pickerContext: "voice",
    });
    assert.equal(picked.length, 1);
    assert.equal(picked[0]?.tags.includes("voice_clone"), true);
  });

  it("excludes system assets from user counts", () => {
    const userOnly = assembleUserStudioAssetRegistry({
      userId: USER,
      generatedReferences: [
        {
          generationId: "g1",
          kind: "character",
          createdAt: "2024-06-01T00:00:00.000Z",
          promptSummary: "Test",
          referenceImageUrl: "https://example.com/gen.jpg",
          referenceStorageKey: "k",
          thumbnailUrl: "https://example.com/gen.jpg",
          sourceAssetName: null,
          origin: "generated",
          ownerId: USER,
        },
      ],
    });
    const counts = computeStudioAssetLibraryCounts(userOnly, { userId: USER });
    assert.equal(counts.all, 1);
    assert.equal(counts.userOwned, 1);
    assert.equal(counts.systemOwned, 0);
    assert.equal(counts.byTab.generated, 1);
  });

  it("keeps generated and derived assets visible", () => {
    const gen = asset({
      id: "reference_image:g1",
      name: "Generated",
      category: "reference_image",
      origin: "generated",
      previewUrl: "https://example.com/g.jpg",
    });
    const derived = asset({
      id: "reference_image:d1",
      name: "Derived",
      category: "reference_image",
      origin: "derived",
      previewUrl: "https://example.com/d.jpg",
    });
    const visible = filterUserLibraryAssets([gen, derived], { userId: USER });
    assert.equal(visible.length, 2);
  });

  it("dedupes upload manifest by storage key (upload once, reuse everywhere)", () => {
    const upload: UserLibraryUploadRecord = {
      id: "same",
      ownerId: USER,
      assetType: "reference_image",
      sourceType: "uploaded",
      mimeType: "image/jpeg",
      fileName: "once.jpg",
      storageKey: "motion/abc/working-once.jpg",
      publicUrl: "https://example.com/once.jpg",
      createdAt: "2024-06-01T00:00:00.000Z",
      originContext: "wizard",
    };
    const registry = assembleUserStudioAssetRegistry({
      userId: USER,
      userUploads: [upload, { ...upload, id: "dup", fileName: "once-copy.jpg" }],
    });
    assert.equal(registry.length, 1);
  });
});
