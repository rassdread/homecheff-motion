import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attachAssetPlacementToHandoffPayload } from "@/lib/attach-asset-placement-handoff";
import { attachCharacterBlockingToHandoffPayload } from "@/lib/attach-character-blocking-handoff";
import { attachProviderExecutionToHandoffPayload } from "@/lib/attach-provider-execution-handoff";
import { attachSceneCompositionToHandoffPayload } from "@/lib/attach-scene-composition-handoff";
import { buildAttentionTarget } from "@/lib/studio-attention-director";
import { detectSceneInteraction } from "@/lib/studio-character-interactions";
import {
  buildCharacterAction,
  buildCharacterBlockingForSceneDetail,
  buildCharacterBlockingPlan,
  buildCharacterPose,
  buildMotionCharacterBlockingHandoffPlan,
  formatBlockingCompactLine,
  isCharacterBlockingPlanReady,
  resolveSceneSpeaker,
} from "@/lib/studio-character-blocking-director";
import { buildSceneCompositionForScene } from "@/lib/studio-scene-composition-director";
import { buildAssetReadiness } from "@/lib/studio-production-readiness";
import { buildProductionChecklist } from "@/lib/studio-production-center";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type {
  StudioCharacterListItem,
  StudioSceneDetail,
  StudioStoryboardDetail,
} from "@/types/studio-api";
import { studioCharacterListItem, studioLocationListItem } from "@/test/studio-api-fixtures";

function character(id: string, name: string): StudioCharacterListItem {
  return studioCharacterListItem({
    id,
    name,
    description: `${name} description`,
  });
}

