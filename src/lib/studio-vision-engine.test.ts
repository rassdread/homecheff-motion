import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeBrandingConsistency } from "@/lib/analyze-branding-vision-consistency";
import { analyzeCharacterVisionConsistency } from "@/lib/analyze-character-vision-consistency";
import { analyzeLocationVisionConsistency } from "@/lib/analyze-location-vision-consistency";
import { analyzePropVisionConsistency } from "@/lib/analyze-prop-vision-consistency";
import { analyzeWorldVisionConsistency } from "@/lib/analyze-world-vision-consistency";
import { buildCombinedCorrectionRecommendations } from "@/lib/build-combined-correction-recommendations";
import { buildSceneConsistencyReport } from "@/lib/build-scene-consistency-report";
import { buildVisionConsistencyReport } from "@/lib/build-vision-consistency-report";
import { buildVisionCorrectionRecommendations } from "@/lib/build-vision-correction-recommendations";
import { buildStoryboardVisionReport } from "@/lib/studio-vision-timeline";
import { MockStudioVisionProvider } from "@/server/studio-vision-providers/mock-vision-provider";
import type { CharacterMemorySnapshot } from "@/types/studio-memory-snapshots";

const chefMemory: CharacterMemorySnapshot = {
  id: "chef",
  name: "Chef",
  role: "mascot",
  appearanceMemory: "White chef hat. Green apron.",
  personalityMemory: "",
  continuityNotes: "",
  defaultClothing: "Green apron",
  defaultAccessories: "Chef hat",
  visualKeywords: "friendly",
  referenceImageUrl: "https://example.com/chef-ref.jpg",
  primaryReferenceImageId: null,
  referenceNotes: "",
  identityStrength: "strong",
  continuityStrength: "strong",
  worldProfileId: null,
  worldProfileName: null,
};

const baseMemory = {
  characters: [chefMemory],
  location: null,
  props: [],
  world: null,
  continuityStrength: "strong" as const,
};

