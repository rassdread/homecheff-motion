import type { AssistantActionId } from "@/lib/assistant-action-registry";
import {
  buildAssistantContextSnapshot,
  type AssistantContextSnapshot,
  type AssistantProjectContext,
} from "@/lib/assistant-context-layer";
import { buildAssistantActionRoute, type AssistantRouteContext } from "@/lib/assistant-route-builder";
import { enrichPrefillWithProducerAnalysis } from "@/lib/assistant-producer-mode";
import { createAssistantPrefillId } from "@/lib/assistant-prefill-storage";
import type {
  AssistantPrefillActivityStep,
  AssistantPrefillIntent,
  AssistantPrefillPackage,
  AssistantPrefillQuestion,
  AssistantPrefillReadiness,
} from "@/types/assistant-prefill";
import { buildActionPresetPrefillPackage } from "@/lib/motion-action-preset-prefill";
import {
  buildEditorMorphActionRoute,
  detectEditorMorphActionFromMessage,
  getEditorMorphAction,
} from "@/lib/editor-morph-actions";
import type { MotionActionPresetId } from "@/types/motion-action-presets";

export type AssistantPrefillDetectResult =
  | { kind: "none" }
  | {
      kind: "prefill";
      intent: AssistantPrefillIntent;
      actionId: AssistantActionId;
      understoodKey: `assistant.understood.${string}`;
    };

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function includesAny(hay: string, needles: string[]): boolean {
  return needles.some((needle) => hay.includes(needle));
}

export function detectAssistantPrefillIntent(message: string): AssistantPrefillDetectResult {
  const text = normalize(message);

  if (
    includesAny(text, [
      "jas op",
      "outfit",
      "kleding",
      "jacket on",
      "put on",
      "clothing from",
      "outfit from",
      "zet deze jas",
    ]) ||
    (includesAny(text, ["gezicht niet", "face not", "verander mijn gezicht niet", "don't change my face"]) &&
      includesAny(text, ["jas", "kleding", "outfit", "clothing"]))
  ) {
    return {
      kind: "prefill",
      intent: "fusion_outfit",
      actionId: "create_fusion",
      understoodKey: "assistant.understood.fusionOutfit",
    };
  }

  if (
    includesAny(text, [
      "ouder worden",
      "age progression",
      "leeftijd",
      "aging",
      "familie foto",
    ])
  ) {
    return {
      kind: "prefill",
      intent: "fusion_age_progression",
      actionId: "create_fusion",
      understoodKey: "assistant.understood.fusionAge",
    };
  }

  if (includesAny(text, ["logo plaats", "logo placement", "logo top-right", "logo rechts"])) {
    return {
      kind: "prefill",
      intent: "fusion_logo_placement",
      actionId: "create_fusion",
      understoodKey: "assistant.understood.fusionLogo",
    };
  }

  if (
    includesAny(text, [
      "selfie",
      "animeren",
      "motion-ready",
      "motion ready",
      "voor animatie",
      "for animation",
      "later animeren",
      "animatie personage",
    ])
  ) {
    return {
      kind: "prefill",
      intent: "character_motion_ready",
      actionId: "prepare_motion_character",
      understoodKey: "assistant.understood.motionReadyCharacter",
    };
  }

  if (
    includesAny(text, [
      "promotievideo",
      "promotion video",
      "homecheff",
      "verhaal voor",
      "story for",
      "studio verhaal",
      "brand video",
    ])
  ) {
    return {
      kind: "prefill",
      intent: "studio_story",
      actionId: "create_motion_video",
      understoodKey: "assistant.understood.studioStory",
    };
  }

  if (includesAny(text, ["van deze foto", "from this photo", "from reference", "referentie"])) {
    return {
      kind: "prefill",
      intent: "character_from_reference",
      actionId: "create_character_from_reference",
      understoodKey: "assistant.understood.characterFromReference",
    };
  }

  const morphAction = detectEditorMorphActionFromMessage(message);
  if (morphAction) {
    const morphDef = getEditorMorphAction(morphAction);
    return {
      kind: "prefill",
      intent: morphDef.target === "animal" ? "animal_morph" : "human_morph",
      actionId: "edit_mascot",
      understoodKey:
        morphDef.target === "animal"
          ? "assistant.understood.animalMorph"
          : "assistant.understood.humanMorph",
    };
  }

  if (
    includesAny(text, [
      "mascotte bijwerken",
      "mascot bijwerken",
      "mascotte aanpassen",
      "mascot aanpassen",
      "mascotte veranderen",
      "mascot update",
      "update mascot",
      "globe man aanpassen",
      "globe man bijwerken",
      "bestaande mascotte",
      "existing mascot",
      "update the mascot",
    ]) &&
    !includesAny(text, [
      "nieuw personage",
      "nieuwe mascotte maken",
      "personage maken",
      "create character",
      "new character",
      "new mascot",
    ])
  ) {
    return {
      kind: "prefill",
      intent: "mascot_edit",
      actionId: "edit_mascot",
      understoodKey: "assistant.understood.editMascot",
    };
  }

  if (includesAny(text, ["nieuw personage", "new character", "personage maken", "create character"])) {
    return {
      kind: "prefill",
      intent: "character_new",
      actionId: "create_character",
      understoodKey: "assistant.understood.createCharacter",
    };
  }

  return { kind: "none" };
}

