import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAssistantExecutionPlan } from "@/lib/assistant-execution-plan-builder";
import { applyPreparedAssetsToPrefillPackage } from "@/lib/assistant-execution-prefill";
import {
  appendAssistantExecutionLogEntry,
  buildExecutionLogEntry,
  readAssistantExecutionProjectMetadata,
} from "@/lib/assistant-execution-project-log";
import { buildMotionActionPresetPrefillPackage } from "@/lib/assistant-prefill-engine";
import { applyAssistantPrefillToInstantMotion } from "@/lib/assistant-wizard-prefill-apply";
import { buildAssistantContextSnapshot } from "@/lib/assistant-context-layer";
import { createHcProjectForModule } from "@/lib/hc-project-lifecycle";
import { createHcAssetReference, upsertHcAssetReference } from "@/lib/hc-asset-references";
import {
  ASSISTANT_V4_BLOCKED_ACTIONS,
  ASSISTANT_V4_EXECUTABLE_ACTIONS,
  getAssistantExecutionMode,
  isVideoRenderAction,
} from "@/lib/assistant-tool-execution-mode";
import {
  executeAssistantPlanSequential,
  executeAssistantPlanStep,
} from "@/server/assistant/assistant-tool-executor";
import type { LibraryConsistencyRecord } from "@/types/library-consistency";

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
    assetUrl: overrides.assetUrl ?? "https://cdn.example/char.png",
    storageKey: "key",
    thumbnailUrl: null,
    assetName: overrides.assetName ?? "Hero",
    promptSummary: "hero",
    projectId: overrides.projectId ?? null,
    projectTitle: null,
    sourceModule: "studio",
    sourceRoute: null,
    assetType: "character",
    workflow: "character_new",
    characterCompleteness: "complete",
    motionReadinessScore: overrides.motionReady === false ? 0.4 : 0.9,
    motionReady: overrides.motionReady ?? true,
    missingParts: [],
    characterType: "humanoid",
    fusionIntent: null,
    fusionArchetype: null,
    fusionMetadata: null,
    motionMetadata: null,
    publishMetadata: null,
    usedInModules: ["studio"],
    status: "completed",
    ...overrides,
  };
}

function goalCelebrationPrefill(records: LibraryConsistencyRecord[]) {
  const snapshot = buildAssistantContextSnapshot({ projects: [], libraryRecords: records });
  return buildMotionActionPresetPrefillPackage({ presetId: "goal_celebration", snapshot });
}

