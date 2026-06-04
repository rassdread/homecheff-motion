import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSceneConsistencyReport } from "@/lib/build-scene-consistency-report";
import { buildCorrectionRecommendations } from "@/lib/build-correction-recommendations";
import { buildCorrectedPrompt, recommendationsToPromptPatches } from "@/lib/build-corrected-prompt";
import { buildSceneCorrectionBundle } from "@/lib/build-scene-correction-bundle";
import { computeImprovementScore } from "@/lib/studio-improvement-score";
import {
  buildConsistencyHistoryFromImages,
  buildStoryboardCorrectionSummary,
} from "@/lib/studio-storyboard-correction-summary";
import { buildScenePromptFromInput } from "@/lib/studio-prompt-builder";
import { sceneSnapshotToPromptInput } from "@/lib/studio-scene-to-prompt-input";
import type { StoryboardConsistencyReport } from "@/types/studio-consistency";

const baseMemory = {
  characters: [
    {
      id: "chef",
      name: "Chef",
      role: "mascot" as const,
      appearanceMemory: "White chef hat. Green apron.",
      personalityMemory: "",
      continuityNotes: "",
      defaultClothing: "Green apron",
      defaultAccessories: "",
      visualKeywords: "clean",
      referenceImageUrl: "",
      primaryReferenceImageId: null,
      referenceNotes: "",
      identityStrength: "strong" as const,
      continuityStrength: "strong" as const,
      worldProfileId: null,
      worldProfileName: null,
    },
  ],
  location: null,
  props: [],
  world: null,
};

describe("studio correction engine V12", () => {
  it("buildCorrectionRecommendations produces patches for low scores", () => {
    const report = buildSceneConsistencyReport({
      sceneImage: {
        generatedPrompt: "A generic kitchen scene with food preparation.",
        sceneTitle: "Kitchen",
        sceneDescription: "",
        sceneAction: "cooking",
      },
      memory: baseMemory,
    });
    const recs = buildCorrectionRecommendations(report);
    assert.ok(recs.length > 0);
    assert.ok(recs.every((r) => r.promptPatch.trim().length > 0));
    assert.ok(recs.some((r) => r.severity === "medium" || r.severity === "high" || r.severity === "critical"));
  });

  it("buildCorrectedPrompt keeps original and appends correction layer", () => {
    const original = "Original scene prompt.";
    const patches = recommendationsToPromptPatches([
      {
        id: "p1",
        type: "MissingCharacterTrait",
        severity: "high",
        message: "Chef hat missing",
        promptPatch: "white chef hat clearly visible",
        source: "test",
      },
    ]);
    const corrected = buildCorrectedPrompt(original, patches);
    assert.ok(corrected.startsWith(original));
    assert.ok(corrected.includes("white chef hat clearly visible"));
    assert.ok(corrected.includes("Continuity corrections"));
  });

  it("buildSceneCorrectionBundle wires report to corrected prompt", () => {
    const report = buildSceneConsistencyReport({
      sceneImage: {
        generatedPrompt: "Kitchen scene only.",
        sceneTitle: "Kitchen",
        sceneDescription: "",
        sceneAction: "",
      },
      memory: baseMemory,
    });
    const bundle = buildSceneCorrectionBundle({
      basePrompt: "Kitchen scene only.",
      consistencyReport: report,
    });
    assert.equal(bundle.basePrompt, "Kitchen scene only.");
    assert.ok(bundle.correctedPrompt.length > bundle.basePrompt.length);
  });

  it("computeImprovementScore calculates delta", () => {
    const score = computeImprovementScore(78, 92);
    assert.equal(score.delta, 14);
    assert.equal(score.improved, true);
    assert.equal(score.previousScore, 78);
    assert.equal(score.newScore, 92);
  });

  it("buildConsistencyHistoryFromImages sorts by generation version", () => {
    const history = buildConsistencyHistoryFromImages([
      {
        id: "b",
        generationVersion: 2,
        consistencyScore: 90,
        consistencyStatus: "excellent",
        improvementScore: 12,
        correctionRecommendations: [{ id: "1" }],
        createdAt: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "a",
        generationVersion: 1,
        consistencyScore: 78,
        consistencyStatus: "good",
        improvementScore: null,
        correctionRecommendations: [],
        createdAt: "2026-06-01T00:00:00.000Z",
      },
    ]);
    assert.equal(history[0]?.generationVersion, 1);
    assert.equal(history[1]?.generationVersion, 2);
    assert.equal(history[1]?.correctionCount, 1);
  });

  it("buildStoryboardCorrectionSummary flags scenes below threshold", () => {
    const report: StoryboardConsistencyReport = {
      storyboardId: "sb1",
      analyzedAt: new Date().toISOString(),
      overallScore: 70,
      driftWarnings: [],
      sceneReports: [
        {
          sceneId: "s1",
          sceneTitle: "Scene 2",
          order: 1,
          imageId: "img1",
          report: buildSceneConsistencyReport({
            sceneImage: {
              generatedPrompt: "generic",
              sceneTitle: "Scene 2",
              sceneDescription: "",
              sceneAction: "",
            },
            memory: baseMemory,
          }),
        },
      ],
    };
    const summary = buildStoryboardCorrectionSummary({
      storyboardId: "sb1",
      consistencyReport: report,
    });
    assert.ok(summary.scenesNeedingCorrection >= 1);
    assert.ok(summary.scenes.some((s) => s.action === "regenerate" || s.action === "review"));
  });

  it("buildScenePromptFromInput applies correction recommendations layer", () => {
    const snap = sceneSnapshotToPromptInput(
      {
        sceneId: "s1",
        title: "Test",
        description: "Desc",
        action: "walk",
        emotion: "happy",
        camera: "wide",
        transitionToNext: "",
        durationSeconds: 5,
        location: null,
        characters: [],
        props: [],
        voice: "",
        music: "",
        notes: "",
      },
      "commercial"
    );
    const base = buildScenePromptFromInput(snap);
    const withCorrections = buildScenePromptFromInput({
      ...snap,
      correctionRecommendations: [
        {
          id: "c1",
          type: "GeneralContinuity",
          severity: "medium",
          message: "Reinforce branding",
          promptPatch: "maintain green HomeCheff apron",
          source: "test",
        },
      ],
    });
    assert.ok(withCorrections.prompt.length > base.prompt.length);
    assert.ok(withCorrections.prompt.includes("HomeCheff apron"));
  });
});