function buildActivitySteps(
  readiness: AssistantPrefillReadiness,
  hasQuestions: boolean
): AssistantPrefillActivityStep[] {
  const steps: AssistantPrefillActivityStep[] = [
    { id: "intent", labelKey: "assistant.prefill.activity.intent", status: "done" },
    { id: "route", labelKey: "assistant.prefill.activity.route", status: "done" },
  ];
  if (hasQuestions) {
    steps.push({
      id: "questions",
      labelKey: "assistant.prefill.activity.questions",
      status: readiness === "waiting_for_answer" ? "active" : "done",
    });
  }
  steps.push({
    id: "settings",
    labelKey: "assistant.prefill.activity.settings",
    status: readiness === "ready_to_open" || readiness === "opened" ? "done" : hasQuestions ? "pending" : "active",
  });
  steps.push({
    id: "review",
    labelKey: "assistant.prefill.activity.review",
    status: readiness === "ready_to_open" ? "active" : readiness === "opened" ? "done" : "pending",
  });
  return steps;
}

function outfitQuestions(answers: Record<string, string>): {
  pending: AssistantPrefillQuestion[];
  missing: `assistant.prefill.missing.${string}`[];
} {
  const pending: AssistantPrefillQuestion[] = [];
  const missing: `assistant.prefill.missing.${string}`[] = [];
  if (!answers.person_photo) {
    pending.push({
      id: "person_photo",
      labelKey: "assistant.prefill.question.personPhoto",
      kind: "confirm",
    });
    missing.push("assistant.prefill.missing.personPhoto");
  }
  if (!answers.outfit_photo) {
    pending.push({
      id: "outfit_photo",
      labelKey: "assistant.prefill.question.outfitPhoto",
      kind: "confirm",
    });
    missing.push("assistant.prefill.missing.outfitPhoto");
  }
  if (!answers.clothing_only) {
    pending.push({
      id: "clothing_only",
      labelKey: "assistant.prefill.question.clothingOnly",
      kind: "choice",
      options: [
        { id: "yes", labelKey: "assistant.prefill.question.clothingOnlyYes" },
        { id: "no", labelKey: "assistant.prefill.question.clothingOnlyNo" },
      ],
    });
    missing.push("assistant.prefill.missing.clothingOnly");
  }
  return { pending, missing };
}

