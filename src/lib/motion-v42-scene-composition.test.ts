import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attachSceneCompositionToHandoffPayload } from "@/lib/attach-scene-composition-handoff";
import { attachProviderExecutionToHandoffPayload } from "@/lib/attach-provider-execution-handoff";
import { buildAssetReadiness } from "@/lib/studio-production-readiness";
import { buildProductionChecklist } from "@/lib/studio-production-center";
import {
  buildSceneCompositionDirector,
  buildSceneCompositionForScene,
  isSceneCompositionPlanReady,
} from "@/lib/studio-scene-composition-director";
import { resolveSceneVisualFocus } from "@/lib/studio-scene-visual-focus";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type {
  StudioCharacterListItem,
  StudioPropListItem,
  StudioSceneDetail,
  StudioStoryboardDetail,
} from "@/types/studio-api";

function character(id: string, name: string): StudioCharacterListItem {
  return {
    id,
    ownerId: "u1",
    name,
    slug: name.toLowerCase(),
    role: "lead",
    description: `${name} description`,
    personality: "",
    referenceImageUrl: "",
    isMascot: false,
    appearanceMemory: "",
    personalityMemory: "",
    continuityNotes: "",
    defaultClothing: "",
    defaultAccessories: "",
    visualKeywords: "",
    primaryReferenceImageId: null,
    referenceNotes: "",
    identityStrength: "balanced",
    continuityStrength: "balanced",
    worldProfileId: null,
    worldProfile: null,
    voiceEnabled: false,
    voiceProvider: "",
    voiceProfile: "",
    voiceLanguage: "en",
    voiceGender: "",
    voiceStyle: "",
    voicePitch: "",
    voiceSpeed: "",
    voiceEmotion: "",
    voiceNotes: "",
    performanceEnabled: false,
    performanceStyle: "",
    performanceEnergy: "",
    performanceNotes: "",
    mouthAssetId: null,
    voiceAssetId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function prop(id: string, name: string, description = ""): StudioPropListItem {
  return {
    id,
    ownerId: "u1",
    name,
    slug: name.toLowerCase(),
    description,
    referenceImageUrl: "",
    visualKeywords: "",
    continuityNotes: "",
    worldProfileId: null,
    worldProfile: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function scene(overrides: Partial<StudioSceneDetail> & { order?: number } = {}): StudioSceneDetail {
  const order = overrides.order ?? 0;
  return {
    id: overrides.id ?? `sc-${order}`,
    storyboardId: "sb-v42",
    order,
    title: overrides.title ?? "Scene",
    description: overrides.description ?? "",
    action: overrides.action ?? "speaking",
    emotion: overrides.emotion ?? "happy",
    camera: overrides.camera ?? "medium_shot",
    shotType: overrides.shotType ?? "medium",
    cameraMovement: overrides.cameraMovement ?? "static",
    sceneEnergy: overrides.sceneEnergy ?? "dynamic",
    transitionToNext: overrides.transitionToNext ?? "cut",
    musicCueType: "",
    musicEnergyTarget: "",
    musicTransitionType: "",
    musicStartBehavior: "",
    musicEndBehavior: "",
    soundEnvironmentOverride: "",
    soundCharacterOverride: "",
    soundPropOverride: "",
    soundTransitionOverride: "",
    soundAmbientOverride: "",
    voicePriority: "",
    musicPriority: "",
    soundPriority: "",
    audioFocus: "",
    duckingMode: "",
    voiceAssetOverride: "",
    musicAssetOverride: "",
    ambienceAssetOverride: "",
    sfxAssetOverride: "",
    durationSeconds: 5,
    locationId: overrides.location?.id ?? null,
    location: overrides.location ?? null,
    characters: overrides.characters ?? [],
    props: overrides.props ?? [],
    sceneImages: [],
    selectedSceneImageId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function storyboard(scenes: StudioSceneDetail[]): StudioStoryboardDetail {
  return {
    id: "sb-v42",
    ownerId: "u1",
    title: "Composition Demo",
    description: "V42 test",
    status: "draft",
    promptStyleProfile: "commercial",
    directorProfile: "commercial",
    aiDirectorPrompt: "",
    aiDirectorStyleStrength: "balanced",
    voiceEnabled: false,
    voiceLanguage: "en",
    voiceProfile: null,
    voiceStyle: null,
    narrationMode: "narrator",
    voiceNarrationScript: "",
    musicEnabled: false,
    musicStyle: "",
    musicIntensity: "",
    musicNarrativeRole: "",
    musicNotes: "",
    soundEnabled: false,
    soundStyle: "",
    soundDensity: "",
    soundNotes: "",
    audioProductionEnabled: false,
    audioStyle: "",
    audioPriorityStrategy: "",
    audioNotes: "",
    audioAssetsEnabled: false,
    audioAssetNotes: "",
    autoSelectImprovedImage: true,
    sceneCount: scenes.length,
    subtitleEnabled: false,
    scenes,
    characters: [],
    locations: [],
    props: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as StudioStoryboardDetail;
}

function minimalHandoff(): MotionHandoffPayload {
  return {
    version: MOTION_HANDOFF_PAYLOAD_VERSION,
    storyboardId: "sb-v42",
    title: "Composition Demo",
    description: "",
    promptStyleProfile: "commercial",
    directorProfile: "commercial",
    shotDiversityScore: 50,
    characterMemory: [],
    locationMemory: null,
    propMemory: [],
    worldMemory: null,
    continuityStrength: "balanced",
    consistencyReport: null,
    overallConsistencyScore: 0,
    driftWarnings: [],
    correctionRecommendations: [],
    consistencyHistory: [],
    latestImprovementScore: null,
    visionReport: null,
    overallVisionScore: 0,
    visionWarnings: [],
    characterConsistencyReport: null,
    overallCharacterConsistencyScore: 0,
    characterDriftWarnings: [],
    perSceneCharacterIdentityScores: [],
    scenes: [],
  };
}

describe("Studio V42 scene composition", () => {
  it("handoff payload version is 22", () => {
    assert.equal(MOTION_HANDOFF_PAYLOAD_VERSION, 22);
  });

  it("composition model assigns character placement roles", () => {
    const s = scene({
      characters: [character("c1", "Chef"), character("c2", "Guest")],
    });
    const plan = buildSceneCompositionDirector(storyboard([s]));
    assert.equal(plan.version, 42);
    assert.equal(plan.characterPlacementPlans.length, 2);
    assert.equal(plan.characterPlacementPlans[0]!.visualRole, "primary_subject");
    assert.equal(plan.characterPlacementPlans[0]!.depth, "foreground");
    assert.equal(plan.characterPlacementPlans[1]!.visualRole, "secondary_subject");
  });

  it("resolveSceneVisualFocus picks chef as primary when speaking", () => {
    const focus = resolveSceneVisualFocus(
      scene({
        characters: [character("c1", "Chef")],
        action: "speaking to camera",
      })
    );
    assert.equal(focus.primary.kind, "character");
    assert.equal(focus.primary.entityName, "Chef");
  });

  it("product reveal focuses on prop", () => {
    const focus = resolveSceneVisualFocus(
      scene({
        action: "product reveal",
        props: [prop("p1", "Pan", "Cooking pan")],
      })
    );
    assert.equal(focus.primary.kind, "product");
    assert.equal(focus.primary.entityName, "Pan");
  });

  it("prop placement links to primary character", () => {
    const s = scene({
      characters: [character("c1", "Chef")],
      props: [prop("p1", "Pan")],
    });
    const plan = buildSceneCompositionDirector(storyboard([s]));
    assert.equal(plan.propPlacementPlans[0]!.linkedCharacterName, "Chef");
  });

  it("detects HomeCheff brand placement", () => {
    const s = scene({
      description: "HomeCheff logo on packaging",
      props: [prop("p1", "Box", "HomeCheff branded")],
    });
    const plan = buildSceneCompositionDirector(storyboard([s]));
    assert.ok(plan.brandPlacementPlans.some((b) => b.brandName === "HomeCheff"));
  });

  it("location composition reflects garden environment", () => {
    const s = scene({
      location: {
        id: "loc1",
        name: "Community Garden",
        description: "",
        referenceImageUrl: null,
      },
    });
    const loc = buildSceneCompositionDirector(storyboard([s])).locationCompositionPlans[0]!;
    assert.equal(loc.environmentFocus, "studio.composition.location.garden");
  });

  it("director warns when no primary subject", () => {
    const composition = buildSceneCompositionForScene(scene({ title: "Empty" }));
    assert.ok(
      composition.compositionWarnings.some((w) => w.code === "no_primary_subject")
    );
    assert.equal(isSceneCompositionPlanReady(buildSceneCompositionDirector(storyboard([scene()]))), false);
  });

  it("attachSceneCompositionToHandoffPayload adds V22 fields", () => {
    const sb = storyboard([
      scene({
        characters: [character("c1", "Chef")],
      }),
    ]);
    const attached = attachSceneCompositionToHandoffPayload(minimalHandoff(), { storyboard: sb });
    assert.ok(attached.sceneCompositionPlan?.enabled);
    assert.equal(attached.characterPlacementPlans?.length, 1);
    assert.ok(attached.visualFocusSummary?.includes("Chef"));
    assert.ok(attached.compositionWarnings?.length);
  });

  it("legacy v21 handoff without composition fields remains valid shape", () => {
    const legacy = {
      ...minimalHandoff(),
      version: 21 as typeof MOTION_HANDOFF_PAYLOAD_VERSION,
    };
    assert.equal(legacy.sceneCompositionPlan, undefined);
    assert.equal(legacy.version, 21);
  });

  it("composition attaches before provider execution in pipeline order", () => {
    const sb = storyboard([
      scene({
        characters: [character("c1", "Chef")],
      }),
    ]);
    let payload = attachSceneCompositionToHandoffPayload(minimalHandoff(), { storyboard: sb });
    payload = attachProviderExecutionToHandoffPayload(payload, { storyboard: sb });
    assert.ok(payload.sceneCompositionPlan);
    assert.ok(payload.providerExecutionPlan);
  });

  it("production readiness includes scene composition item", () => {
    const sb = storyboard([
      scene({ order: 0, characters: [character("c1", "Chef")] }),
      scene({ order: 1, id: "sc-1", characters: [character("c2", "Guest")] }),
    ]);
    const assets = buildAssetReadiness(sb);
    assert.ok(assets.some((a) => a.id === "composition"));
    const composition = assets.find((a) => a.id === "composition");
    assert.equal(composition?.level, "ready");
  });

  it("production checklist includes visual composition plan", () => {
    const sb = storyboard([
      scene({ order: 0, characters: [character("c1", "Chef")] }),
      scene({ order: 1, id: "sc-1", characters: [character("c2", "Guest")] }),
    ]);
    const checklist = buildProductionChecklist(sb);
    assert.ok(checklist.some((item) => item.id === "scene_composition" && item.passed));
  });
});
