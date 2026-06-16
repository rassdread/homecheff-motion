import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACTION_PRESET_REQUIREMENT_PROFILES,
  validateActionPresetRequirementProfiles,
} from "@/lib/action-preset-requirements";
import {
  resolveActionPresetRequirements,
  resolveActionPresetRequirementsById,
} from "@/lib/action-preset-requirement-resolver";
import {
  buildActionPresetResolutionPlan,
  buildAssistantProducerAnalysis,
  enrichPrefillWithProducerAnalysis,
} from "@/lib/assistant-producer-mode";
import { buildAssistantContextSnapshot } from "@/lib/assistant-context-layer";
import { buildMotionActionPresetPrefillPackage } from "@/lib/assistant-prefill-engine";
import { createHcProjectForModule } from "@/lib/hc-project-lifecycle";
import { getMotionActionPreset } from "@/lib/motion-action-presets";
import type { LibraryConsistencyRecord } from "@/types/library-consistency";
import type { MotionActionPresetId } from "@/types/motion-action-presets";

function sampleRecord(overrides: Partial<LibraryConsistencyRecord> = {}): LibraryConsistencyRecord {
  return {
    id: overrides.id ?? "rec_1",
    ownerId: "user_1",
    createdBy: "user_1",
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
    generationType: "character",
    category: "characters",
    registryAssetId: overrides.registryAssetId ?? "asset_char_1",
    backingStore: "prisma_character",
    backingId: "char_1",
    assetUrl: "https://cdn.example/char.png",
    storageKey: "studio/user_1/characters/char_1.png",
    thumbnailUrl: "https://cdn.example/char.png",
    assetName: overrides.assetName ?? "Hero",
    promptSummary: overrides.promptSummary ?? "A hero",
    projectId: overrides.projectId ?? null,
    projectTitle: overrides.projectTitle ?? null,
    sourceModule: "studio",
    sourceRoute: "/studio/characters/new",
    assetType: overrides.assetType ?? "character",
    workflow: overrides.workflow ?? "character_new",
    characterCompleteness: "complete",
    motionReadinessScore: overrides.motionReady === false ? 0.4 : 0.9,
    motionReady: overrides.motionReady ?? true,
    missingParts: [],
    characterType: overrides.characterType ?? "humanoid",
    fusionIntent: overrides.fusionIntent ?? null,
    fusionArchetype: overrides.fusionArchetype ?? null,
    fusionMetadata: null,
    motionMetadata: null,
    publishMetadata: null,
    usedInModules: ["studio"],
    status: "completed",
    ...overrides,
  };
}

function snapshotFromRecords(records: LibraryConsistencyRecord[], projectId?: string) {
  const project = projectId
    ? createHcProjectForModule({ sourceModule: "motion", title: "HomeCheff Promo" })
    : null;
  if (project && projectId) {
    project.id = projectId;
  }
  return buildAssistantContextSnapshot({
    projects: project ? [project] : [],
    libraryRecords: records,
  });
}