function motionReadyQuestions(answers: Record<string, string>): {
  pending: AssistantPrefillQuestion[];
  missing: `assistant.prefill.missing.${string}`[];
} {
  const pending: AssistantPrefillQuestion[] = [];
  const missing: `assistant.prefill.missing.${string}`[] = [];
  if (!answers.body_style) {
    pending.push({
      id: "body_style",
      labelKey: "assistant.prefill.question.bodyStyle",
      kind: "choice",
      options: [
        { id: "realistic", labelKey: "assistant.prefill.question.bodyStyleRealistic" },
        { id: "cartoon", labelKey: "assistant.prefill.question.bodyStyleCartoon" },
      ],
    });
    missing.push("assistant.prefill.missing.bodyStyle");
  }
  if (!answers.pose) {
    pending.push({
      id: "pose",
      labelKey: "assistant.prefill.question.pose",
      kind: "choice",
      options: [
        { id: "neutral", labelKey: "assistant.prefill.question.poseNeutral" },
        { id: "friendly", labelKey: "assistant.prefill.question.poseFriendly" },
      ],
    });
    missing.push("assistant.prefill.missing.pose");
  }
  return { pending, missing };
}

function studioStoryQuestions(answers: Record<string, string>): {
  pending: AssistantPrefillQuestion[];
  missing: `assistant.prefill.missing.${string}`[];
} {
  const pending: AssistantPrefillQuestion[] = [];
  const missing: `assistant.prefill.missing.${string}`[] = [];
  if (!answers.audience) {
    pending.push({
      id: "audience",
      labelKey: "assistant.prefill.question.audience",
      kind: "choice",
      options: [
        { id: "consumers", labelKey: "assistant.prefill.question.audienceConsumers" },
        { id: "business", labelKey: "assistant.prefill.question.audienceBusiness" },
      ],
    });
    missing.push("assistant.prefill.missing.audience");
  }
  if (!answers.duration) {
    pending.push({
      id: "duration",
      labelKey: "assistant.prefill.question.duration",
      kind: "choice",
      options: [
        { id: "30", labelKey: "assistant.prefill.question.duration30" },
        { id: "60", labelKey: "assistant.prefill.question.duration60" },
      ],
    });
    missing.push("assistant.prefill.missing.duration");
  }
  if (!answers.voice_mode) {
    pending.push({
      id: "voice_mode",
      labelKey: "assistant.prefill.question.voiceMode",
      kind: "choice",
      options: [
        { id: "voiceover", labelKey: "assistant.prefill.question.voiceover" },
        { id: "dialogue", labelKey: "assistant.prefill.question.dialogue" },
      ],
    });
    missing.push("assistant.prefill.missing.voiceMode");
  }
  return { pending, missing };
}

function inferOutfitAnswers(message: string, answers: Record<string, string>): Record<string, string> {
  const text = normalize(message);
  const next = { ...answers };
  if (includesAny(text, ["gezicht niet", "face not", "verander mijn gezicht niet", "don't change my face"])) {
    next.protect_face = "yes";
  }
  if (includesAny(text, ["alleen kleding", "clothing only", "only clothing", "kleding wijzigen"])) {
    next.clothing_only = "yes";
  }
  return next;
}

