import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMotionSceneStudioQa,
  buildMotionStudioIntelligenceSnapshot,
} from "@/lib/build-motion-studio-intelligence";
import {
  computeMotionRenderReadiness,
  motionReadinessShouldWarn,
} from "@/lib/compute-motion-render-readiness";
import { resolveMotionStudioIntelligence } from "@/lib/resolve-motion-studio-intelligence";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";

function handoffFixture(): MotionHandoffPayload {
  return {
    version: MOTION_HANDOFF_PAYLOAD_VERSION,
    storyboardId: "sb-v18",
    title: "Chef Story",
    description: "Promo",
    promptStyleProfile: "commercial",
    characterMemory: [],
    locationMemory: { id: "loc-1", name: "Kitchen", slug: "kitchen" } as MotionHandoffPayload["locationMemory"],
    propMemory: [],
    worldMemory: { id: "w1", name: "HomeCheff World" } as MotionHandoffPayload["worldMemory"],
    continuityStrength: "strong",
    consistencyReport: null,
    overallConsistencyScore: 82,
    driftWarnings: [],
    correctionRecommendations: [],
    consistencyHistory: [],
    latestImprovementScore: null,
    visionReport: null,
    overallVisionScore: 78,
    visionWarnings: [],
    characterConsistencyReport: {
      storyboardId: "sb-v18",
      analyzedAt: new Date().toISOString(),
      overallCharacterConsistencyScore: 88,
      perCharacterScores: [
        {
          characterId: "chef",
          name: "Chef",
          averageScore: 82,
          status: "good",
          warningCount: 1,
        },
        {
          characterId: "garden",
          name: "Garden",
          averageScore: 94,
          status: "excellent",
          warningCount: 0,
        },
      ],
      perSceneCharacterScores: [],
      characterTimelines: [
        {
          characterId: "chef",
          name: "Chef",
          role: "mascot",
          averageScore: 82,
          worstSceneOrder: 1,
          worstScore: 63,
          warningCount: 1,
          entries: [
            {
              sceneId: "s1",
              sceneTitle: "Open",
              order: 0,
              imageId: "i1",
              score: 94,
              status: "excellent",
              warnings: [],
              driftFlag: false,
            },
            {
              sceneId: "s2",
              sceneTitle: "Drift",
              order: 1,
              imageId: "i2",
              score: 63,
              status: "poor",
              warnings: ["Chef hat not detected"],
              driftFlag: true,
            },
          ],
        },
      ],
      driftWarnings: ["Chef appears without chef hat."],
      recommendedCorrections: [],
      scenesNeedingCharacterReview: 1,
    },
    overallCharacterConsistencyScore: 88,
    characterDriftWarnings: ["Chef appears without chef hat."],
    perSceneCharacterIdentityScores: [
      {
        sceneId: "s1",
        order: 0,
        characters: [
          { characterId: "chef", name: "Chef", score: 94, status: "excellent" },
          { characterId: "garden", name: "Garden", score: 92, status: "excellent" },
        ],
      },
      {
        sceneId: "s2",
        order: 1,
        characters: [
          { characterId: "chef", name: "Chef", score: 63, status: "poor" },
          { characterId: "garden", name: "Garden", score: 91, status: "excellent" },
        ],
      },
    ],
    scenes: [
      {
        sceneId: "s1",
        order: 0,
        title: "Scene 1",
        description: "",
        location: null,
        characters: [{ id: "chef", name: "Chef" } as MotionHandoffPayload["scenes"][number]["characters"][number]],
        props: [],
        action: "wave",
        emotion: "happy",
        camera: "wide",
        transitionToNext: "",
        durationSeconds: 5,
        selectedSceneImageId: "i1",
        selectedSceneImageUrl: "https://example.com/1.jpg",
        selectedSceneImagePromptVersion: 1,
        selectedSceneImageGenerationVersion: 1,
        sceneImageReference: null,
        studioContext: {
          source: "studio",
          storyboardId: "sb-v18",
          sceneId: "s1",
          action: "wave",
          emotion: "happy",
          camera: "wide",
          transitionToNext: "",
          location: null,
          characters: [],
          props: [],
          notes: "",
        },
        generatedPrompt: "p",
        stylePrompt: "s",
        continuityPrompt: "c",
        sceneConsistencyScore: 88,
        sceneConsistencyReport: null,
        sceneConsistencyRecommendations: [],
        sceneCorrectionRecommendations: [],
        sceneVisionScore: 90,
        sceneVisionReport: null,
        selectedImageScore: 89,
        selectedImageVisionScore: 90,
        selectedImageConsistencyScore: 88,
        selectedImageImprovementScore: null,
        selectedImageRecommended: true,
        promptVersion: {
          promptVersion: 1,
          generatedAt: "2026-01-01T00:00:00.000Z",
          sceneId: "s1",
          generatedPrompt: "p",
          styleProfile: "commercial",
          qualityScore: 80,
          qualityTier: "strong",
        },
      },
      {
        sceneId: "s2",
        order: 1,
        title: "Scene 2",
        description: "",
        location: null,
        characters: [],
        props: [],
        action: "cook",
        emotion: "focused",
        camera: "close",
        transitionToNext: "",
        durationSeconds: 5,
        selectedSceneImageId: "i2",
        selectedSceneImageUrl: "https://example.com/2.jpg",
        selectedSceneImagePromptVersion: 1,
        selectedSceneImageGenerationVersion: 1,
        sceneImageReference: null,
        studioContext: {
          source: "studio",
          storyboardId: "sb-v18",
          sceneId: "s2",
          action: "cook",
          emotion: "focused",
          camera: "close",
          transitionToNext: "",
          location: null,
          characters: [],
          props: [],
          notes: "",
        },
        generatedPrompt: "p2",
        stylePrompt: "s",
        continuityPrompt: "c",
        sceneConsistencyScore: 72,
        sceneConsistencyReport: null,
        sceneConsistencyRecommendations: [],
        sceneCorrectionRecommendations: [
          {
            id: "c1",
            type: "MissingCharacterTrait",
            severity: "high",
            message: "Chef hat missing",
            promptPatch: "Add chef hat",
            source: "test",
          },
        ],
        sceneVisionScore: 75,
        sceneVisionReport: null,
        selectedImageScore: 70,
        selectedImageVisionScore: 75,
        selectedImageConsistencyScore: 72,
        selectedImageImprovementScore: null,
        selectedImageRecommended: false,
        promptVersion: {
          promptVersion: 1,
          generatedAt: "2026-01-01T00:00:00.000Z",
          sceneId: "s2",
          generatedPrompt: "p2",
          styleProfile: "commercial",
          qualityScore: 60,
          qualityTier: "good",
        },
      },
    ],
  };
}