describe("action preset requirement resolver v3", () => {
  it("goal celebration finds existing character", () => {
    const records = [
      sampleRecord({
        registryAssetId: "char_goal",
        assetName: "Sergio",
        motionReady: true,
      }),
    ];
    const snapshot = snapshotFromRecords(records);
    const preset = getMotionActionPreset("goal_celebration");
    assert.ok(preset);

    const result = resolveActionPresetRequirements({ preset, snapshot });
    const character = result.availableAssets.find((asset) => asset.requirementId === "person_character");
    assert.ok(character);
    assert.equal(character.assetId, "char_goal");
  });

  it("goal celebration detects missing football outfit", () => {
    const snapshot = snapshotFromRecords([
      sampleRecord({ registryAssetId: "char_only", assetName: "Player" }),
    ]);
    const preset = getMotionActionPreset("goal_celebration");
    assert.ok(preset);

    const result = resolveActionPresetRequirements({ preset, snapshot });
    assert.ok(
      result.missingAssets.some((asset) => asset.requirementId === "football_outfit")
    );
    const outfit = result.missingAssets.find((asset) => asset.requirementId === "football_outfit");
    assert.ok(outfit?.options.some((option) => option.kind === "generate_with_fusion"));
    assert.ok(outfit?.options.some((option) => option.kind === "upload_reference"));
  });

  it("goal celebration detects missing stadium", () => {
    const snapshot = snapshotFromRecords([
      sampleRecord({ registryAssetId: "char_only", assetName: "Player" }),
    ]);
    const preset = getMotionActionPreset("goal_celebration");
    assert.ok(preset);

    const result = resolveActionPresetRequirements({ preset, snapshot });
    assert.ok(
      result.missingAssets.some((asset) => asset.requirementId === "stadium_location")
    );
    const stadium = result.missingAssets.find((asset) => asset.requirementId === "stadium_location");
    assert.ok(stadium?.options.some((option) => option.kind === "use_preset_default"));
  });

  it("moonwalk uses stage when present in library", () => {
    const snapshot = snapshotFromRecords([
      sampleRecord({ registryAssetId: "char_moon", assetName: "Dancer" }),
      sampleRecord({
        registryAssetId: "stage_1",
        category: "locations",
        generationType: "location",
        assetName: "Concert stage",
        promptSummary: "Large performance stage with lights",
        assetType: "location",
        workflow: "fusion",
      }),
    ]);
    const preset = getMotionActionPreset("moonwalk");
    assert.ok(preset);

    const result = resolveActionPresetRequirements({ preset, snapshot });
    assert.ok(result.availableAssets.some((asset) => asset.requirementId === "stage"));
    assert.equal(
      result.missingAssets.some((asset) => asset.requirementId === "stage"),
      false
    );
  });

  it("sports car arrival detects missing vehicle", () => {
    const snapshot = snapshotFromRecords([
      sampleRecord({ registryAssetId: "char_car", assetName: "Driver" }),
    ]);
    const result = resolveActionPresetRequirementsById("sports_car_arrival", snapshot);
    assert.ok(result);
    assert.ok(result.missingAssets.some((asset) => asset.requirementId === "sports_car"));
    const vehicle = result.missingAssets.find((asset) => asset.requirementId === "sports_car");
    assert.ok(vehicle?.options.some((option) => option.actionId === "prepare_prop"));
  });

  it("sports car arrival matches existing sports car asset", () => {
    const snapshot = snapshotFromRecords([
      sampleRecord({ registryAssetId: "char_car", assetName: "Driver" }),
      sampleRecord({
        registryAssetId: "car_1",
        category: "props",
        generationType: "prop",
        assetName: "Red sports car",
        promptSummary: "Ferrari supercar arrival",
        assetType: "prop",
        workflow: "fusion",
      }),
    ]);
    const result = resolveActionPresetRequirementsById("sports_car_arrival", snapshot);
    assert.ok(result);
    assert.ok(result.availableAssets.some((asset) => asset.requirementId === "sports_car"));
  });

  it("motion-ready awareness flags non-motion-ready character", () => {
    const snapshot = snapshotFromRecords([
      sampleRecord({
        registryAssetId: "char_not_ready",
        assetName: "Draft Hero",
        motionReady: false,
      }),
    ]);
    const result = resolveActionPresetRequirementsById("goal_celebration", snapshot);
    assert.ok(result);
    assert.ok(result.motionReadyIssue);
    assert.equal(result.motionReadyIssue?.motionReady, false);
    assert.equal(result.motionReadyIssue?.characterAssetId, "char_not_ready");
  });

  it("builds resolution plan with wizard and generate steps", () => {
    const snapshot = snapshotFromRecords([
      sampleRecord({ registryAssetId: "char_plan", assetName: "Star" }),
    ]);
    const result = resolveActionPresetRequirementsById("goal_celebration", snapshot);
    assert.ok(result);
    const plan = buildActionPresetResolutionPlan(result);
    assert.ok(plan.steps.length >= 3);
    assert.ok(plan.steps.some((step) => step.id === "open_motion_wizard"));
    assert.ok(plan.steps.some((step) => step.id === "generate_video"));
    assert.ok(plan.steps.some((step) => step.kind === "generate_plan"));
  });

  it("producer analysis uses zero provider calls and credits", () => {
    const snapshot = snapshotFromRecords([]);
    const analysis = buildAssistantProducerAnalysis({
      presetId: "goal_celebration",
      snapshot,
    });
    assert.ok(analysis);
    assert.equal(analysis.resolutionPlan.providerCalls, 0);
    assert.equal(analysis.resolutionPlan.creditsConsumed, 0);
    assert.equal(analysis.requirementResult.resolutionPlan.providerCalls, 0);
  });

  it("reuses project-scoped assets over global library", () => {
    const project = createHcProjectForModule({
      sourceModule: "motion",
      title: "HomeCheff Promo",
    });
    const snapshot = buildAssistantContextSnapshot({
      projects: [project],
      libraryRecords: [
        sampleRecord({
          registryAssetId: "char_global",
          assetName: "Global Hero",
          projectId: null,
        }),
        sampleRecord({
          registryAssetId: "char_project",
          assetName: "Promo Mascot",
          projectId: project.id,
          characterType: "mascot",
        }),
        sampleRecord({
          registryAssetId: "logo_project",
          category: "logos",
          generationType: "logo",
          assetName: "HomeCheff logo",
          promptSummary: "Brand logo",
          assetType: "logo",
          workflow: "fusion",
          fusionArchetype: "logo",
          projectId: project.id,
        }),
      ],
    });
    const activeProject = snapshot.projects[0] ?? null;
    const result = resolveActionPresetRequirements({
      preset: getMotionActionPreset("fans_recognize_me")!,
      snapshot,
      activeProject,
    });
    const character = result.availableAssets.find((asset) => asset.requirementId === "person_character");
    assert.equal(character?.assetId, "char_project");
    assert.equal(character?.fromProject, true);
    assert.ok(result.recommendedAssets.some((asset) => asset.assetId === "char_project"));
  });

  it("library keyword matching resolves stadium from prompt summary", () => {
    const snapshot = snapshotFromRecords([
      sampleRecord({ registryAssetId: "char_1", assetName: "Athlete" }),
      sampleRecord({
        registryAssetId: "loc_stadium",
        category: "locations",
        generationType: "location",
        assetName: "Arena backdrop",
        promptSummary: "Packed football stadium at night",
        assetType: "location",
        workflow: "fusion",
      }),
    ]);
    const result = resolveActionPresetRequirementsById("stadium_entrance", snapshot);
    assert.ok(result);
    assert.ok(result.availableAssets.some((asset) => asset.requirementId === "stadium_location"));
  });

  it("review card data reflects available and missing buckets", () => {
    const snapshot = snapshotFromRecords([
      sampleRecord({ registryAssetId: "char_review", assetName: "Captain" }),
    ]);
    const pkg = buildMotionActionPresetPrefillPackage({
      presetId: "goal_celebration",
      snapshot,
    });
    assert.ok(pkg?.requirementAnalysis);
    assert.ok(pkg.availableAssets?.some((asset) => asset.requirementId === "person_character"));
    assert.ok(pkg.missingAssets?.some((asset) => asset.requirementId === "football_outfit"));
    assert.ok(pkg.resolutionPlan && pkg.resolutionPlan.steps.length > 0);
    assert.ok(pkg.assistantRecommendations?.includes("assistant.requirements.recommendation.characterFound"));
    assert.ok(pkg.assistantRecommendations?.includes("assistant.requirements.recommendation.outfitMissing"));
  });

  it("all 18 presets have complete requirement profiles", () => {
    const errors = validateActionPresetRequirementProfiles();
    assert.deepEqual(errors, []);
    const presetIds = Object.keys(ACTION_PRESET_REQUIREMENT_PROFILES) as MotionActionPresetId[];
    assert.equal(presetIds.length, 18);
    for (const presetId of presetIds) {
      const profile = ACTION_PRESET_REQUIREMENT_PROFILES[presetId];
      assert.ok(profile.required.includes("person_character"));
      assert.ok(profile.required.length + profile.optional.length > 0);
    }
  });

  it("every preset gets a non-empty resolution plan via producer enrichment", () => {
    const snapshot = snapshotFromRecords([
      sampleRecord({ registryAssetId: "char_all", assetName: "Universal Star" }),
    ]);
    const presetIds = Object.keys(ACTION_PRESET_REQUIREMENT_PROFILES) as MotionActionPresetId[];

    for (const presetId of presetIds) {
      const base = buildMotionActionPresetPrefillPackage({ presetId, snapshot });
      assert.ok(base, `prefill missing for ${presetId}`);
      assert.ok(base.requirementAnalysis, `analysis missing for ${presetId}`);
      assert.ok(base.resolutionPlan, `plan missing for ${presetId}`);
      assert.ok(base.resolutionPlan.steps.length >= 3, `plan too short for ${presetId}`);
      assert.equal(base.providerCalls, 0);
      assert.equal(base.creditsConsumed, 0);
      assert.ok(
        base.resolutionPlan.steps.every(
          (step) => step.actionId !== "run_provider" && step.kind !== "execute_provider"
        )
      );
    }
  });

  it("enrichPrefillWithProducerAnalysis attaches requirement metadata", () => {
    const snapshot = snapshotFromRecords([]);
    const base = buildMotionActionPresetPrefillPackage({ presetId: "moonwalk", snapshot });
    assert.ok(base);
    const enriched = enrichPrefillWithProducerAnalysis(base, snapshot);
    assert.ok(enriched.requirementMetadata);
    assert.equal(enriched.requirementMetadata?.presetId, "moonwalk");
    assert.ok(enriched.hcActionPreset?.requirementMetadata);
  });
});