function buildFusionOutfitPackage(
  input: { message: string; routeContext: AssistantRouteContext; understoodKey: `assistant.understood.${string}` }
): AssistantPrefillPackage {
  const answers = inferOutfitAnswers(input.message, {});
  const { pending, missing } = outfitQuestions(answers);
  const outputSettings = {
    targetOnly: "clothing",
    clothingOnly: true,
    protectFace: true,
    protectSkin: true,
    protectHair: true,
    protectPose: true,
    protectBackground: true,
  };
  const readiness: AssistantPrefillReadiness =
    pending.length > 0 ? "waiting_for_answer" : "ready_to_open";

  return {
    version: 1,
    id: createAssistantPrefillId(),
    intent: "fusion_outfit",
    actionId: "create_fusion",
    targetRoute: buildAssistantActionRoute("create_fusion", input.routeContext),
    projectId: input.routeContext.projectId ?? null,
    questionAnswers: answers,
    outputSettings,
    protectionSettings: {
      protectFace: true,
      protectPose: true,
      protectBackground: true,
    },
    generationGoal: "Replace clothing from reference while preserving identity.",
    promptDraft: "Change clothing only. Preserve face, skin, hair, pose, and background.",
    estimatedCost: null,
    readiness,
    missingInputs: missing,
    pendingQuestions: pending,
    activitySteps: buildActivitySteps(readiness, pending.length > 0),
    fusion: {
      fusionIntent: "outfit_from_reference",
      fusionArchetype: "character_outfit",
      requiredInputRoles: ["person", "outfit"],
      outputSettings,
      protectionSettings: {
        protectFace: true,
        protectPose: true,
        protectBackground: true,
      },
    },
    understoodKey: input.understoodKey,
    settingLabelKeys: [
      "assistant.prefill.setting.clothingOnly",
      "assistant.prefill.setting.protectFace",
      "assistant.prefill.setting.protectPose",
      "assistant.prefill.setting.protectBackground",
    ],
    createdAt: new Date().toISOString(),
    providerCalls: 0,
    creditsConsumed: 0,
  };
}

function buildMotionReadyPackage(
  input: { message: string; routeContext: AssistantRouteContext; understoodKey: `assistant.understood.${string}` }
): AssistantPrefillPackage {
  const answers: Record<string, string> = {};
  const { pending, missing } = motionReadyQuestions(answers);
  const readiness: AssistantPrefillReadiness =
    pending.length > 0 ? "waiting_for_answer" : "ready_to_open";

  return {
    version: 1,
    id: createAssistantPrefillId(),
    intent: "character_motion_ready",
    actionId: "prepare_motion_character",
    targetRoute: buildAssistantActionRoute("prepare_motion_character", input.routeContext),
    projectId: input.routeContext.projectId ?? null,
    questionAnswers: answers,
    outputSettings: {
      fullBodyRequired: true,
      transparentBackground: true,
    },
    generationGoal: "Prepare a full-body motion-ready character.",
    estimatedCost: null,
    readiness,
    missingInputs: missing,
    pendingQuestions: pending,
    activitySteps: buildActivitySteps(readiness, pending.length > 0),
    character: {
      routeProfile: "motion_ready",
      motionReadyNeeded: true,
      fullBodyRequired: true,
      handsRequired: true,
      feetRequired: true,
      transparentBackground: true,
      saveToLibrary: true,
      attachToProject: true,
    },
    understoodKey: input.understoodKey,
    settingLabelKeys: [
      "assistant.prefill.setting.fullBody",
      "assistant.prefill.setting.handsFeet",
      "assistant.prefill.setting.transparentBg",
    ],
    createdAt: new Date().toISOString(),
    providerCalls: 0,
    creditsConsumed: 0,
  };
}

function buildStudioStoryPackage(
  input: { message: string; routeContext: AssistantRouteContext; understoodKey: `assistant.understood.${string}` }
): AssistantPrefillPackage {
  const text = normalize(input.message);
  const answers: Record<string, string> = {};
  if (text.includes("homecheff")) {
    answers.brand = "homecheff";
  }
  const { pending, missing } = studioStoryQuestions(answers);
  const readiness: AssistantPrefillReadiness =
    pending.length > 0 ? "waiting_for_answer" : "ready_to_open";

  return {
    version: 1,
    id: createAssistantPrefillId(),
    intent: "studio_story",
    actionId: "create_motion_video",
    targetRoute: "/studio/storyboards/new",
    projectId: input.routeContext.projectId ?? null,
    questionAnswers: answers,
    generationGoal: "Plan a promotional studio story.",
    estimatedCost: null,
    readiness,
    missingInputs: missing,
    pendingQuestions: pending,
    activitySteps: buildActivitySteps(readiness, pending.length > 0),
    studio: {
      goal: text.includes("promotie") || text.includes("promotion") ? "promotion" : "brand_story",
      audience: answers.audience,
      storyType: "promotional",
      narrativeMode: answers.voice_mode === "dialogue" ? "dialogue" : "voiceover",
      sceneCount: 4,
      durationSeconds: answers.duration ? Number(answers.duration) : 30,
      cta: text.includes("homecheff") ? "Discover HomeCheff" : undefined,
      voicePlan: answers.voice_mode ?? "voiceover",
      overlayPlan: "title_and_cta",
    },
    understoodKey: input.understoodKey,
    settingLabelKeys: [
      "assistant.prefill.setting.storyType",
      "assistant.prefill.setting.sceneCount",
      "assistant.prefill.setting.voicePlan",
    ],
    createdAt: new Date().toISOString(),
    providerCalls: 0,
    creditsConsumed: 0,
  };
}

