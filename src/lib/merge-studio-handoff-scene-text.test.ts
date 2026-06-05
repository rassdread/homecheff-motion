import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeStudioHandoffIntoSceneText } from "@/lib/merge-studio-handoff-scene-text";
import { mapHandoffSceneToPersistedText } from "@/lib/studio-motion-handoff-map";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type { NormalizedSceneText } from "@/lib/story-overlay-templates";

function handoffScene(
  overrides: Partial<MotionHandoffPayload["scenes"][number]> = {}
): MotionHandoffPayload["scenes"][number] {
  return {
    sceneId: "scene-1",
    order: 0,
    title: "Chef cooking",
    description: "Kitchen scene",
    location: null,
    characters: [],
    props: [],
    action: "cooking",
    emotion: "proud",
    camera: "wide_shot",
    transitionToNext: "",
    durationSeconds: 8,
    selectedSceneImageId: null,
    selectedSceneImageUrl: null,
    selectedSceneImagePromptVersion: null,
    selectedSceneImageGenerationVersion: null,
    sceneImageReference: null,
    generatedPrompt: "prompt",
    stylePrompt: "style",
    continuityPrompt: "cont",
    sceneConsistencyScore: null,
    sceneConsistencyReport: null,
    sceneConsistencyRecommendations: [],
    sceneCorrectionRecommendations: [],
    sceneVisionScore: null,
    sceneVisionReport: null,
    selectedImageScore: null,
    selectedImageVisionScore: null,
    selectedImageConsistencyScore: null,
    selectedImageImprovementScore: null,
    selectedImageRecommended: false,
    promptVersion: {
      promptVersion: 1,
      generatedAt: "2026-01-01T00:00:00.000Z",
      sceneId: "scene-1",
      generatedPrompt: "prompt",
      styleProfile: "commercial",
      qualityScore: 80,
      qualityTier: "strong",
    },
    studioContext: {
      source: "studio",
      storyboardId: "sb-1",
      sceneId: "scene-1",
      action: "cooking",
      emotion: "proud",
      camera: "wide_shot",
      transitionToNext: "",
      location: null,
      characters: [],
      props: [],
      notes: "Kitchen scene",
    },
    ...overrides,
  };
}

function manualMotionText(): NormalizedSceneText {
  return {
    template: "hero",
    heroText: "My custom hero line",
    title: "My custom title",
    subtitle: "My custom subtitle",
    extraLines: ["Custom beat A", "Custom beat B"],
    accentWords: [],
    lines: [],
    heroFinale: true,
    heroFinaleText: "My custom finale",
    finaleFooter: "",
    footerLines: [],
    headlineBeats: ["MY CUSTOM HEADLINE"],
    titleBeats: ["My custom title"],
    subtitleBeats: ["My custom subtitle"],
    heroTextBeats: ["My custom hero line"],
    finaleTextBeats: ["My custom finale"],
    transitionDurationSeconds: 5,
    durationSeconds: 5,
    emotionMode: "manual",
    emotion: "cheerful",
    actingIntensity: "normal",
    overlayLayerStyles: {},
  };
}