describe("studio vision engine V13", () => {
  it("analyzeCharacterVisionConsistency flags missing hat", () => {
    const result = analyzeCharacterVisionConsistency({
      character: chefMemory,
      signal: {
        characterId: "chef",
        name: "Chef",
        present: true,
        clothingVisible: true,
        accessoriesVisible: false,
        mascotProportionsOk: true,
        detectedTraits: ["green apron"],
        missingTraits: ["chef hat"],
        notes: "",
      },
      referenceCompared: true,
    });
    assert.ok(result.score < 90);
    assert.ok(result.warnings.some((w) => /hat/i.test(w)));
    assert.ok(result.recommendations.some((r) => /hat/i.test(r)));
  });

  it("analyzeBrandingConsistency penalizes missing logo", () => {
    const result = analyzeBrandingConsistency({
      homecheffLogoVisible: false,
      logoPlacementOk: false,
      brandedPackagingVisible: false,
      detectedElements: [],
      missingElements: ["HomeCheff globe logo"],
      notes: "",
    });
    assert.ok(result.score < 70);
    assert.ok(result.warnings.some((w) => /logo/i.test(w)));
  });

  it("analyzeLocationVisionConsistency scores environment", () => {
    const result = analyzeLocationVisionConsistency({
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
      signal: {
        environmentElements: ["raised beds"],
        visualIdentityMatch: true,
        worldCharacteristicsMatch: true,
        missingElements: [],
        notes: "",
      },
      referenceCompared: false,
    });
    assert.ok(result.score >= 80);
  });

  it("analyzePropVisionConsistency flags invisible prop", () => {
    const result = analyzePropVisionConsistency({
      prop: {
        id: "mug",
        name: "HomeCheff mug",
        category: "prop",
        appearanceMemory: "White mug with logo",
        brandingRules: "HomeCheff logo on mug",
        continuityNotes: "",
        referenceImageUrl: "",
        continuityStrength: "strong",
        worldProfileId: null,
        worldProfileName: null,
      },
      signal: {
        propId: "mug",
        name: "HomeCheff mug",
        visible: false,
        brandingVisible: false,
        detectedTraits: [],
        missingTraits: ["mug"],
        notes: "",
      },
      referenceCompared: false,
    });
    assert.ok(result.score < 70);
  });

  it("analyzeWorldVisionConsistency scores style alignment", () => {
    const result = analyzeWorldVisionConsistency({
      world: {
        id: "w1",
        name: "HomeCheff World",
        description: "",
        visualStyle: "Warm commercial",
        tone: "Friendly",
        continuityRules: "Green brand accents",
        continuityStrength: "strong",
      },
      signal: {
        styleMatch: true,
        toneMatch: true,
        colorLanguageMatch: true,
        detectedElements: ["warm lighting"],
        missingElements: [],
        notes: "",
      },
    });
    assert.equal(result.score, 100);
  });

  it("MockStudioVisionProvider returns report via buildVisionConsistencyReport", async () => {
    const provider = new MockStudioVisionProvider();
    const raw = await provider.analyzeImage({
      sceneImageUrl: "https://example.com/vision-test-high.png",
      thumbnailUrl: null,
      generatedPrompt: "Chef with white chef hat and green HomeCheff apron",
      sceneTitle: "Kitchen",
      sceneDescription: "",
      sceneAction: "",
      memory: baseMemory,
      references: { characters: [], location: null, props: [] },
    });
    const report = buildVisionConsistencyReport({ raw, memory: baseMemory });
    assert.ok(report.overallVisionScore >= 75);
    assert.equal(report.providerId, "mock");
  });

  it("buildStoryboardVisionReport builds timeline", () => {
    const report = buildStoryboardVisionReport({
      storyboardId: "sb1",
      scenes: [
        {
          sceneId: "s1",
          sceneTitle: "A",
          order: 0,
          imageId: "i1",
          report: {
            analyzedAt: new Date().toISOString(),
            overallVisionScore: 95,
            visionStatus: "excellent",
            characterVisionScore: 95,
            locationVisionScore: 100,
            propVisionScore: 100,
            brandingVisionScore: 90,
            worldVisionScore: 100,
            visionWarnings: [],
            visionRecommendations: [],
            detectedElements: [],
            characterResults: [],
            locationResult: null,
            propResults: [],
            brandingResult: {
              score: 90,
              warnings: [],
              recommendations: [],
              detectedElements: [],
            },
            worldResult: null,
            providerId: "mock",
            analysisMethod: "mock_vision_heuristic",
            referenceComparisonUsed: false,
          },
        },
        {
          sceneId: "s2",
          sceneTitle: "B",
          order: 1,
          imageId: "i2",
          report: {
            analyzedAt: new Date().toISOString(),
            overallVisionScore: 72,
            visionStatus: "needs_review",
            characterVisionScore: 70,
            locationVisionScore: 100,
            propVisionScore: 100,
            brandingVisionScore: 60,
            worldVisionScore: 100,
            visionWarnings: ["Logo missing"],
            visionRecommendations: ["Reinforce logo"],
            detectedElements: [],
            characterResults: [],
            locationResult: null,
            propResults: [],
            brandingResult: {
              score: 60,
              warnings: ["Logo missing"],
              recommendations: ["Reinforce logo"],
              detectedElements: [],
            },
            worldResult: null,
            providerId: "mock",
            analysisMethod: "mock_vision_heuristic",
            referenceComparisonUsed: false,
          },
        },
      ],
    });
    assert.equal(report.timeline.length, 2);
    assert.ok(report.overallVisionScore > 0);
  });

  it("buildVisionCorrectionRecommendations feeds correction engine", () => {
    const visionReport = buildVisionConsistencyReport({
      raw: {
        providerId: "mock",
        analysisMethod: "mock_vision_heuristic",
        referenceComparisonUsed: false,
        detectedElements: [],
        summary: "",
        characters: [
          {
            characterId: "chef",
            name: "Chef",
            present: true,
            clothingVisible: true,
            accessoriesVisible: false,
            mascotProportionsOk: true,
            detectedTraits: [],
            missingTraits: ["chef hat"],
            notes: "",
          },
        ],
        location: null,
        props: [],
        branding: {
          homecheffLogoVisible: false,
          logoPlacementOk: false,
          brandedPackagingVisible: false,
          detectedElements: [],
          missingElements: ["logo"],
          notes: "",
        },
        world: null,
      },
      memory: baseMemory,
    });
    const recs = buildVisionCorrectionRecommendations(visionReport);
    assert.ok(recs.some((r) => r.source.startsWith("vision:")));
    assert.ok(recs.some((r) => /hat|logo/i.test(r.promptPatch + r.message)));
  });

  it("buildCombinedCorrectionRecommendations merges prompt and vision", () => {
    const consistencyReport = buildSceneConsistencyReport({
      sceneImage: {
        generatedPrompt: "generic kitchen",
        sceneTitle: "Kitchen",
        sceneDescription: "",
        sceneAction: "",
      },
      memory: baseMemory,
    });
    const visionReport = buildVisionConsistencyReport({
      raw: {
        providerId: "mock",
        analysisMethod: "mock_vision_heuristic",
        referenceComparisonUsed: false,
        detectedElements: [],
        summary: "",
        characters: [
          {
            characterId: "chef",
            name: "Chef",
            present: false,
            clothingVisible: false,
            accessoriesVisible: false,
            mascotProportionsOk: false,
            detectedTraits: [],
            missingTraits: [],
            notes: "",
          },
        ],
        location: null,
        props: [],
        branding: {
          homecheffLogoVisible: false,
          logoPlacementOk: false,
          brandedPackagingVisible: false,
          detectedElements: [],
          missingElements: [],
          notes: "",
        },
        world: null,
      },
      memory: baseMemory,
    });
    const merged = buildCombinedCorrectionRecommendations({
      consistencyReport,
      visionReport,
    });
    assert.ok(merged.length >= 2);
    assert.ok(merged.some((r) => r.message.startsWith("[Vision]")));
  });
});