function buildAgeProgressionPackage(
  input: { routeContext: AssistantRouteContext; understoodKey: `assistant.understood.${string}` }
): AssistantPrefillPackage {
  const outputSettings = {
    preserveIdentity: true,
    preserveFaceStructure: true,
    useFamilyAgingReference: true,
    protectBackground: true,
  };
  return {
    version: 1,
    id: createAssistantPrefillId(),
    intent: "fusion_age_progression",
    actionId: "create_fusion",
    targetRoute: buildAssistantActionRoute("create_fusion", input.routeContext),
    projectId: input.routeContext.projectId ?? null,
    outputSettings,
    protectionSettings: { protectBackground: true },
    generationGoal: "Age progression with identity preservation.",
    estimatedCost: null,
    readiness: "ready_to_open",
    missingInputs: [],
    pendingQuestions: [],
    activitySteps: buildActivitySteps("ready_to_open", false),
    fusion: {
      fusionIntent: "age_progression",
      fusionArchetype: "age_progression",
      outputSettings,
      protectionSettings: { protectBackground: true },
    },
    understoodKey: input.understoodKey,
    settingLabelKeys: [
      "assistant.prefill.setting.preserveIdentity",
      "assistant.prefill.setting.preserveFace",
      "assistant.prefill.setting.protectBackground",
    ],
    createdAt: new Date().toISOString(),
    providerCalls: 0,
    creditsConsumed: 0,
  };
}

function buildLogoPlacementPackage(
  input: { routeContext: AssistantRouteContext; understoodKey: `assistant.understood.${string}` }
): AssistantPrefillPackage {
  const outputSettings = {
    preserveLogoExact: true,
    logoPlacement: "top-right",
    protectBackground: true,
  };
  return {
    version: 1,
    id: createAssistantPrefillId(),
    intent: "fusion_logo_placement",
    actionId: "create_fusion",
    targetRoute: buildAssistantActionRoute("create_fusion", input.routeContext),
    projectId: input.routeContext.projectId ?? null,
    outputSettings,
    protectionSettings: { protectBackground: true },
    readiness: "ready_to_open",
    missingInputs: [],
    pendingQuestions: [],
    activitySteps: buildActivitySteps("ready_to_open", false),
    fusion: {
      fusionIntent: "logo_placement",
      fusionArchetype: "logo_placement",
      outputSettings,
    },
    understoodKey: input.understoodKey,
    settingLabelKeys: [
      "assistant.prefill.setting.preserveLogo",
      "assistant.prefill.setting.logoPlacement",
      "assistant.prefill.setting.protectBackground",
    ],
    createdAt: new Date().toISOString(),
    providerCalls: 0,
    creditsConsumed: 0,
  };
}

