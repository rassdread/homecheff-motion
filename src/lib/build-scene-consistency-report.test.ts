import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSceneConsistencyReport } from "@/lib/build-scene-consistency-report";
import { analyzeCharacterConsistency } from "@/lib/analyze-character-consistency";
import { buildStoryboardConsistencyReport } from "@/lib/studio-consistency-timeline";

describe("studio consistency engine", () => {
  it("analyzeCharacterConsistency flags missing chef hat", () => {
    const result = analyzeCharacterConsistency(
      {
        id: "chef",
        name: "Chef",
        role: "mascot",
        appearanceMemory: "White chef hat. Green HomeCheff apron.",
        personalityMemory: "Friendly",
        continuityNotes: "",
        defaultClothing: "Green apron",
        defaultAccessories: "",
        visualKeywords: "clean, professional",
        referenceImageUrl: "",
        primaryReferenceImageId: "chef",
        referenceNotes: "",
        identityStrength: "strict",
        continuityStrength: "strong",
        worldProfileId: null,
        worldProfileName: null,
      },
      {
        generatedPrompt: "A generic kitchen scene with food preparation.",
        sceneTitle: "Kitchen",
        sceneDescription: "",
        sceneAction: "cooking",
      }
    );
    assert.ok(result.score < 80);
    assert.ok(result.warnings.some((w) => /hat|apron/i.test(w)));
  });

  it("buildSceneConsistencyReport aggregates scores", () => {
    const report = buildSceneConsistencyReport({
      sceneImage: {
        generatedPrompt:
          "HomeCheff Chef mascot with white chef hat and green apron in Community Garden with raised beds.",
        sceneTitle: "Garden",
        sceneDescription: "Community Garden",
        sceneAction: "harvest",
      },
      memory: {
        characters: [
          {
            id: "chef",
            name: "Chef",
            role: "mascot",
            appearanceMemory: "White chef hat. Green apron.",
            personalityMemory: "",
            continuityNotes: "",
            defaultClothing: "Green apron",
            defaultAccessories: "",
            visualKeywords: "clean",
            referenceImageUrl: "",
            primaryReferenceImageId: null,
            referenceNotes: "",
            identityStrength: "strong",
            continuityStrength: "strong",
            worldProfileId: null,
            worldProfileName: null,
          },
        ],
        location: {
          id: "garden",
          name: "Community Garden",
          category: "garden",
          worldMemory: "Raised beds",
          visualIdentity: "Vegetables",
          environmentKeywords: "green, organic",
          continuityNotes: "",
          referenceImageUrl: "",
          continuityStrength: "strong",
          worldProfileId: null,
          worldProfileName: null,
        },
        props: [],
        world: null,
        continuityStrength: "strong",
      },
    });
    assert.ok(report.overallScore >= 70);
    assert.ok(report.analysis.characterScore >= 70);
    assert.equal(report.analysisMethod, "prompt_memory_alignment");
    assert.ok(["excellent", "good", "needs_review", "poor"].includes(report.consistencyStatus));
  });

  it("buildStoryboardConsistencyReport builds timeline", () => {
    const report = buildStoryboardConsistencyReport({
      storyboardId: "sb-1",
      scenes: [
        {
          sceneId: "s1",
          sceneTitle: "One",
          order: 0,
          imageId: "img-1",
          report: {
            analyzedAt: new Date().toISOString(),
            overallScore: 94,
            consistencyStatus: "excellent",
            analysis: {
              characterScore: 94,
              locationScore: 94,
              propScore: 100,
              worldScore: 100,
              overallScore: 94,
              driftWarnings: [],
            },
            characterResults: [],
            locationResult: null,
            propResults: [],
            worldResult: null,
            warnings: [],
            recommendations: [],
            memoryReferences: {
              characters: [],
              location: null,
              props: [],
              world: null,
            },
            analysisMethod: "prompt_memory_alignment",
          },
        },
        {
          sceneId: "s2",
          sceneTitle: "Two",
          order: 1,
          imageId: "img-2",
          report: {
            analyzedAt: new Date().toISOString(),
            overallScore: 76,
            consistencyStatus: "good",
            analysis: {
              characterScore: 76,
              locationScore: 76,
              propScore: 100,
              worldScore: 100,
              overallScore: 76,
              driftWarnings: ["HomeCheff Mug branding inconsistent"],
            },
            characterResults: [],
            locationResult: null,
            propResults: [],
            worldResult: null,
            warnings: ["HomeCheff Mug branding inconsistent"],
            recommendations: ["Reinforce HomeCheff Mug: globe logo"],
            memoryReferences: {
              characters: [],
              location: null,
              props: [],
              world: null,
            },
            analysisMethod: "prompt_memory_alignment",
          },
        },
      ],
    });
    assert.equal(report.timeline.length, 2);
    assert.equal(report.timeline[0]?.overallScore, 94);
    assert.equal(report.timeline[1]?.overallScore, 76);
    assert.equal(report.overallScore, 85);
  });
});
