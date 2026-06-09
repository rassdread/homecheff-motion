import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assembleUserStudioAssetRegistry } from "@/lib/assemble-user-studio-asset-registry";
import { matchesAssetLibraryTab } from "@/lib/studio-asset-library-filters";
import {
  computeStudioAssetLibraryCounts,
  isBlobGeneratedReferenceAsset,
} from "@/lib/studio-asset-library-counts";
import { generatedReferenceToRegistryAsset } from "@/lib/studio-media-asset-registry";
import {
  buildSystemAudioRegistryAssets,
  buildVoicePresetRegistryAssets,
} from "@/lib/studio-media-asset-registry";
import {
  classifyStudioAssetVisibility,
  filterUserLibraryAssets,
} from "@/lib/studio-asset-visibility";
import { studioCharacterListItem } from "@/test/studio-api-fixtures";

const USER = "user-1";

function generatedRef(partial: Partial<Parameters<typeof generatedReferenceToRegistryAsset>[0]> = {}) {
  return generatedReferenceToRegistryAsset({
    generationId: "gen-abc",
    kind: "character",
    createdAt: "2024-06-01T00:00:00.000Z",
    promptSummary: "Chef variant from Globe Man",
    referenceImageUrl: "https://example.com/gen.jpg",
    referenceStorageKey: `studio/${USER}/wizard-references/characters/gen-abc/main.jpg`,
    thumbnailUrl: "https://example.com/gen-thumb.jpg",
    sourceAssetName: "Globe Man",
    sourceAssetId: "char-source",
    origin: "generated",
    ownerId: USER,
    ...partial,
  });
}

describe("studio-asset-generated-visibility", () => {
  it("marks generated blob references as user_owned with draft status", () => {
    const asset = generatedRef();
    assert.equal(asset.visibility, "user_owned");
    assert.equal(asset.referenceAcceptance, "draft");
    assert.equal(asset.status, "draft");
    assert.equal(classifyStudioAssetVisibility(asset), "user_owned");
    assert.equal(isBlobGeneratedReferenceAsset(asset), true);
  });

  it("shows generated references in assembleUserStudioAssetRegistry", () => {
    const registry = assembleUserStudioAssetRegistry({
      userId: USER,
      generatedReferences: [
        {
          generationId: "gen-abc",
          kind: "character",
          createdAt: "2024-06-01T00:00:00.000Z",
          promptSummary: "Chef variant",
          referenceImageUrl: "https://example.com/gen.jpg",
          referenceStorageKey: `studio/${USER}/wizard-references/characters/gen-abc/main.jpg`,
          thumbnailUrl: "https://example.com/gen.jpg",
          sourceAssetName: "Globe Man",
          sourceAssetId: "char-1",
          origin: "generated",
          ownerId: USER,
        },
      ],
    });
    const generated = registry.filter((a) => a.id === "reference_image:gen_gen-abc");
    assert.equal(generated.length, 1);
    assert.equal(generated[0]?.visibility, "user_owned");
    assert.equal(matchesAssetLibraryTab(generated[0]!, "generated"), true);
  });

  it("shows derived references in derived tab with lineage", () => {
    const asset = generatedRef({ origin: "derived", generationId: "der-1" });
    assert.equal(matchesAssetLibraryTab(asset, "derived"), true);
    assert.equal(asset.semanticContinuity?.derivedFromAssetId, "char-source");
  });

  it("includes accepted character reference as user_owned generated origin", () => {
    const character = studioCharacterListItem({
      id: "c1",
      ownerId: USER,
      name: "Globe Chef",
      role: "mascot",
      isMascot: true,
      referenceImageUrl: "https://example.com/accepted.jpg",
      referenceNotes: "[studio:semantic:v1]{\"version\":1,\"changeRules\":[\"outfit\"]}",
    });
    const registry = assembleUserStudioAssetRegistry({
      userId: USER,
      characters: [character],
    });
    const ref = registry.find((a) => a.id === "reference_image:char_c1");
    assert.ok(ref);
    assert.equal(ref?.referenceAcceptance, "accepted");
    assert.equal(ref?.visibility, "user_owned");
  });

  it("hides system placeholders while counting generated user assets", () => {
    const registry = assembleUserStudioAssetRegistry({
      userId: USER,
      generatedReferences: [
        {
          generationId: "g1",
          kind: "character",
          createdAt: "2024-06-01T00:00:00.000Z",
          promptSummary: "Draft",
          referenceImageUrl: "https://example.com/a.jpg",
          referenceStorageKey: "k",
          thumbnailUrl: "https://example.com/a.jpg",
          sourceAssetName: null,
          origin: "generated",
          ownerId: USER,
        },
        {
          generationId: "g2",
          kind: "character",
          createdAt: "2024-06-02T00:00:00.000Z",
          promptSummary: "Derived draft",
          referenceImageUrl: "https://example.com/b.jpg",
          referenceStorageKey: "k2",
          thumbnailUrl: "https://example.com/b.jpg",
          sourceAssetName: "Globe",
          sourceAssetId: "c0",
          origin: "derived",
          ownerId: USER,
        },
      ],
    });
    const visible = filterUserLibraryAssets(registry, { userId: USER });
    assert.equal(visible.length, 2);
    assert.ok(
      buildVoicePresetRegistryAssets().every(
        (a) => !visible.some((v) => v.id === a.id)
      )
    );
    assert.ok(
      buildSystemAudioRegistryAssets().every(
        (a) => !visible.some((v) => v.id === a.id)
      )
    );

    const counts = computeStudioAssetLibraryCounts(visible, { userId: USER });
    assert.equal(counts.byTab.generated, 1);
    assert.equal(counts.byTab.derived, 1);
    assert.equal(counts.generatedOnly, 1);
    assert.equal(counts.derivedOnly, 1);
  });

  it("admin system toggle still excludes system catalog from default filter", () => {
    const emptyUser = assembleUserStudioAssetRegistry({ userId: USER });
    const withSystem = assembleUserStudioAssetRegistry({
      userId: USER,
      isAdmin: true,
      showSystemAssets: true,
    });
    assert.equal(emptyUser.length, 0);
    assert.ok(withSystem.length > emptyUser.length);
  });
});