function buildMorphEditPackage(
  input: {
    message: string;
    routeContext: AssistantRouteContext;
    understoodKey: `assistant.understood.${string}`;
    intent: "human_morph" | "animal_morph";
  }
): AssistantPrefillPackage | null {
  const morphAction = detectEditorMorphActionFromMessage(input.message);
  if (!morphAction) {
    return null;
  }
  const morphDef = getEditorMorphAction(morphAction);
  const isAnimal = input.intent === "animal_morph";

  return {
    version: 1,
    id: createAssistantPrefillId(),
    intent: input.intent,
    actionId: "edit_mascot",
    targetRoute: buildEditorMorphActionRoute(morphAction),
    projectId: input.routeContext.projectId ?? null,
    promptDraft: input.message.trim(),
    generationGoal: morphDef.description,
    estimatedCost: null,
    readiness: "ready_to_open",
    missingInputs: [],
    pendingQuestions: [],
    activitySteps: buildActivitySteps("ready_to_open", false),
    understoodKey: input.understoodKey,
    settingLabelKeys: [
      isAnimal ? "assistant.prefill.setting.animalMorph" : "assistant.prefill.setting.humanMorph",
    ],
    editor: {
      selectedAssetType: isAnimal ? "animal" : "human",
      workflow: "edit",
      morphActionId: morphAction,
      availableActions: isAnimal
        ? [
            "pet_to_cartoon",
            "pet_to_mascot",
            "animal_expression_change",
            "animal_pose_change",
            "preserve_breed_shape",
            "preserve_fur_pattern",
          ]
        : [
            "human_to_cartoon",
            "portrait_to_avatar",
            "outfit_change",
            "expression_change",
            "pose_change",
            "preserve_identity",
          ],
    },
    createdAt: new Date().toISOString(),
    providerCalls: 0,
    creditsConsumed: 0,
  };
}

function buildMascotEditPackage(
  input: { message: string; routeContext: AssistantRouteContext; understoodKey: `assistant.understood.${string}` }
): AssistantPrefillPackage {
  return {
    version: 1,
    id: createAssistantPrefillId(),
    intent: "mascot_edit",
    actionId: "edit_mascot",
    targetRoute: buildAssistantActionRoute("edit_mascot", input.routeContext),
    projectId: input.routeContext.projectId ?? null,
    promptDraft: input.message.trim(),
    generationGoal: "Update an existing mascot in the editor.",
    estimatedCost: null,
    readiness: "ready_to_open",
    missingInputs: [],
    pendingQuestions: [],
    activitySteps: buildActivitySteps("ready_to_open", false),
    understoodKey: input.understoodKey,
    settingLabelKeys: ["assistant.prefill.setting.editMascot"],
    editor: {
      selectedAssetType: "mascot",
      workflow: "edit",
      availableActions: [
        "edit_feature",
        "edit_outfit",
        "edit_pose",
        "edit_expression",
        "edit_prop",
        "preserve_prop",
        "animate",
      ],
    },
    createdAt: new Date().toISOString(),
    providerCalls: 0,
    creditsConsumed: 0,
  };
}

function buildCharacterNewPackage(
  input: { message: string; routeContext: AssistantRouteContext; understoodKey: `assistant.understood.${string}` }
): AssistantPrefillPackage {
  return {
    version: 1,
    id: createAssistantPrefillId(),
    intent: "character_new",
    actionId: "create_character",
    targetRoute: buildAssistantActionRoute("create_character", input.routeContext),
    projectId: input.routeContext.projectId ?? null,
    promptDraft: input.message.trim(),
    generationGoal: "Create a new character from description.",
    estimatedCost: null,
    readiness: "ready_to_open",
    missingInputs: [],
    pendingQuestions: [],
    activitySteps: buildActivitySteps("ready_to_open", false),
    character: {
      routeProfile: "new",
      saveToLibrary: true,
      attachToProject: Boolean(input.routeContext.projectId),
    },
    understoodKey: input.understoodKey,
    settingLabelKeys: ["assistant.prefill.setting.saveToLibrary"],
    createdAt: new Date().toISOString(),
    providerCalls: 0,
    creditsConsumed: 0,
  };
}