describe("assistant v4 tool execution layer", () => {
  it("goal celebration builds execution plan", () => {
    const pkg = goalCelebrationPrefill([
      sampleRecord({ registryAssetId: "char_1", assetName: "Player" }),
    ]);
    assert.ok(pkg);
    const plan = buildAssistantExecutionPlan({ pkg });
    assert.ok(plan);
    assert.equal(plan.presetId, "goal_celebration");
    assert.ok(plan.steps.length >= 3);
    assert.equal(plan.providerCalls, 0);
  });

  it("missing stadium creates prepare_location or prepare_background step", () => {
    const pkg = goalCelebrationPrefill([sampleRecord({ registryAssetId: "char_1" })]);
    assert.ok(pkg);
    const plan = buildAssistantExecutionPlan({ pkg });
    assert.ok(plan);
    assert.ok(
      plan.steps.some(
        (step) => step.actionId === "prepare_background" || step.actionId === "prepare_location"
      )
    );
  });

  it("missing outfit creates prepare_outfit step", () => {
    const pkg = goalCelebrationPrefill([sampleRecord({ registryAssetId: "char_1" })]);
    assert.ok(pkg);
    const plan = buildAssistantExecutionPlan({ pkg });
    assert.ok(plan?.steps.some((step) => step.actionId === "prepare_outfit"));
  });

  it("motion-ready character skips prepare_motion_character", () => {
    const pkg = goalCelebrationPrefill([
      sampleRecord({ registryAssetId: "char_ready", motionReady: true }),
    ]);
    assert.ok(pkg);
    const plan = buildAssistantExecutionPlan({ pkg });
    assert.ok(plan);
    assert.equal(plan.steps.some((step) => step.actionId === "prepare_motion_character"), false);
  });

  it("non-motion-ready character creates wizard_only step", () => {
    const pkg = goalCelebrationPrefill([
      sampleRecord({ registryAssetId: "char_draft", motionReady: false }),
    ]);
    assert.ok(pkg);
    const plan = buildAssistantExecutionPlan({ pkg });
    assert.ok(plan);
    const motionStep = plan.steps.find((step) => step.actionId === "prepare_motion_character");
    assert.ok(motionStep);
    assert.equal(motionStep.executionMode, "wizard_only");
  });

  it("provider-call steps require confirmation before running", () => {
    const pkg = goalCelebrationPrefill([sampleRecord({ registryAssetId: "char_1" })]);
    assert.ok(pkg);
    const plan = buildAssistantExecutionPlan({ pkg });
    assert.ok(plan);
    const outfitStep = plan.steps.find((step) => step.actionId === "prepare_outfit");
    assert.ok(outfitStep);
    const unconfirmed = executeAssistantPlanStep({
      plan,
      stepId: outfitStep.id,
      confirmed: false,
    });
    assert.equal(unconfirmed.status, "waiting_for_confirmation");
    assert.equal(unconfirmed.creditsConsumed, 0);
  });

  it("no video render action exists in v4 executor", () => {
    for (const actionId of ASSISTANT_V4_EXECUTABLE_ACTIONS) {
      assert.equal(isVideoRenderAction(actionId), false);
    }
    assert.equal(isVideoRenderAction("create_motion_video"), true);
  });

  it("no credits consumed before confirmation", () => {
    const pkg = goalCelebrationPrefill([sampleRecord({ registryAssetId: "char_1" })]);
    assert.ok(pkg);
    const plan = buildAssistantExecutionPlan({ pkg, confirmed: false });
    assert.ok(plan);
    assert.equal(plan.creditsConsumed, 0);
    const outcome = executeAssistantPlanSequential(plan, { confirmed: false, stopOnReview: true });
    assert.equal(outcome.plan.creditsConsumed, 0);
    assert.ok(outcome.results.every((result) => result.creditsConsumed === 0));
  });

  it("execution activity panel data reflects step states", () => {
    const pkg = goalCelebrationPrefill([sampleRecord({ registryAssetId: "char_1" })]);
    assert.ok(pkg);
    const plan = buildAssistantExecutionPlan({ pkg, confirmed: true });
    assert.ok(plan);
    const outcome = executeAssistantPlanSequential(plan, {
      confirmed: true,
      libraryAssetNames: {
        char_1: { assetName: "Player", assetUrl: "https://cdn.example/char.png" },
      },
      stopOnReview: true,
    });
    assert.ok(outcome.plan.steps.some((step) => step.status === "completed"));
    assert.ok(
      outcome.plan.steps.some(
        (step) => step.status === "requires_user_review" || step.status === "planned"
      )
    );
  });

  it("completed prepared asset links to HC project metadata", () => {
    const project = createHcProjectForModule({ sourceModule: "motion", title: "Promo" });
    const pkg = goalCelebrationPrefill([
      sampleRecord({ registryAssetId: "char_1", projectId: project.id }),
    ]);
    assert.ok(pkg);
    const plan = buildAssistantExecutionPlan({ pkg, confirmed: true });
    assert.ok(plan);
    const outcome = executeAssistantPlanSequential(plan!, {
      confirmed: true,
      libraryAssetNames: {
        char_1: { assetName: "Player", assetUrl: "https://cdn.example/char.png" },
      },
      stopOnReview: false,
    });
    let nextProject = project;
    for (const step of outcome.plan.steps) {
      const entry = buildExecutionLogEntry(outcome.plan, step, step.status);
      nextProject = appendAssistantExecutionLogEntry(nextProject, outcome.plan, entry);
      if (step.output?.preparedAsset?.url) {
        const ref = createHcAssetReference({
          id: step.output.preparedAsset.assetId,
          url: step.output.preparedAsset.url,
          kind: step.output.preparedAsset.requirementId,
          role: `assistant_prepared:${step.output.preparedAsset.requirementId}`,
          sourceService: "motion",
        });
        nextProject = upsertHcAssetReference(nextProject, ref);
      }
    }
    const metadata = readAssistantExecutionProjectMetadata(nextProject);
    assert.ok(metadata);
    assert.ok(metadata.plans.length > 0);
    assert.ok(nextProject.assetReferences.length > 0);
  });

  it("failed step exposes retry skip and manual options", () => {
    const pkg = goalCelebrationPrefill([sampleRecord({ registryAssetId: "char_1" })]);
    assert.ok(pkg);
    const plan = buildAssistantExecutionPlan({ pkg, confirmed: true });
    assert.ok(plan);
    const useCharacter = plan!.steps.find((step) => step.actionId === "use_existing_asset");
    assert.ok(useCharacter);
    const brokenPlan = {
      ...plan!,
      steps: plan!.steps.map((step) =>
        step.id === useCharacter.id
          ? { ...step, input: { ...step.input, assetId: undefined, characterAssetId: undefined, characterAssetUrl: undefined } }
          : step
      ),
    };
    const result = executeAssistantPlanStep({
      plan: brokenPlan,
      stepId: useCharacter.id,
      confirmed: true,
    });
    assert.equal(result.status, "failed");
    assert.equal(result.step.output?.retryable, true);
    assert.equal(result.step.output?.skipAllowed, !useCharacter.required);
  });

  it("motion wizard receives prepared asset prefill", () => {
    const pkg = goalCelebrationPrefill([sampleRecord({ registryAssetId: "char_1" })]);
    assert.ok(pkg);
    const enriched = applyPreparedAssetsToPrefillPackage(pkg, [
      {
        requirementId: "person_character",
        assetId: "char_1",
        url: "https://cdn.example/char.png",
        assetName: "Player",
        projectId: null,
        sourceActionId: "use_existing",
      },
      {
        requirementId: "football_outfit",
        assetId: "preset-default:football_outfit",
        url: "",
        assetName: "Voetbaltenue",
        projectId: null,
        sourceActionId: "use_preset_default",
      },
    ]);
    const patch = applyAssistantPrefillToInstantMotion(enriched);
    assert.equal(patch.posterMotionSettings?.preparedByAssistant, true);
    assert.equal(patch.posterMotionSettings?.preparedCharacterAssetId, "char_1");
    assert.equal(patch.posterMotionSettings?.preparedOutfitAssetId, "preset-default:football_outfit");
  });

  it("execution log stored in project metadata", () => {
    const project = createHcProjectForModule({ sourceModule: "motion", title: "Log test" });
    const plan = buildAssistantExecutionPlan({
      pkg: goalCelebrationPrefill([sampleRecord({ registryAssetId: "char_1" })])!,
      confirmed: true,
    });
    assert.ok(plan);
    const step = plan.steps[0]!;
    const entry = buildExecutionLogEntry(plan, { ...step, status: "completed" }, "completed");
    const next = appendAssistantExecutionLogEntry(project, plan, entry);
    const metadata = readAssistantExecutionProjectMetadata(next);
    assert.ok(metadata?.plans[0]?.entries.length);
    assert.equal(metadata?.plans[0]?.entries[0]?.actionId, step.actionId);
  });

  it("destructive actions are not allowed in executor", () => {
    const pkg = goalCelebrationPrefill([sampleRecord({ registryAssetId: "char_1" })]);
    assert.ok(pkg);
    const plan = buildAssistantExecutionPlan({ pkg, confirmed: true });
    assert.ok(plan);
    for (const blocked of ASSISTANT_V4_BLOCKED_ACTIONS) {
      const fakeStep = {
        ...plan!.steps[0]!,
        id: `blocked-${blocked}`,
        actionId: blocked as never,
      };
      const result = executeAssistantPlanStep({
        plan: { ...plan!, steps: [fakeStep] },
        stepId: fakeStep.id,
        confirmed: true,
      });
      assert.equal(result.status, "failed");
    }
  });

  it("prepare_outfit uses requires_user_review execution mode", () => {
    assert.equal(getAssistantExecutionMode("prepare_outfit"), "requires_user_review");
    assert.equal(getAssistantExecutionMode("use_existing_asset"), "auto_safe");
  });
});
