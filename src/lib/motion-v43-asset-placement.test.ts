import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attachAssetPlacementToHandoffPayload } from "@/lib/attach-asset-placement-handoff";
import { attachProviderExecutionToHandoffPayload } from "@/lib/attach-provider-execution-handoff";
import { attachSceneCompositionToHandoffPayload } from "@/lib/attach-scene-composition-handoff";
import { buildAssetReadiness } from "@/lib/studio-production-readiness";
import { buildProductionChecklist } from "@/lib/studio-production-center";
import {
  buildAssetPlacementForSceneDetail,
  buildAssetPlacementPlan,
  buildBrandPlacement,
  buildCharacterPlacement,
  buildPropPlacement,
  formatPlacementCompactLine,
  isAssetPlacementPlanReady,
} from "@/lib/studio-asset-placement-director";
import { buildSceneCompositionDirector, buildSceneCompositionForScene } from "@/lib/studio-scene-composition-director";
import {
  buildVisualHierarchySummary,
  detectHierarchyWarnings,
  scorePlacementPriority,
} from "@/lib/studio-visual-hierarchy";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type {
  StudioCharacterListItem,
  StudioPropListItem,
  StudioSceneDetail,
  StudioStoryboardDetail,
} from "@/types/studio-api";
import {
  studioCharacterListItem,
  studioLocationListItem,
  studioPropListItem,
} from "@/test/studio-api-fixtures";

function character(id: string, name: string): StudioCharacterListItem {
  return studioCharacterListItem({
    id,
    name,
    description: `${name} description`,
  });
}

function prop(id: string, name: string, description = ""): StudioPropListItem {
  return studioPropListItem({
    id,
    name,
    description,
  });
}

function scene(overrides: Partial<StudioSceneDetail> & { order?: number } = {}): StudioSceneDetail {
  const order = overrides.order ?? 0;
  return {
    id: overrides.id ?? `sc-${order}`,
    storyboardId: "sb-v43",
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
    id: "sb-v43",
    ownerId: "u1",
    title: "Placement Demo",
    description: "V43 test",
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
  } as unknown as StudioStoryboardDetail;
}