describe("motion studio intelligence V18", () => {
  it("buildMotionStudioIntelligenceSnapshot exposes character overviews and drift", () => {
    const snapshot = buildMotionStudioIntelligenceSnapshot(handoffFixture());
    assert.equal(snapshot.storyboardTitle, "Chef Story");
    assert.equal(snapshot.characterOverviews.length, 2);
    assert.equal(snapshot.characterOverviews[0]!.name, "Chef");
    assert.ok(snapshot.driftWarnings.some((w) => /chef hat/i.test(w.message)));
    assert.equal(snapshot.sceneBreakdowns.length, 2);
    assert.equal(snapshot.worldName, "HomeCheff World");
  });

  it("buildMotionSceneStudioQa attaches per-scene scores", () => {
    const payload = handoffFixture();
    const qa = buildMotionSceneStudioQa(payload.scenes[1]!, payload);
    assert.equal(qa.consistencyScore, 72);
    assert.equal(qa.characterIdentities.length, 2);
    assert.equal(qa.correctionRecommendations.length, 1);
  });

  it("computeMotionRenderReadiness flags needs_review when drift present", () => {
    const intelligence = buildMotionStudioIntelligenceSnapshot(handoffFixture());
    const readiness = computeMotionRenderReadiness({
      intelligence,
      sceneSlots: [
        {
          sceneId: "s1",
          text: { title: "A" } as never,
          image: { remoteWorkingUrl: "https://example.com/1.jpg" } as never,
          studioContext: { source: "studio" } as never,
        },
        {
          sceneId: "s2",
          text: { title: "B" } as never,
          image: { remoteWorkingUrl: "https://example.com/2.jpg" } as never,
          studioContext: { source: "studio" } as never,
        },
      ],
    });
    assert.equal(readiness.tier, "needs_review");
    assert.ok(motionReadinessShouldWarn(readiness));
  });

  it("legacy handoff without v9 marks partialData", () => {
    const legacy = { ...handoffFixture(), version: 8 as unknown as typeof MOTION_HANDOFF_PAYLOAD_VERSION };
    const snapshot = buildMotionStudioIntelligenceSnapshot(legacy);
    assert.equal(snapshot.legacyHandoff, true);
    assert.equal(snapshot.partialData, true);
  });

  it("resolveMotionStudioIntelligence falls back to slot studioQa", () => {
    const resolved = resolveMotionStudioIntelligence(
      {
        version: 1,
        savedAt: new Date().toISOString(),
        step: 1,
        stylePreset: "food_promo",
        motionText: "",
        continuityStrength: "balanced",
        chips: [],
        lockedTextMode: true,
        lockedTextLayers: [],
        chipTextBySlot: {},
        aspectRatio: "9:16",
        fastRenderMode: false,
        images: [],
        studioHandoff: {
          storyboardId: "sb",
          storyboardTitle: "Legacy",
          handoffVersion: 7,
          importedAt: new Date().toISOString(),
        },
      },
      [
        {
          sceneId: "s1",
          text: { title: "T" } as never,
          image: null,
          studioContext: {
            source: "studio",
            storyboardId: "sb",
            sceneId: "s1",
            action: "",
            emotion: "",
            camera: "",
            transitionToNext: "",
            location: null,
            characters: [{ id: "c1", name: "Chef" } as never],
            props: [],
            notes: "",
            studioQa: {
              sceneTitle: "Scene 1",
              order: 0,
              selectedSceneImageUrl: null,
              visionScore: 80,
              consistencyScore: 85,
              combinedImageScore: 82,
              characterIdentities: [
                {
                  characterId: "c1",
                  name: "Chef",
                  score: 85,
                  status: "good",
                },
              ],
              driftWarnings: [],
              correctionRecommendations: [],
            },
          },
        },
      ]
    );
    assert.ok(resolved);
    assert.equal(resolved!.partialData, true);
    assert.equal(resolved!.characterOverviews[0]!.identityScore, 85);
  });
});