function scene(overrides: Partial<StudioSceneDetail> & { order?: number } = {}): StudioSceneDetail {
  const order = overrides.order ?? 0;
  return {
    id: overrides.id ?? `sc-${order}`,
    storyboardId: "sb-v44",
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

function storyboard(
  scenes: StudioSceneDetail[],
  overrides: Partial<StudioStoryboardDetail> = {}
): StudioStoryboardDetail {
  return {
    id: "sb-v44",
    ownerId: "u1",
    title: "Blocking Demo",
    description: "V44 test",
    status: "draft",
    promptStyleProfile: "commercial",
    directorProfile: "commercial",
    aiDirectorPrompt: "",
    aiDirectorStyleStrength: "balanced",
    voiceEnabled: overrides.voiceEnabled ?? true,
    voiceLanguage: "en",
    voiceProfile: null,
    voiceStyle: null,
    narrationMode: overrides.narrationMode ?? "narrator",
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
    ...overrides,
  } as unknown as StudioStoryboardDetail;
}

function minimalHandoff(version = MOTION_HANDOFF_PAYLOAD_VERSION): MotionHandoffPayload {
  return {
    version,
    storyboardId: "sb-v44",
    title: "Blocking Demo",
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

describe("Studio V44 character blocking", () => {
  it("handoff payload version is 25", () => {
    assert.equal(MOTION_HANDOFF_PAYLOAD_VERSION, 25);
  });

  it("active speaker receives TALKING action", () => {
    const s = scene({
      action: "chef speaks to camera",
      characters: [character("c1", "Chef"), character("c2", "Garden")],
    });
    const blocking = buildCharacterBlockingForSceneDetail(s);
    const chef = blocking.characterActions.find((a) => a.characterName === "Chef");
    assert.equal(chef?.action, "TALKING");
    assert.equal(chef?.isActiveSpeaker, true);
  });

  it("narrator scene assigns LISTENING and OBSERVING to non-speakers", () => {
    const sb = storyboard([
      scene({
        action: "narrator introduces the garden",
        characters: [
          character("c1", "Chef"),
          character("c2", "Garden"),
          character("c3", "Designer"),
        ],
      }),
    ]);
    const blocking = buildCharacterBlockingPlan(sb).sceneBlockings[0]!;
    assert.equal(blocking.isNarratorScene, true);
    const chef = blocking.characterActions.find((a) => a.characterName === "Chef");
    const designer = blocking.characterActions.find((a) => a.characterName === "Designer");
    assert.equal(chef?.action, "LISTENING");
    assert.equal(designer?.action, "OBSERVING");
  });

  it("primary subject defaults to PRESENTING when not speaking", () => {
    const action = buildCharacterAction({
      scene: scene({ action: "show product", sceneEnergy: "neutral" }),
      characterId: "c1",
      characterName: "Chef",
      visualRole: "primary_subject",
      isActiveSpeaker: false,
      isNarratorScene: false,
    });
    assert.equal(action.action, "PRESENTING");
  });

  it("secondary subject listens when not speaking", () => {
    const action = buildCharacterAction({
      scene: scene({ action: "team meeting" }),
      characterId: "c2",
      characterName: "Guest",
      visualRole: "secondary_subject",
      isActiveSpeaker: false,
      isNarratorScene: false,
    });
    assert.equal(action.action, "LISTENING");
  });

  it("high energy walk maps to WALKING action", () => {
    const action = buildCharacterAction({
      scene: scene({ action: "walk through the park", sceneEnergy: "dynamic" }),
      characterId: "c1",
      characterName: "Chef",
      visualRole: "primary_subject",
      isActiveSpeaker: false,
      isNarratorScene: false,
    });
    assert.equal(action.action, "WALKING");
  });

  it("low energy supporting character observes", () => {
    const action = buildCharacterAction({
      scene: scene({ action: "quiet moment", sceneEnergy: "calm" }),
      characterId: "c3",
      characterName: "Observer",
      visualRole: "supporting_character",
      isActiveSpeaker: false,
      isNarratorScene: false,
    });
    assert.equal(action.action, "OBSERVING");
  });

  it("cooking scene assigns COOKING to primary subject", () => {
    const action = buildCharacterAction({
      scene: scene({ action: "cook pasta in kitchen" }),
      characterId: "c1",
      characterName: "Chef",
      visualRole: "primary_subject",
      isActiveSpeaker: false,
      isNarratorScene: false,
    });
    assert.equal(action.action, "COOKING");
  });

  it("handshake greeting maps to HANDSHAKE action", () => {
    const action = buildCharacterAction({
      scene: scene({ action: "warm handshake greeting" }),
      characterId: "c1",
      characterName: "Host",
      visualRole: "primary_subject",
      isActiveSpeaker: false,
      isNarratorScene: false,
    });
    assert.equal(action.action, "HANDSHAKE");
  });

  it("celebration maps to CELEBRATING action", () => {
    const action = buildCharacterAction({
      scene: scene({ action: "celebrate launch success" }),
      characterId: "c1",
      characterName: "Chef",
      visualRole: "primary_subject",
      isActiveSpeaker: false,
      isNarratorScene: false,
    });
    assert.equal(action.action, "CELEBRATING");
  });

  it("happy emotion maps to HAPPY pose", () => {
    const pose = buildCharacterPose({
      scene: scene({ emotion: "happy and warm" }),
      characterId: "c1",
      characterName: "Chef",
      visualRole: "primary_subject",
    });
    assert.equal(pose.pose, "HAPPY");
  });

  it("primary subject with dynamic energy gets CONFIDENT pose", () => {
    const pose = buildCharacterPose({
      scene: scene({ emotion: "neutral", sceneEnergy: "dynamic" }),
      characterId: "c1",
      characterName: "Chef",
      visualRole: "primary_subject",
    });
    assert.equal(pose.pose, "CONFIDENT");
  });

  it("two characters detect CONVERSATION interaction", () => {
    const s = scene({
      action: "two friends talk about dinner",
      characters: [character("c1", "Chef"), character("c2", "Guest")],
    });
    const composition = buildSceneCompositionForScene(s);
    const detected = detectSceneInteraction(s, composition.compositionType);
    assert.equal(detected.interactionType, "CONVERSATION");
    assert.equal(detected.participantNames.length, 2);
  });

  it("three characters detect GROUP_ACTIVITY interaction", () => {
    const s = scene({
      action: "community gathering",
      characters: [
        character("c1", "Chef"),
        character("c2", "Garden"),
        character("c3", "Designer"),
      ],
    });
    const composition = buildSceneCompositionForScene(s);
    const detected = detectSceneInteraction(s, composition.compositionType);
    assert.equal(detected.interactionType, "GROUP_ACTIVITY");
    assert.equal(detected.participantNames.length, 3);
  });

  it("business greeting scene detects HANDSHAKE interaction", () => {
    const s = scene({
      action: "business partners greet at office",
      characters: [character("c1", "Host"), character("c2", "Partner")],
    });
    const composition = buildSceneCompositionForScene(s);
    const detected = detectSceneInteraction(s, composition.compositionType);
    assert.equal(detected.interactionType, "HANDSHAKE");
  });

  it("cooking scene detects DEMONSTRATION interaction", () => {
    const s = scene({
      action: "chef cooks signature dish",
      characters: [character("c1", "Chef"), character("c2", "Assistant")],
    });
    const composition = buildSceneCompositionForScene(s);
    const detected = detectSceneInteraction(s, composition.compositionType);
    assert.equal(detected.interactionType, "DEMONSTRATION");
  });

  it("active speaker looks at CAMERA", () => {
    const s = scene({ characters: [character("c1", "Chef")] });
    const attention = buildAttentionTarget({
      scene: s,
      characterId: "c1",
      characterName: "Chef",
      visualRole: "primary_subject",
      isActiveSpeaker: true,
      isNarratorScene: false,
      primarySubjectName: "Chef",
      visualFocusKind: "character",
      visualFocusName: "Chef",
    });
    assert.equal(attention.target, "CAMERA");
  });

  it("secondary character looks at primary CHARACTER", () => {
    const s = scene({ characters: [character("c1", "Chef"), character("c2", "Guest")] });
    const attention = buildAttentionTarget({
      scene: s,
      characterId: "c2",
      characterName: "Guest",
      visualRole: "secondary_subject",
      isActiveSpeaker: false,
      isNarratorScene: false,
      primarySubjectName: "Chef",
      visualFocusKind: "character",
      visualFocusName: "Chef",
    });
    assert.equal(attention.target, "CHARACTER");
    assert.equal(attention.targetName, "Chef");
  });

  it("narrator scene background character looks at LOCATION", () => {
    const s = scene({
      location: studioLocationListItem({ id: "loc1", name: "Garden" }),
      characters: [
        character("c1", "Chef"),
        character("c2", "Garden"),
        character("c3", "Designer"),
      ],
    });
    const attention = buildAttentionTarget({
      scene: s,
      characterId: "c3",
      characterName: "Designer",
      visualRole: "background_character",
      isActiveSpeaker: false,
      isNarratorScene: true,
      primarySubjectName: "Chef",
      visualFocusKind: "character",
      visualFocusName: "Chef",
    });
    assert.equal(attention.target, "LOCATION");
  });

  it("resolveSceneSpeaker marks narrator when voice enabled", () => {
    const s = scene({ action: "narrator explains the story" });
    const speaker = resolveSceneSpeaker({
      scene: s,
      narrationMode: "narrator",
      voiceEnabled: true,
    });
    assert.equal(speaker.isNarratorScene, true);
    assert.equal(speaker.speakerId, null);
  });

  it("resolveSceneSpeaker picks named character when they speak", () => {
    const s = scene({
      action: "chef speaks about ingredients",
      characters: [character("c1", "Chef"), character("c2", "Garden")],
    });
    const speaker = resolveSceneSpeaker({
      scene: s,
      narrationMode: "commercial",
      voiceEnabled: true,
    });
    assert.equal(speaker.speakerId, "c1");
    assert.equal(speaker.speakerName, "Chef");
  });

  it("attachCharacterBlockingToHandoffPayload adds V24 fields", () => {
    const sb = storyboard([
      scene({
        characters: [character("c1", "Chef"), character("c2", "Garden")],
      }),
    ]);
    const attached = attachCharacterBlockingToHandoffPayload(minimalHandoff(), { storyboard: sb });
    assert.ok(attached.characterBlockingPlan?.enabled);
    assert.equal(attached.characterActions?.length, 2);
    assert.equal(attached.characterPoses?.length, 2);
    assert.ok(attached.attentionTargets && attached.attentionTargets.length >= 2);
    assert.equal(attached.version, 25);
  });

  it("blocking attaches after placement and before provider execution", () => {
    const sb = storyboard([
      scene({
        characters: [character("c1", "Chef")],
      }),
    ]);
    let payload = attachSceneCompositionToHandoffPayload(minimalHandoff(), { storyboard: sb });
    payload = attachAssetPlacementToHandoffPayload(payload, { storyboard: sb });
    payload = attachCharacterBlockingToHandoffPayload(payload, { storyboard: sb });
    payload = attachProviderExecutionToHandoffPayload(payload, { storyboard: sb });
    assert.ok(payload.sceneCompositionPlan);
    assert.ok(payload.assetPlacementPlan);
    assert.ok(payload.characterBlockingPlan);
    assert.ok(payload.providerExecutionPlan);
  });

  it("legacy v23 handoff without blocking fields remains valid shape", () => {
    const legacy = {
      ...minimalHandoff(23 as typeof MOTION_HANDOFF_PAYLOAD_VERSION),
      version: 23 as typeof MOTION_HANDOFF_PAYLOAD_VERSION,
    };
    assert.equal(legacy.characterBlockingPlan, undefined);
    assert.equal(legacy.characterActions, undefined);
    assert.equal(legacy.version, 23);
  });

  it("production readiness includes character blocking item", () => {
    const sb = storyboard([
      scene({ order: 0, characters: [character("c1", "Chef")] }),
      scene({ order: 1, id: "sc-1", characters: [character("c2", "Guest")] }),
    ]);
    const assets = buildAssetReadiness(sb);
    assert.ok(assets.some((a) => a.id === "character_blocking"));
    const blocking = assets.find((a) => a.id === "character_blocking");
    assert.equal(blocking?.level, "ready");
    assert.equal(assets.length, 15);
  });

  it("production checklist includes character blocking plan", () => {
    const sb = storyboard([
      scene({ order: 0, characters: [character("c1", "Chef")] }),
      scene({ order: 1, id: "sc-1", characters: [character("c2", "Guest")] }),
    ]);
    const checklist = buildProductionChecklist(sb);
    assert.ok(checklist.some((item) => item.id === "character_blocking_plan" && item.passed));
    assert.equal(checklist.length, 16);
  });

  it("isCharacterBlockingPlanReady rejects scenes without characters", () => {
    const plan = buildCharacterBlockingPlan(storyboard([scene()]));
    assert.equal(isCharacterBlockingPlanReady(plan), false);
  });

  it("formatBlockingCompactLine summarizes character action", () => {
    const line = formatBlockingCompactLine({
      sceneId: "sc-0",
      characterId: "c1",
      characterName: "Chef",
      action: "TALKING",
      engagementLevel: "high",
      isActiveSpeaker: true,
      summaryKey: "studio.blocking.action.summary",
    });
    assert.equal(line, "Chef: TALKING");
  });

  it("buildMotionCharacterBlockingHandoffPlan exports scene blockings", () => {
    const sb = storyboard([
      scene({
        characters: [character("c1", "Chef"), character("c2", "Garden")],
      }),
    ]);
    const handoff = buildMotionCharacterBlockingHandoffPlan(sb);
    assert.equal(handoff.sceneBlockings.length, 1);
    assert.equal(handoff.characterActions.length, 2);
  });

  it("empty character scene emits no_characters blocking warning", () => {
    const blocking = buildCharacterBlockingForSceneDetail(scene());
    assert.ok(blocking.blockingWarnings.some((w) => w.code === "no_characters"));
  });

  it("character speaking scene assigns TALKING only to active speaker", () => {
    const blocking = buildCharacterBlockingForSceneDetail(
      scene({
        action: "chef speaks about dinner",
        characters: [character("c1", "Chef"), character("c2", "Garden")],
      })
    );
    const talkers = blocking.characterActions.filter((a) => a.action === "TALKING");
    assert.equal(talkers.length, 1);
    assert.equal(talkers[0]?.characterName, "Chef");
    const garden = blocking.characterActions.find((a) => a.characterName === "Garden");
    assert.equal(garden?.action, "LISTENING");
  });
});
