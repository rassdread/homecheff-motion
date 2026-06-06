/**
 * Studio V44 — Character Blocking Director (planning only).
 */

import { buildAttentionTargetsForScene } from "@/lib/studio-attention-director";
import { detectSceneInteraction } from "@/lib/studio-character-interactions";
import {
  buildSceneCompositionDirector,
  buildSceneCompositionForScene,
} from "@/lib/studio-scene-composition-director";
import { normalizeStudioNarrationMode } from "@/lib/studio-voice-profiles";
import type { StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";
import type {
  BlockingWarning,
  CharacterAction,
  CharacterActionPlan,
  CharacterBlockingPlan,
  CharacterInteractionPlan,
  CharacterPose,
  CharacterPosePlan,
  EngagementLevel,
  MotionCharacterBlockingHandoffPlan,
  SceneCharacterBlocking,
} from "@/types/studio-character-blocking";
import type { SceneVisualRole } from "@/types/studio-scene-composition";

function sceneActionText(scene: StudioSceneDetail): string {
  return `${scene.action} ${scene.description} ${scene.title}`.toLowerCase();
}

function isHighEnergy(energy: string): boolean {
  return energy === "dynamic" || energy === "intense";
}

function isLowEnergy(energy: string): boolean {
  return energy === "calm" || energy === "neutral" || energy === "soft";
}

function roleForIndex(index: number, total: number): SceneVisualRole {
  if (index === 0) {
    return "primary_subject";
  }
  if (index === 1) {
    return "secondary_subject";
  }
  if (index < total - 1) {
    return "supporting_character";
  }
  return "background_character";
}

export function resolveSceneSpeaker(params: {
  scene: StudioSceneDetail;
  narrationMode: string;
  voiceEnabled: boolean;
}): {
  speakerId: string | null;
  speakerName: string | null;
  isNarratorScene: boolean;
} {
  const narrationMode = normalizeStudioNarrationMode(params.narrationMode);
  const text = sceneActionText(params.scene);
  const isNarratorScene =
    narrationMode === "narrator" && params.voiceEnabled && !text.includes("character speaks");

  if (isNarratorScene) {
    return { speakerId: null, speakerName: null, isNarratorScene: true };
  }

  for (const row of params.scene.characters) {
    const name = row.name.toLowerCase();
    if (text.includes(name) && (text.includes("speak") || text.includes("talk") || text.includes("present"))) {
      return {
        speakerId: row.id,
        speakerName: row.name,
        isNarratorScene: false,
      };
    }
  }

  if (
    text.includes("speak") ||
    text.includes("talk") ||
    text.includes("present") ||
    text.includes("narrat")
  ) {
    const primary = params.scene.characters[0];
    if (primary) {
      return {
        speakerId: primary.id,
        speakerName: primary.name,
        isNarratorScene: false,
      };
    }
  }

  return { speakerId: null, speakerName: null, isNarratorScene: false };
}

export function buildCharacterAction(params: {
  scene: StudioSceneDetail;
  characterId: string;
  characterName: string;
  visualRole: SceneVisualRole;
  isActiveSpeaker: boolean;
  isNarratorScene: boolean;
}): CharacterActionPlan {
  const text = sceneActionText(params.scene);
  const energy = params.scene.sceneEnergy ?? "neutral";
  let action: CharacterAction = "STANDING";
  let engagement: EngagementLevel = "medium";

  if (params.isActiveSpeaker) {
    action = "TALKING";
    engagement = "high";
  } else if (params.isNarratorScene) {
    action = params.visualRole === "background_character" ? "OBSERVING" : "LISTENING";
    engagement = "low";
  } else if (text.includes("cook") || text.includes("kitchen")) {
    action = params.visualRole === "primary_subject" ? "COOKING" : "OBSERVING";
    engagement = params.visualRole === "primary_subject" ? "high" : "low";
  } else if (text.includes("shop") || text.includes("market")) {
    action = params.visualRole === "primary_subject" ? "SHOPPING" : "OBSERVING";
    engagement = params.visualRole === "primary_subject" ? "medium" : "low";
  } else if (text.includes("handshake") || text.includes("greet")) {
    action = "HANDSHAKE";
    engagement = "medium";
  } else if (text.includes("wave")) {
    action = "WAVING";
    engagement = "medium";
  } else if (text.includes("celebrat")) {
    action = "CELEBRATING";
    engagement = "high";
  } else if (text.includes("point")) {
    action = "POINTING";
    engagement = "high";
  } else if (text.includes("run")) {
    action = "RUNNING";
    engagement = "high";
  } else if (text.includes("walk") && isHighEnergy(energy)) {
    action = "WALKING";
    engagement = "high";
  } else if (text.includes("sit")) {
    action = "SITTING";
    engagement = "low";
  } else if (text.includes("phone")) {
    action = "USING_PHONE";
    engagement = "medium";
  } else if (text.includes("hold")) {
    action = "HOLDING_ITEM";
    engagement = "medium";
  } else if (text.includes("work")) {
    action = "WORKING";
    engagement = "medium";
  } else if (text.includes("look") || text.includes("watch")) {
    action = "LOOKING";
    engagement = "medium";
  } else if (text.includes("present") || params.visualRole === "primary_subject") {
    action = "PRESENTING";
    engagement = isHighEnergy(energy) ? "high" : "medium";
  } else if (params.visualRole === "secondary_subject") {
    action = "LISTENING";
    engagement = "medium";
  } else if (params.visualRole === "supporting_character") {
    action = isLowEnergy(energy) ? "OBSERVING" : "LISTENING";
    engagement = "low";
  } else {
    action = isLowEnergy(energy) ? "OBSERVING" : "STANDING";
    engagement = "low";
  }

  return {
    sceneId: params.scene.id,
    characterId: params.characterId,
    characterName: params.characterName,
    action,
    engagementLevel: engagement,
    isActiveSpeaker: params.isActiveSpeaker,
    summaryKey: "studio.blocking.action.summary",
  };
}

export function buildCharacterPose(params: {
  scene: StudioSceneDetail;
  characterId: string;
  characterName: string;
  visualRole: SceneVisualRole;
}): CharacterPosePlan {
  const emotion = (params.scene.emotion ?? "neutral").toLowerCase();
  const energy = params.scene.sceneEnergy ?? "neutral";
  let pose: CharacterPose = "NEUTRAL";

  if (emotion.includes("happy") || emotion.includes("joy") || emotion.includes("warm")) {
    pose = "HAPPY";
  } else if (emotion.includes("excit") || emotion.includes("energetic")) {
    pose = "EXCITED";
  } else if (emotion.includes("serious") || emotion.includes("concern") || emotion.includes("tense")) {
    pose = "SERIOUS";
  } else if (emotion.includes("thought") || emotion.includes("reflect") || emotion.includes("curious")) {
    pose = "THOUGHTFUL";
  } else if (params.visualRole === "primary_subject") {
    pose = isHighEnergy(energy) ? "CONFIDENT" : "FOCUSED";
  } else if (params.visualRole === "secondary_subject") {
    pose = "FRIENDLY";
  }

  return {
    sceneId: params.scene.id,
    characterId: params.characterId,
    characterName: params.characterName,
    pose,
    emotionSource: params.scene.emotion || "neutral",
    summaryKey: "studio.blocking.pose.summary",
  };
}

export function buildCharacterInteraction(
  scene: StudioSceneDetail,
  compositionType: ReturnType<typeof buildSceneCompositionForScene>["compositionType"]
): CharacterInteractionPlan {
  const detected = detectSceneInteraction(scene, compositionType);
  return {
    sceneId: scene.id,
    interactionType: detected.interactionType,
    participantIds: detected.participantIds,
    participantNames: detected.participantNames,
    descriptionKey: detected.descriptionKey,
  };
}

function formatBlockingSummary(blocking: SceneCharacterBlocking): string {
  const parts = blocking.characterActions.slice(0, 3).map(
    (row) => `${row.characterName}: ${row.action}`
  );
  if (blocking.interaction.interactionType !== "NONE") {
    parts.push(blocking.interaction.interactionType);
  }
  return parts.join(" · ") || "studio.blocking.summary.empty";
}

function detectBlockingWarnings(scene: SceneCharacterBlocking): BlockingWarning[] {
  const warnings: BlockingWarning[] = [];
  if (scene.characterActions.length === 0) {
    warnings.push({
      code: "no_characters",
      severity: "warning",
      messageKey: "studio.blocking.warning.noCharacters",
      sceneId: scene.sceneId,
    });
  }
  const talkers = scene.characterActions.filter((a) => a.action === "TALKING");
  if (talkers.length > 1) {
    warnings.push({
      code: "multiple_speakers",
      severity: "warning",
      messageKey: "studio.blocking.warning.multipleSpeakers",
      sceneId: scene.sceneId,
      params: { count: talkers.length },
    });
  }
  return warnings;
}

export function buildCharacterBlockingForScene(
  scene: StudioSceneDetail,
  storyboard: StudioStoryboardDetail
): SceneCharacterBlocking {
  const composition = buildSceneCompositionForScene(scene);
  const speaker = resolveSceneSpeaker({
    scene,
    narrationMode: storyboard.narrationMode ?? "narrator",
    voiceEnabled: storyboard.voiceEnabled ?? false,
  });
  const interaction = buildCharacterInteraction(scene, composition.compositionType);
  const roles = scene.characters.map((row, index) => ({
    characterId: row.id,
    characterName: row.name,
    visualRole: roleForIndex(index, scene.characters.length),
  }));

  const characterActions = roles.map((row) =>
    buildCharacterAction({
      scene,
      characterId: row.characterId,
      characterName: row.characterName,
      visualRole: row.visualRole,
      isActiveSpeaker: row.characterId === speaker.speakerId,
      isNarratorScene: speaker.isNarratorScene,
    })
  );
  const characterPoses = roles.map((row) =>
    buildCharacterPose({
      scene,
      characterId: row.characterId,
      characterName: row.characterName,
      visualRole: row.visualRole,
    })
  );
  const primaryName =
    composition.visualFocus.entityName ?? scene.characters[0]?.name ?? null;
  const attentionTargets = buildAttentionTargetsForScene({
    scene,
    roles,
    activeSpeakerId: speaker.speakerId,
    isNarratorScene: speaker.isNarratorScene,
    primarySubjectName: primaryName,
    visualFocusKind: composition.visualFocus.kind,
    visualFocusName: composition.visualFocus.entityName,
  });

  const blocking: SceneCharacterBlocking = {
    sceneId: scene.id,
    order: scene.order,
    sceneGoal: composition.compositionType,
    activeSpeakerId: speaker.speakerId,
    activeSpeakerName: speaker.speakerName,
    isNarratorScene: speaker.isNarratorScene,
    blockingSummary: "",
    characterActions,
    characterPoses,
    interaction,
    attentionTargets,
    blockingWarnings: [],
  };
  blocking.blockingSummary = formatBlockingSummary(blocking);
  blocking.blockingWarnings = detectBlockingWarnings(blocking);
  return blocking;
}

function singleSceneStoryboardStub(scene: StudioSceneDetail): StudioStoryboardDetail {
  return {
    id: scene.storyboardId,
    ownerId: "stub",
    title: scene.title,
    description: "",
    status: "draft",
    promptStyleProfile: "commercial",
    directorProfile: "commercial",
    aiDirectorPrompt: "",
    aiDirectorStyleStrength: "balanced",
    voiceEnabled: false,
    voiceLanguage: "en",
    voiceProfile: "",
    voiceStyle: "",
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
    audioAssetLinks: { version: 1 },
    autoSelectImprovedImage: true,
    sceneCount: 1,
    subtitleEnabled: false,
    scenes: [scene],
    characters: [],
    locations: [],
    props: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as StudioStoryboardDetail;
}

export function buildCharacterBlockingForSceneDetail(scene: StudioSceneDetail): SceneCharacterBlocking {
  return buildCharacterBlockingForScene(scene, singleSceneStoryboardStub(scene));
}

export function buildCharacterBlockingPlan(storyboard: StudioStoryboardDetail): CharacterBlockingPlan {
  const scenes = [...(storyboard.scenes ?? [])].sort((a, b) => a.order - b.order);
  const compositionPlan = buildSceneCompositionDirector(storyboard);

  if (scenes.length === 0) {
    return {
      enabled: false,
      version: 44,
      sceneBlockings: [],
      characterActions: [],
      characterPoses: [],
      characterInteractions: [],
      attentionTargets: [],
      blockingWarnings: [
        {
          code: "no_scenes",
          severity: "warning",
          messageKey: "studio.blocking.warning.noScenes",
        },
      ],
    };
  }

  const sceneBlockings = scenes.map((scene) => buildCharacterBlockingForScene(scene, storyboard));
  const blockingWarnings = [
    ...sceneBlockings.flatMap((s) => s.blockingWarnings),
    ...(compositionPlan.compositionWarnings.length > 0
      ? [
          {
            code: "composition_inherited_warnings",
            severity: "info" as const,
            messageKey: "studio.blocking.warning.inheritedComposition",
          },
        ]
      : []),
  ];

  return {
    enabled: compositionPlan.enabled,
    version: 44,
    sceneBlockings,
    characterActions: sceneBlockings.flatMap((s) => s.characterActions),
    characterPoses: sceneBlockings.flatMap((s) => s.characterPoses),
    characterInteractions: sceneBlockings.map((s) => s.interaction),
    attentionTargets: sceneBlockings.flatMap((s) => s.attentionTargets),
    blockingWarnings,
  };
}

export function buildMotionCharacterBlockingHandoffPlan(
  storyboard: StudioStoryboardDetail
): MotionCharacterBlockingHandoffPlan {
  const plan = buildCharacterBlockingPlan(storyboard);
  return {
    enabled: plan.enabled,
    sceneBlockings: plan.sceneBlockings,
    characterActions: plan.characterActions,
    characterPoses: plan.characterPoses,
    characterInteractions: plan.characterInteractions,
    attentionTargets: plan.attentionTargets,
    blockingWarnings: plan.blockingWarnings,
  };
}

export function isCharacterBlockingPlanReady(plan: CharacterBlockingPlan): boolean {
  if (!plan.enabled || plan.sceneBlockings.length === 0) {
    return false;
  }
  const hasBlocking = plan.blockingWarnings.some(
    (w) => w.severity === "warning" && (w.code === "no_characters" || w.code === "no_scenes")
  );
  if (hasBlocking) {
    return false;
  }
  return plan.sceneBlockings.every((scene) => scene.characterActions.length > 0);
}

export function formatBlockingCompactLine(action: CharacterActionPlan): string {
  return `${action.characterName}: ${action.action}`;
}
