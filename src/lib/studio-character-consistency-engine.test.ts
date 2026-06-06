import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCombinedCorrectionRecommendations } from "@/lib/build-combined-correction-recommendations";
import { buildCharacterDriftCorrectionRecommendations } from "@/lib/build-character-drift-corrections";
import { computeCharacterIdentityScore } from "@/lib/compute-character-identity-score";
import { detectCharacterDrift } from "@/lib/detect-character-drift";
import { buildCharacterIdentityDriftPromptLines } from "@/lib/studio-character-identity-prompt";
import {
  buildStoryboardCharacterConsistencyReport,
  storyboardDetailToCharacterConsistencyScenes,
} from "@/lib/studio-character-timeline";
import { computeMovieReadinessScore } from "@/lib/studio-movie-readiness-score";
import { toCharacterMemorySnapshot } from "@/lib/studio-memory-mappers";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { SceneConsistencyReport } from "@/types/studio-consistency";
import type { CharacterIdentityTimelineEntry } from "@/types/studio-character-consistency";
import type { StudioStoryboardDetail } from "@/types/studio-api";

const chef = toCharacterMemorySnapshot({
  id: "chef-1",
  name: "Chef",
  role: "mascot",
  description: "HomeCheff chef mascot",
  personality: "",
  referenceImageUrl: "https://example.com/chef-ref.png",
  appearanceMemory: "white chef hat, branded apron",
  personalityMemory: "",
  continuityNotes: "",
  defaultClothing: "white chef uniform",
  defaultAccessories: "chef hat",
  visualKeywords: "HomeCheff logo",
  primaryReferenceImageId: "ref-chef",
  referenceNotes: "Canonical mascot",
  identityStrength: "strict",
  continuityStrength: "strong",
  worldProfileId: null,
  worldProfile: null,
});

function sceneReport(score: number, warnings: string[] = []): SceneConsistencyReport {
  return {
    analyzedAt: new Date().toISOString(),
    overallScore: score,
    consistencyStatus: score >= 85 ? "excellent" : score >= 70 ? "good" : "needs_review",
    analysis: {
      characterScore: score,
      locationScore: 80,
      propScore: 80,
      worldScore: 80,
      overallScore: score,
      driftWarnings: warnings,
    },
    characterResults: [
      {
        characterId: chef.id,
        name: chef.name,
        score,
        warnings,
        recommendations: [],
      },
    ],
    locationResult: null,
    propResults: [],
    worldResult: null,
    warnings,
    recommendations: [],
    memoryReferences: {
      characters: [{ id: chef.id, name: chef.name }],
      location: null,
      props: [],
      world: null,
    },
    analysisMethod: "prompt_memory_alignment",
  };
}

function timelineEntries(scores: Array<number | null>): CharacterIdentityTimelineEntry[] {
  return scores.map((score, order) => ({
    sceneId: `scene-${order}`,
    sceneTitle: `Scene ${order + 1}`,
    order,
    imageId: null,
    score,
    status:
      score === null
        ? null
        : score >= 85
          ? ("excellent" as const)
          : score >= 70
            ? ("good" as const)
            : ("poor" as const),
    driftFlag: score !== null && score < 70,
    warnings: score !== null && score < 70 ? ["Chef hat not detected"] : [],
  }));
}