describe("mergeStudioHandoffIntoSceneText syncTexts guard", () => {
  it("syncTexts:false preserves all manual Motion text including beat arrays", () => {
    const current = manualMotionText();
    const studio = handoffScene({
      studioTextBeats: {
        headlineBeats: ["STUDIO HEADLINE"],
        titleBeats: ["Studio title"],
        subtitleBeats: ["Studio subtitle from beats"],
        heroTextBeats: ["Studio hero"],
        finaleTextBeats: ["Studio finale"],
        beatLines: ["Studio beat"],
        heroText: "Studio hero",
        heroFinaleText: "Studio finale",
        template: "scene",
        source: "studio_auto",
        usedFields: ["title"],
        ignoredFields: [],
      },
    });

    const merged = mergeStudioHandoffIntoSceneText({
      current,
      studioScene: studio,
      syncTexts: false,
      syncEmotions: false,
      syncDurations: false,
      transitionSeconds: 5,
      isLast: false,
    });

    assert.deepEqual(merged.headlineBeats, current.headlineBeats);
    assert.deepEqual(merged.titleBeats, current.titleBeats);
    assert.deepEqual(merged.subtitleBeats, current.subtitleBeats);
    assert.deepEqual(merged.heroTextBeats, current.heroTextBeats);
    assert.deepEqual(merged.finaleTextBeats, current.finaleTextBeats);
    assert.equal(merged.title, current.title);
    assert.equal(merged.subtitle, current.subtitle);
    assert.equal(merged.heroText, current.heroText);
    assert.equal(merged.heroFinaleText, current.heroFinaleText);
    assert.deepEqual(merged.extraLines, current.extraLines);
  });

  it("syncTexts:true applies studioTextBeats from latest handoff", () => {
    const current = manualMotionText();
    const studio = handoffScene({
      studioTextBeats: {
        headlineBeats: ["STUDIO HEADLINE"],
        titleBeats: ["Studio title"],
        subtitleBeats: ["Studio subtitle from beats"],
        heroTextBeats: ["Studio hero"],
        finaleTextBeats: ["Studio finale"],
        beatLines: ["Studio beat"],
        heroText: "Studio hero",
        heroFinaleText: "Studio finale",
        template: "scene",
        source: "studio_auto",
        usedFields: ["title"],
        ignoredFields: [],
      },
    });

    const merged = mergeStudioHandoffIntoSceneText({
      current,
      studioScene: studio,
      syncTexts: true,
      syncEmotions: false,
      syncDurations: false,
      transitionSeconds: 5,
      isLast: true,
    });

    assert.deepEqual(merged.headlineBeats, ["STUDIO HEADLINE"]);
    assert.equal(merged.heroText, "Studio hero");
    assert.equal(merged.heroFinaleText, "Studio finale");
  });

  it("syncTexts:false still allows syncEmotions without touching text", () => {
    const current = manualMotionText();
    const studio = handoffScene({ emotion: "happy" });

    const merged = mergeStudioHandoffIntoSceneText({
      current,
      studioScene: studio,
      syncTexts: false,
      syncEmotions: true,
      syncDurations: false,
      transitionSeconds: 5,
      isLast: false,
    });

    assert.equal(merged.title, current.title);
    assert.equal(merged.subtitle, current.subtitle);
    assert.equal(merged.heroText, current.heroText);
    assert.equal(merged.emotionMode, "manual");
    assert.equal(merged.emotion, "cheerful");
  });
});

describe("legacy handoff without studioTextBeats", () => {
  it("v24 stored scene without studioTextBeats uses legacy Action: hero mapping", () => {
    const legacyScene = handoffScene();
    assert.equal(legacyScene.studioTextBeats, undefined);

    const mapped = mapHandoffSceneToPersistedText(legacyScene, 5);
    assert.equal(mapped.title, "Chef cooking");
    assert.equal(mapped.subtitle, "Kitchen scene");
    assert.equal(mapped.heroText, "Action: cooking");
    assert.equal(mapped.headlineBeats?.length ?? 0, 0);
    assert.equal(mapped.template, "scene");
  });

  it("legacy mapping is unchanged when studioTextBeats is explicitly absent on v25 handoff", () => {
    const scene = handoffScene({ studioTextBeats: undefined });
    const mapped = mapHandoffSceneToPersistedText(scene, 5);

    assert.equal(mapped.heroText, "Action: cooking");
    assert.deepEqual(mapped.extraLines, []);
    assert.equal(mapped.headlineBeats?.length ?? 0, 0);
  });

  it("merge with syncTexts:false on legacy handoff keeps manual text over studio fields", () => {
    const current = manualMotionText();
    const legacyStudio = handoffScene({ title: "Chef cooking", description: "Kitchen scene" });

    const merged = mergeStudioHandoffIntoSceneText({
      current,
      studioScene: legacyStudio,
      syncTexts: false,
      syncEmotions: false,
      syncDurations: false,
      transitionSeconds: 5,
      isLast: false,
    });

    assert.equal(merged.title, "My custom title");
    assert.equal(merged.subtitle, "My custom subtitle");
    assert.equal(merged.heroText, "My custom hero line");
  });
});