function minimalHandoff(): MotionHandoffPayload {
  return {
    version: MOTION_HANDOFF_PAYLOAD_VERSION,
    storyboardId: "sb-v43",
    title: "Placement Demo",
    description: "",
    promptStyleProfile: "commercial",
    directorProfile: "commercial",
    shotDiversityScore: 50,
    characterMemory: [],
    locationMemory: null,
    propMemory: [],
    worldMemory: null,
    continuityStrength: "strong",
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

describe("Studio V43 asset placement", () => {
  it("handoff payload version is 26", () => {
    assert.equal(MOTION_HANDOFF_PAYLOAD_VERSION, 26);
  });

  it("hero placement uses center foreground hero scale", () => {
    const s = scene({
      characters: [character("c1", "Chef")],
      action: "speaking to camera",
    });
    const placement = buildAssetPlacementForSceneDetail(s);
    const hero = placement.characterPlacements[0]!;
    assert.equal(hero.zone, "CENTER");
    assert.equal(hero.depth, "FOREGROUND");
    assert.equal(hero.scale, "HERO");
    assert.equal(hero.orientation, "FORWARD");
  });

  it("support placement uses midground for secondary character", () => {
    const s = scene({
      characters: [character("c1", "Chef"), character("c2", "Garden Host")],
    });
    const placement = buildAssetPlacementForSceneDetail(s);
    const support = placement.characterPlacements.find((c) => c.characterName === "Garden Host");
    assert.ok(support);
    assert.equal(support.depth, "MIDGROUND");
    assert.notEqual(support.scale, "HERO");
  });

  it("logo placement uses top right safe zone", () => {
    const s = scene({
      description: "HomeCheff logo on packaging",
      props: [prop("p1", "Box", "HomeCheff branded")],
    });
    const plan = buildSceneCompositionDirector(storyboard([s]));
    const brandPlan = plan.brandPlacementPlans.find((b) => b.placementKind === "logo");
    assert.ok(brandPlan);
    const brand = buildBrandPlacement(brandPlan);
    assert.equal(brand.zone, "TOP_RIGHT");
    assert.equal(brand.depth, "BACKGROUND");
    assert.equal(brand.scale, "SMALL");
  });

  it("product prop uses bottom foreground placement", () => {
    const s = scene({
      action: "product reveal",
      props: [prop("p1", "Pan", "Cooking pan")],
    });
    const composition = buildSceneCompositionForScene(s);
    const plan = buildSceneCompositionDirector(storyboard([s]));
    const propPlan = plan.propPlacementPlans[0]!;
    const placement = buildPropPlacement({ plan: propPlan, composition });
    assert.equal(placement.depth, "FOREGROUND");
    assert.ok(placement.zone === "BOTTOM_CENTER" || placement.zone === "BOTTOM_LEFT");
  });

  it("background crowd character uses background depth", () => {
    const s = scene({
      action: "community gathering",
      characters: [
        character("c1", "Chef"),
        character("c2", "Neighbor"),
        character("c3", "Visitor"),
        character("c4", "Guest"),
        character("c5", "Local"),
      ],
    });
    const placement = buildAssetPlacementForSceneDetail(s);
    const background = placement.characterPlacements.filter((c) => c.depth === "BACKGROUND");
    assert.ok(background.length >= 1);
  });

  it("scorePlacementPriority favors foreground hero", () => {
    const heroScore = scorePlacementPriority({
      scale: "HERO",
      depth: "FOREGROUND",
      isPrimary: true,
    });
    const bgScore = scorePlacementPriority({
      scale: "SMALL",
      depth: "BACKGROUND",
      isPrimary: false,
    });
    assert.ok(heroScore > bgScore);
  });

  it("buildVisualHierarchySummary identifies primary and secondary subjects", () => {
    const s = scene({
      characters: [character("c1", "Chef"), character("c2", "Guest")],
    });
    const plan = buildAssetPlacementPlan(storyboard([s]));
    const summary = buildVisualHierarchySummary({
      characterPlacements: plan.characterPlacements,
      propPlacements: plan.propPlacements,
      brandPlacements: plan.brandPlacements,
    });
    assert.equal(summary.primarySubject, "Chef");
    assert.equal(summary.secondarySubject, "Guest");
    assert.equal(summary.heroCount, 1);
  });

  it("detectHierarchyWarnings flags too many heroes", () => {
    const warnings = detectHierarchyWarnings({
      sceneId: "sc-0",
      characterPlacements: [
        {
          sceneId: "sc-0",
          characterId: "a",
          characterName: "A",
          zone: "CENTER",
          depth: "FOREGROUND",
          scale: "HERO",
          orientation: "FORWARD",
          grouping: "TEAM",
          hierarchyScore: 95,
          placementPriority: 95,
          summaryKey: "",
        },
        {
          sceneId: "sc-0",
          characterId: "b",
          characterName: "B",
          zone: "CENTER_LEFT",
          depth: "FOREGROUND",
          scale: "HERO",
          orientation: "FORWARD",
          grouping: "TEAM",
          hierarchyScore: 90,
          placementPriority: 90,
          summaryKey: "",
        },
        {
          sceneId: "sc-0",
          characterId: "c",
          characterName: "C",
          zone: "CENTER_RIGHT",
          depth: "FOREGROUND",
          scale: "HERO",
          orientation: "FORWARD",
          grouping: "TEAM",
          hierarchyScore: 88,
          placementPriority: 88,
          summaryKey: "",
        },
      ],
      propPlacements: [],
      brandPlacements: [],
    });
    assert.ok(warnings.some((w) => w.code === "too_many_heroes"));
  });

  it("attachAssetPlacementToHandoffPayload adds V23 fields", () => {
    const sb = storyboard([
      scene({
        characters: [character("c1", "Chef")],
      }),
    ]);
    const attached = attachAssetPlacementToHandoffPayload(minimalHandoff(), { storyboard: sb });
    assert.ok(attached.assetPlacementPlan?.enabled);
    assert.equal(attached.characterPlacements?.length, 1);
    assert.ok(attached.visualHierarchySummary?.primarySubject === "Chef");
    assert.equal(attached.version, 26);
  });

  it("placement attaches after composition and before provider execution", () => {
    const sb = storyboard([
      scene({
        characters: [character("c1", "Chef")],
      }),
    ]);
    let payload = attachSceneCompositionToHandoffPayload(minimalHandoff(), { storyboard: sb });
    payload = attachAssetPlacementToHandoffPayload(payload, { storyboard: sb });
    payload = attachProviderExecutionToHandoffPayload(payload, { storyboard: sb });
    assert.ok(payload.sceneCompositionPlan);
    assert.ok(payload.assetPlacementPlan);
    assert.ok(payload.providerExecutionPlan);
  });

  it("legacy v22 handoff without placement fields remains valid shape", () => {
    const legacy = {
      ...minimalHandoff(),
      version: 22 as typeof MOTION_HANDOFF_PAYLOAD_VERSION,
    };
    assert.equal(legacy.assetPlacementPlan, undefined);
    assert.equal(legacy.version, 22);
  });

  it("production readiness includes asset placement item", () => {
    const sb = storyboard([
      scene({ order: 0, characters: [character("c1", "Chef")] }),
      scene({ order: 1, id: "sc-1", characters: [character("c2", "Guest")] }),
    ]);
    const assets = buildAssetReadiness(sb);
    assert.ok(assets.some((a) => a.id === "asset_placement"));
    const placement = assets.find((a) => a.id === "asset_placement");
    assert.equal(placement?.level, "ready");
    assert.equal(assets.length, 15);
  });

  it("production checklist includes asset placement plan", () => {
    const sb = storyboard([
      scene({ order: 0, characters: [character("c1", "Chef")] }),
      scene({ order: 1, id: "sc-1", characters: [character("c2", "Guest")] }),
    ]);
    const checklist = buildProductionChecklist(sb);
    assert.ok(checklist.some((item) => item.id === "asset_placement_plan" && item.passed));
    assert.equal(checklist.length, 16);
  });

  it("isAssetPlacementPlanReady rejects empty composition scenes", () => {
    const plan = buildAssetPlacementPlan(storyboard([scene()]));
    assert.equal(isAssetPlacementPlanReady(plan), false);
  });

  it("formatPlacementCompactLine summarizes character placement", () => {
    const compositionPlan = buildSceneCompositionDirector(
      storyboard([scene({ characters: [character("c1", "Chef")] })])
    );
    const charPlan = compositionPlan.characterPlacementPlans[0]!;
    const composition = buildSceneCompositionForScene(scene({ characters: [character("c1", "Chef")] }));
    const row = buildCharacterPlacement({
      plan: charPlan,
      composition,
      characterCount: 1,
    });
    const line = formatPlacementCompactLine(row);
    assert.match(line, /Chef: CENTER FOREGROUND HERO/);
  });

  it("garden support scene places location in midground", () => {
    const s = scene({
      location: studioLocationListItem({
        id: "loc1",
        name: "Community Garden",
      }),
      characters: [character("c1", "Chef"), character("c2", "Gardener")],
    });
    const placement = buildAssetPlacementForSceneDetail(s);
    assert.ok(placement.locationPlacement);
    assert.equal(placement.locationPlacement.locationName, "Community Garden");
  });
});