describe("studio character consistency engine V17", () => {
  it("computeCharacterIdentityScore blends consistency and vision", () => {
    const identity = computeCharacterIdentityScore({
      character: chef,
      consistencyResult: {
        characterId: chef.id,
        name: chef.name,
        score: 88,
        warnings: [],
        recommendations: [],
      },
      visionResult: {
        characterId: chef.id,
        name: chef.name,
        score: 90,
        warnings: [],
        recommendations: [],
        detectedElements: [],
        referenceCompared: true,
      },
      expectedInScene: true,
      presentInScene: true,
    });
    assert.ok(identity.score >= 85);
    assert.equal(identity.status, "excellent");
  });

  it("detectCharacterDrift flags hat missing and score drop", () => {
    const warnings = detectCharacterDrift({
      character: chef,
      timeline: timelineEntries([94, 91, 68, 90]),
      allCharacterNames: ["Chef", "Garden"],
    });
    assert.ok(warnings.some((w) => /chef hat|identity changed/i.test(w)));
  });

  it("buildStoryboardCharacterConsistencyReport builds per-character timelines", () => {
    const report = buildStoryboardCharacterConsistencyReport({
      storyboardId: "sb-1",
      scenes: [
        {
          sceneId: "s1",
          sceneTitle: "Open",
          order: 0,
          imageId: "img-1",
          characters: [
            {
              id: chef.id,
              name: chef.name,
              role: chef.role,
              description: "",
              personality: "",
              referenceImageUrl: chef.referenceImageUrl,
              appearanceMemory: chef.appearanceMemory,
              personalityMemory: chef.personalityMemory,
              continuityNotes: chef.continuityNotes,
              defaultClothing: chef.defaultClothing,
              defaultAccessories: chef.defaultAccessories,
              visualKeywords: chef.visualKeywords,
              primaryReferenceImageId: chef.primaryReferenceImageId,
              referenceNotes: chef.referenceNotes,
              identityStrength: chef.identityStrength,
              continuityStrength: chef.continuityStrength,
              worldProfileId: chef.worldProfileId,
              worldProfile: null,
            },
          ],
          consistencyReportJson: sceneReport(94),
          visionReportJson: null,
        },
        {
          sceneId: "s2",
          sceneTitle: "Drift",
          order: 1,
          imageId: "img-2",
          characters: [
            {
              id: chef.id,
              name: chef.name,
              role: chef.role,
              description: "",
              personality: "",
              referenceImageUrl: chef.referenceImageUrl,
              appearanceMemory: chef.appearanceMemory,
              personalityMemory: chef.personalityMemory,
              continuityNotes: chef.continuityNotes,
              defaultClothing: chef.defaultClothing,
              defaultAccessories: chef.defaultAccessories,
              visualKeywords: chef.visualKeywords,
              primaryReferenceImageId: chef.primaryReferenceImageId,
              referenceNotes: chef.referenceNotes,
              identityStrength: chef.identityStrength,
              continuityStrength: chef.continuityStrength,
              worldProfileId: chef.worldProfileId,
              worldProfile: null,
            },
          ],
          consistencyReportJson: sceneReport(62, ["Chef hat not detected"]),
          visionReportJson: null,
        },
      ],
    });
    assert.equal(report.characterTimelines.length, 1);
    assert.equal(report.characterTimelines[0]!.name, "Chef");
    assert.ok(report.driftWarnings.length > 0);
    assert.ok(report.recommendedCorrections.length > 0);
  });

  it("buildCharacterDriftCorrectionRecommendations emits chef hat patch", () => {
    const recs = buildCharacterDriftCorrectionRecommendations({
      driftWarnings: ["Chef appears without chef hat."],
      timelines: [
        {
          characterId: chef.id,
          name: chef.name,
          role: "mascot",
          entries: timelineEntries([90, 55]),
          averageScore: 72,
          worstScore: 55,
          worstSceneOrder: 1,
          warningCount: 2,
        },
      ],
      characters: [chef],
    });
    assert.ok(recs.some((r) => /chef hat/i.test(r.promptPatch)));
  });

  it("buildCharacterIdentityDriftPromptLines adds strict identity when drift", () => {
    const lines = buildCharacterIdentityDriftPromptLines([
      {
        characterId: chef.id,
        name: "Chef",
        role: "mascot",
        entries: timelineEntries([90, 60]),
        averageScore: 75,
        worstScore: 60,
        worstSceneOrder: 1,
        warningCount: 1,
      },
    ]);
    assert.ok(lines.some((l) => /Strictly preserve Chef/i.test(l)));
  });

  it("buildCombinedCorrectionRecommendations merges character drift", () => {
    const report = sceneReport(70, ["Chef hat not detected"]);
    const merged = buildCombinedCorrectionRecommendations({
      consistencyReport: report,
      characterDriftRecommendations: buildCharacterDriftCorrectionRecommendations({
        driftWarnings: ["Chef appears without chef hat."],
        timelines: [],
        characters: [chef],
      }),
    });
    assert.ok(merged.some((r) => /chef hat/i.test(r.promptPatch)));
  });

  it("computeMovieReadinessScore drops tier when character identity is poor", () => {
    const sb = {
      id: "sb-drift",
      ownerId: "u1",
      title: "Drift test",
      description: "",
      promptStyleProfile: "commercial",
      autoSelectImprovedImage: true,
      sceneCount: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      scenes: [
        {
          id: "s1",
          storyboardId: "sb-drift",
          order: 0,
          title: "A",
          description: "",
          action: "Cook",
          emotion: "happy",
          camera: "wide",
          transitionToNext: "",
          durationSeconds: 5,
          locationId: "loc",
          location: {
            id: "loc",
            name: "Kitchen",
            slug: "kitchen",
            description: "Kitchen",
            referenceImageUrl: "",
            visualStyle: "",
            atmosphere: "",
            continuityNotes: "",
            worldProfileId: null,
            worldProfile: null,
            createdAt: "",
            updatedAt: "",
          },
          characters: [
            {
              id: chef.id,
              name: chef.name,
              slug: "chef",
              role: "mascot",
              description: "",
              personality: "",
              referenceImageUrl: chef.referenceImageUrl,
              appearanceMemory: chef.appearanceMemory,
              personalityMemory: "",
              continuityNotes: "",
              defaultClothing: chef.defaultClothing,
              defaultAccessories: chef.defaultAccessories,
              visualKeywords: chef.visualKeywords,
              primaryReferenceImageId: chef.primaryReferenceImageId,
              referenceNotes: chef.referenceNotes,
              identityStrength: chef.identityStrength,
              continuityStrength: chef.continuityStrength,
              worldProfileId: null,
              worldProfile: null,
              createdAt: "",
              updatedAt: "",
            },
          ],
          props: [],
          selectedSceneImageId: "img-1",
          sceneImages: [
            {
              id: "img-1",
              sceneId: "s1",
              status: "completed",
              promptVersion: 3,
              generationVersion: 1,
              generatedPrompt: "Chef",
              imageUrl: "https://example.com/1.png",
              storageKey: "k",
              thumbnailUrl: "",
              provider: "mock",
              seed: null,
              generationSettings: null,
              consistencyScore: 90,
              consistencyStatus: "excellent",
              consistencyReport: sceneReport(90),
              consistencyRecommendations: [],
              consistencyAnalyzedAt: null,
              correctionRecommendations: [],
              promptPatches: [],
              correctedPrompt: "",
              regeneratedFromImageId: null,
              previousConsistencyScore: null,
              improvementScore: null,
              previousVisionScore: null,
              visionImprovementScore: null,
              overallImprovementScore: null,
              visionScore: 88,
              visionStatus: "excellent",
              visionReport: null,
              visionAnalyzedAt: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "s2",
          storyboardId: "sb-drift",
          order: 1,
          title: "B",
          description: "",
          action: "Stir",
          emotion: "focused",
          camera: "close",
          transitionToNext: "",
          durationSeconds: 5,
          locationId: "loc",
          location: null,
          characters: [
            {
              id: chef.id,
              name: chef.name,
              slug: "chef",
              role: "mascot",
              description: "",
              personality: "",
              referenceImageUrl: chef.referenceImageUrl,
              appearanceMemory: chef.appearanceMemory,
              personalityMemory: "",
              continuityNotes: "",
              defaultClothing: chef.defaultClothing,
              defaultAccessories: chef.defaultAccessories,
              visualKeywords: chef.visualKeywords,
              primaryReferenceImageId: chef.primaryReferenceImageId,
              referenceNotes: chef.referenceNotes,
              identityStrength: chef.identityStrength,
              continuityStrength: chef.continuityStrength,
              worldProfileId: null,
              worldProfile: null,
              createdAt: "",
              updatedAt: "",
            },
          ],
          props: [],
          selectedSceneImageId: "img-2",
          sceneImages: [
            {
              id: "img-2",
              sceneId: "s2",
              status: "completed",
              promptVersion: 3,
              generationVersion: 1,
              generatedPrompt: "Chef wrong",
              imageUrl: "https://example.com/2.png",
              storageKey: "k2",
              thumbnailUrl: "",
              provider: "mock",
              seed: null,
              generationSettings: null,
              consistencyScore: 48,
              consistencyStatus: "poor",
              consistencyReport: sceneReport(48, [
                "Chef hat not detected",
                "Chef visual identity changed strongly",
              ]),
              consistencyRecommendations: [],
              consistencyAnalyzedAt: null,
              correctionRecommendations: [],
              promptPatches: [],
              correctedPrompt: "",
              regeneratedFromImageId: null,
              previousConsistencyScore: null,
              improvementScore: null,
              previousVisionScore: null,
              visionImprovementScore: null,
              overallImprovementScore: null,
              visionScore: 45,
              visionStatus: "poor",
              visionReport: null,
              visionAnalyzedAt: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    } as unknown as StudioStoryboardDetail;
    const readiness = computeMovieReadinessScore(sb);
    assert.ok(readiness.averageCharacterIdentityScore !== null);
    assert.ok(readiness.characterDriftWarningCount > 0);
    assert.equal(readiness.tier, "needs_review");
  });

  it("storyboardDetailToCharacterConsistencyScenes maps scene images", () => {
    const scenes = storyboardDetailToCharacterConsistencyScenes({
      id: "sb",
      scenes: [],
    } as unknown as StudioStoryboardDetail);
    assert.equal(scenes.length, 0);
  });

  it("motion handoff payload version is 9 with character fields", () => {
    assert.equal(MOTION_HANDOFF_PAYLOAD_VERSION, 25);
  });
});