function buildCharacterFromReferencePackage(
  input: { message: string; routeContext: AssistantRouteContext; understoodKey: `assistant.understood.${string}` }
): AssistantPrefillPackage {
  return {
    version: 1,
    id: createAssistantPrefillId(),
    intent: "character_from_reference",
    actionId: "create_character_from_reference",
    targetRoute: buildAssistantActionRoute("create_character_from_reference", input.routeContext),
    projectId: input.routeContext.projectId ?? null,
    promptDraft: input.message.trim(),
    generationGoal: "Create a character from a reference photo.",
    estimatedCost: null,
    readiness: "ready_to_open",
    missingInputs: [],
    pendingQuestions: [],
    activitySteps: buildActivitySteps("ready_to_open", false),
    character: {
      routeProfile: "from_reference",
      saveToLibrary: true,
      attachToProject: Boolean(input.routeContext.projectId),
    },
    understoodKey: input.understoodKey,
    settingLabelKeys: ["assistant.prefill.setting.fromReference"],
    createdAt: new Date().toISOString(),
    providerCalls: 0,
    creditsConsumed: 0,
  };
}

export function buildAssistantPrefillPackage(input: {
  intent: AssistantPrefillIntent;
  message: string;
  actionId: AssistantActionId;
  understoodKey: `assistant.understood.${string}`;
  routeContext: AssistantRouteContext;
}): AssistantPrefillPackage | null {
  switch (input.intent) {
    case "fusion_outfit":
      return buildFusionOutfitPackage(input);
    case "character_motion_ready":
      return buildMotionReadyPackage(input);
    case "studio_story":
      return buildStudioStoryPackage(input);
    case "fusion_age_progression":
      return buildAgeProgressionPackage(input);
    case "fusion_logo_placement":
      return buildLogoPlacementPackage(input);
    case "character_new":
      return buildCharacterNewPackage(input);
    case "mascot_edit":
      return buildMascotEditPackage(input);
    case "human_morph":
    case "animal_morph":
      return buildMorphEditPackage({ ...input, intent: input.intent });
    case "character_from_reference":
      return buildCharacterFromReferencePackage(input);
    default:
      return null;
  }
}

export function applyPrefillAnswer(
  pkg: AssistantPrefillPackage,
  questionId: string,
  answer: string
): AssistantPrefillPackage {
  const questionAnswers = { ...pkg.questionAnswers, [questionId]: answer };
  let next: AssistantPrefillPackage = {
    ...pkg,
    questionAnswers,
    providerCalls: 0,
    creditsConsumed: 0,
  };

  if (pkg.intent === "character_motion_ready") {
    if (questionId === "body_style") {
      next = {
        ...next,
        character: {
          ...next.character,
          style: answer === "cartoon" ? "cartoon" : "realistic",
          characterType: answer === "cartoon" ? "cartoon" : "realistic_photo",
        },
      };
    }
    if (questionId === "pose") {
      next = {
        ...next,
        character: {
          ...next.character,
          pose: answer === "friendly" ? "friendly" : "neutral_standing",
        },
      };
    }
  }

  if (pkg.intent === "studio_story") {
    if (questionId === "audience") {
      next = {
        ...next,
        studio: { ...next.studio, audience: answer },
      };
    }
    if (questionId === "duration") {
      next = {
        ...next,
        studio: { ...next.studio, durationSeconds: Number(answer) },
      };
    }
    if (questionId === "voice_mode") {
      next = {
        ...next,
        studio: { ...next.studio, narrativeMode: answer, voicePlan: answer },
      };
    }
  }

  if (pkg.intent === "fusion_outfit" && questionId === "clothing_only") {
    const clothingOnly = answer === "yes";
    next = {
      ...next,
      outputSettings: {
        ...next.outputSettings,
        clothingOnly,
        targetOnly: clothingOnly ? "clothing" : "clothing",
      },
    };
  }

  const pending = resolvePendingQuestions(next);
  const readiness: AssistantPrefillReadiness =
    pending.length > 0 ? "waiting_for_answer" : "ready_to_open";
  return {
    ...next,
    pendingQuestions: pending,
    missingInputs: pending.map((q) => `assistant.prefill.missing.${q.id}` as const),
    readiness,
    activitySteps: buildActivitySteps(readiness, pending.length > 0),
  };
}

