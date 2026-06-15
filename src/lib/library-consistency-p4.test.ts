import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFusionLibraryFields,
  resolveMotionExportStorageKey,
} from "@/lib/library-consistency-completion";
import {
  buildLibraryAssetIndex,
  filterLibraryRecordsByTab,
  listAssetsForProjectIndex,
  listCharactersInLibraryIndex,
  listFusionOutputsInLibraryIndex,
  listMotionVideosInLibraryIndex,
  queryLibraryAssetIndex,
  summarizeLibraryAssetIndex,
} from "@/lib/library-asset-index";
import {
  attachLibraryMetadataToHcAsset,
  libraryMetadataFromConsistencyRecord,
  mergeHcPackageLibraryMetadata,
} from "@/lib/hc-asset-references";
import { LIBRARY_CONSISTENCY_AUDIT_ENDPOINTS } from "@/lib/library-consistency";
import type { LibraryConsistencyRecord } from "@/types/library-consistency";
import type { HomeCheffAssetReference, HomeCheffProjectPackage } from "@/types/homecheff-project-package";

function sampleRecord(overrides: Partial<LibraryConsistencyRecord> = {}): LibraryConsistencyRecord {
  const base: LibraryConsistencyRecord = {
    id: "rec_1",
    ownerId: "user_1",
    createdBy: "user_1",
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
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
    characterCompleteness: "complete",
    motionReadinessScore: 0.9,
    motionReady: true,
    missingParts: [],
    characterType: "humanoid",
    fusionIntent: null,
    fusionArchetype: null,
    fusionMetadata: null,
    motionMetadata: null,
    publishMetadata: null,
    usedInModules: ["studio"],
    status: "completed",
  };
  return { ...base, ...overrides };
}

describe("library-consistency P4", () => {
  it("wires motion and publish audit endpoints", () => {
    const motion = LIBRARY_CONSISTENCY_AUDIT_ENDPOINTS.find((e) => e.generationType === "motion_output");
    const publish = LIBRARY_CONSISTENCY_AUDIT_ENDPOINTS.find((e) => e.generationType === "publish_export");
    assert.equal(motion?.wired, true);
    assert.equal(publish?.wired, true);
  });

  it("registers motion metadata fields via buildFusionLibraryFields", () => {
    const fusion = buildFusionLibraryFields({
      fusionIntent: "person_outfit",
      fusionArchetype: "outfit_from_reference",
      sourceAssets: [{ role: "person", url: "https://a", name: "ref" }],
      questionAnswers: { keep_pose: true },
      outputSettings: { aspect: "9:16" },
      generationProfile: "standard",
    });
    assert.equal(fusion.fusionIntent, "person_outfit");
    assert.equal(fusion.fusionArchetype, "outfit_from_reference");
    assert.equal(fusion.workflow, "fusion");
  });

  it("resolves motion export storage keys", () => {
    assert.equal(
      resolveMotionExportStorageKey("proj_1", "/generated/animations/projects/proj_1/final.mp4"),
      "generated/animations/projects/proj_1/final.mp4"
    );
    assert.equal(
      resolveMotionExportStorageKey(
        "proj_1",
        "https://blob.vercel-storage.com/generated/animations/projects/proj_1/final.mp4"
      ),
      "generated/animations/projects/proj_1/final.mp4"
    );
  });

  it("queries asset index by project, motion, fusion, and character filters", () => {
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
        motionMetadata: {
          storyboardId: "sb_1",
          durationSec: 12,
          finalVideoUrl: "https://cdn.example/final.mp4",
          exportId: "exp_1",
        },
      }),
      sampleRecord({
        id: "rec_3",
        registryAssetId: "asset_fusion_1",
        generationType: "editor_variant",
        category: "images",
        assetType: "fusion_output",
        workflow: "fusion",
        motionReady: null,
        characterType: null,
        fusionIntent: "product_scene",
        fusionArchetype: "product_in_scene",
        fusionMetadata: { fusionIntent: "product_scene", fusionArchetype: "product_in_scene" },
        sourceModule: "editor",
      }),
    ];

    assert.equal(listMotionVideosInLibraryIndex(records).length, 1);
    assert.equal(listFusionOutputsInLibraryIndex(records).length, 1);
    assert.equal(listCharactersInLibraryIndex(records).length, 1);
    assert.equal(listAssetsForProjectIndex(records, "proj_1").length, 3);
    assert.equal(
      queryLibraryAssetIndex(records, { motionReady: true, characterType: "humanoid" }).length,
      1
    );
    assert.equal(filterLibraryRecordsByTab(records, "motion").length, 1);
    assert.equal(filterLibraryRecordsByTab(records, "fusion").length, 1);
    assert.equal(filterLibraryRecordsByTab(records, "publish").length, 0);
    assert.equal(buildLibraryAssetIndex(records)[0]?.assetId, "asset_char_1");
    const stats = summarizeLibraryAssetIndex(records);
    assert.equal(stats.total, 3);
    assert.equal(stats.videoCount, 1);
    assert.equal(stats.characterCount, 1);
  });

  it("maps library metadata onto HC package asset references", () => {
    const record = sampleRecord({
      fusionIntent: "person_outfit",
      fusionArchetype: "outfit_from_reference",
      fusionMetadata: { fusionIntent: "person_outfit", fusionArchetype: "outfit_from_reference" },
    });
    const ref: HomeCheffAssetReference = {
      id: "asset_char_1",
      url: record.assetUrl,
      storageKey: record.storageKey,
      kind: "character",
      sourceService: "studio",
      createdAt: record.createdAt,
      accessScope: "project",
    };
    const enriched = attachLibraryMetadataToHcAsset(ref, record);
    assert.equal(enriched.libraryMetadata?.characterType, "humanoid");
    assert.equal(enriched.libraryMetadata?.motionReady, true);
    assert.equal(libraryMetadataFromConsistencyRecord(record).fusionArchetype, "outfit_from_reference");

    const project: HomeCheffProjectPackage = {
      id: "hc_1",
      version: 1,
      projectFormat: "hc",
      projectVersion: 1,
      projectType: "studio",
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      ownerId: "user_1",
      sourceService: "studio",
      title: "HC",
      permissions: {
        view: true,
        edit: true,
        copy: true,
        downloadAssets: true,
        commercialUse: false,
        share: false,
      },
      assetReferences: [ref],
      generationPackageIds: [],
      workflowState: {},
      metadata: {},
    };
    const merged = mergeHcPackageLibraryMetadata(project, [record]);
    assert.equal(merged.assetReferences[0]?.libraryMetadata?.characterCompleteness, "complete");
  });
});