function resolvePendingQuestions(pkg: AssistantPrefillPackage): AssistantPrefillQuestion[] {
  const answers = pkg.questionAnswers ?? {};
  switch (pkg.intent) {
    case "fusion_outfit":
      return outfitQuestions(answers).pending;
    case "character_motion_ready":
      return motionReadyQuestions(answers).pending;
    case "studio_story":
      return studioStoryQuestions(answers).pending;
    default:
      return [];
  }
}

export function tryResolvePrefillAnswerFromMessage(
  pkg: AssistantPrefillPackage,
  message: string
): { questionId: string; answer: string } | null {
  const text = normalize(message);
  const pending = pkg.pendingQuestions[0];
  if (!pending) {
    return null;
  }
  if (pending.kind === "choice" && pending.options) {
    const option = pending.options.find(
      (row) =>
        text === row.id ||
        text.includes(row.id) ||
        (row.id === "yes" && includesAny(text, ["ja", "yes", "akkoord"])) ||
        (row.id === "no" && includesAny(text, ["nee", "no"])) ||
        (row.id === "realistic" && includesAny(text, ["realist", "foto"])) ||
        (row.id === "cartoon" && includesAny(text, ["cartoon", "teken"])) ||
        (row.id === "neutral" && includesAny(text, ["neutraal", "neutral"])) ||
        (row.id === "friendly" && includesAny(text, ["vriendelijk", "friendly"])) ||
        (row.id === "voiceover" && includesAny(text, ["voice", "voiceover"])) ||
        (row.id === "dialogue" && includesAny(text, ["dialoog", "dialogue"])) ||
        (row.id === "30" && text.includes("30")) ||
        (row.id === "60" && text.includes("60")) ||
        (row.id === "consumers" && includesAny(text, ["consument", "consumer"])) ||
        (row.id === "business" && includesAny(text, ["zakelijk", "business", "b2b"]))
    );
    if (option) {
      return { questionId: pending.id, answer: option.id };
    }
  }
  if (pending.kind === "confirm" && includesAny(text, ["ja", "yes", "ok", "upload", "klaar", "done"])) {
    return { questionId: pending.id, answer: "ready" };
  }
  return null;
}

export function markPrefillPackageOpened(pkg: AssistantPrefillPackage): AssistantPrefillPackage {
  return {
    ...pkg,
    readiness: "opened",
    activitySteps: pkg.activitySteps.map((step) =>
      step.id === "review" ? { ...step, status: "done" } : step
    ),
  };
}

export function cancelPrefillPackage(pkg: AssistantPrefillPackage): AssistantPrefillPackage {
  return {
    ...pkg,
    readiness: "cancelled",
    activitySteps: pkg.activitySteps.map((step) => ({ ...step, status: "pending" })),
  };
}

export function buildMotionActionPresetPrefillPackage(input: {
  presetId: MotionActionPresetId;
  message?: string;
  routeContext?: AssistantRouteContext;
  snapshot?: AssistantContextSnapshot;
  activeProject?: AssistantProjectContext | null;
}): AssistantPrefillPackage | null {
  const base = buildActionPresetPrefillPackage(input);
  if (!base) {
    return null;
  }
  const snapshot =
    input.snapshot ??
    buildAssistantContextSnapshot({
      projects: [],
      libraryRecords: [],
    });
  return enrichPrefillWithProducerAnalysis(base, snapshot, input.activeProject);
}

export { enrichPrefillWithProducerAnalysis } from "@/lib/assistant-producer-mode";
