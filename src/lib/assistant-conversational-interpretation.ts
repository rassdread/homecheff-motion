import { detectMotionActionPresetFromMessage } from "@/lib/motion-action-presets";
import type { MotionActionPresetId } from "@/types/motion-action-presets";
import { interpretAssistantRequest } from "@/lib/assistant-interpretation-engine";
import {
  buildInterpretationFromIntentCluster,
  buildGeneralHelpInterpretation,
  detectIntentCluster,
} from "@/lib/assistant-intent-clusters";
import type {
  AssistantInterpretation,
  AssistantInterpretationAlternative,
  AssistantInterpretationContext,
  AssistantInterpretationIntensity,
  AssistantInterpretationQuestion,
} from "@/types/assistant-interpretation";

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function includesAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

function limitQuestions(
  questions: AssistantInterpretationQuestion[],
  confidence: AssistantInterpretation["confidence"]
): AssistantInterpretationQuestion[] {
  const max = confidence === "high" ? 1 : confidence === "medium" ? 3 : 5;
  return questions.slice(0, max);
}

function detectIntensity(message: string): AssistantInterpretationIntensity | undefined {
  const text = normalize(message);
  if (
    includesAny(text, [
      "niet overdreven",
      "niet te",
      "subtiel",
      "beetje",
      "zacht",
      "not too",
      "subtle",
      "a little",
      "low key",
    ])
  ) {
    return "subtle";
  }
  if (includesAny(text, ["episch", "spectaculair", "extreme", "wild", "epic", "massive"])) {
    return "high";
  }
  if (includesAny(text, ["grappig", "funny", "comedy", "luchtig"])) {
    return "balanced";
  }
  return undefined;
}

function extractConstraints(message: string): string[] {
  const text = normalize(message);
  const constraints: string[] = [];
  if (includesAny(text, ["niet overdreven", "not too exaggerated", "subtiel"])) {
    constraints.push("not too exaggerated");
  }
  if (includesAny(text, ["gezicht hetzelfde", "niet mijn gezicht", "protect face", "face same"])) {
    constraints.push("protect face");
  }
  if (includesAny(text, ["alleen kleding", "only clothing", "clothing only"])) {
    constraints.push("clothing only");
  }
  if (includesAny(text, ["niet allemaal tegelijk", "not all at once", "subtle crowd"])) {
    constraints.push("subtle crowd reactions");
  }
  return constraints;
}

function extractStyleHints(message: string): string[] {
  const text = normalize(message);
  const hints: string[] = [];
  if (includesAny(text, ["filmisch", "cinematic", "movie"])) hints.push("cinematic");
  if (includesAny(text, ["grappig", "funny", "comedy"])) hints.push("comedy");
  if (includesAny(text, ["realistisch", "realistic"])) hints.push("realistic");
  if (includesAny(text, ["luxury", "luxe", "sportwagen", "supercar"])) hints.push("luxury");
  if (includesAny(text, ["straat", "street"])) hints.push("street scene");
  if (includesAny(text, ["rode loper", "red carpet", "beroemd", "celebrity"])) hints.push("celebrity moment");
  return hints;
}

function footballAlternatives(locale?: string): AssistantInterpretationAlternative[] {
  const nl = !locale || locale.startsWith("nl");
  return [
    {
      label: nl ? "Doelpunt vieren" : "Goal celebration",
      intent: "goal_celebration",
      presetId: "goal_celebration",
      reason: nl ? "Populaire sportclip" : "Popular sports clip",
    },
    {
      label: nl ? "Stadionopkomst" : "Stadium walkout",
      intent: "stadium_entrance",
      presetId: "stadium_entrance",
      reason: nl ? "Epische entree" : "Epic entrance",
    },
    {
      label: nl ? "Kampioen vieren" : "Championship celebration",
      intent: "championship_celebration",
      presetId: "championship_celebration",
      reason: nl ? "Winstmoment" : "Victory moment",
    },
  ];
}

function buildVagueFootballInterpretation(
  message: string,
  context: AssistantInterpretationContext
): AssistantInterpretation {
  const nl = !context.locale || context.locale.startsWith("nl");
  const alternatives = footballAlternatives(context.locale);
  return {
    originalMessage: message,
    understoodGoal: nl
      ? "Een voetbalgerelateerde video — nog niet duidelijk welk moment."
      : "A football-related video — the exact moment is not clear yet.",
    detectedIntent: "create_motion_video",
    confidence: "low",
    targetModule: "motion",
    likelyActionId: "create_motion_video",
    extractedEntities: { actions: [nl ? "Voetbal" : "Football"] },
    inferredSettings: {},
    missingInputs: [nl ? "welk voetbalmoment" : "which football moment"],
    followUpQuestions: limitQuestions(
      [
        {
          id: "football_variant",
          label: nl ? "Welke voetbalvideo wil je maken?" : "Which football video do you want?",
          reason: nl ? "Er zijn meerdere sportpresets." : "Several sport presets are available.",
          options: alternatives.map((row) => row.label),
          required: true,
          affectsSettings: ["actionPresetId"],
        },
      ],
      "low"
    ),
    alternativeIntents: alternatives,
    creativeGoal: nl ? "Voetbalvideo met juichen of stadionsfeer" : "Football video with celebration or stadium vibe",
    normalizedMeaning: nl ? "Iets met voetbal" : "Something with football",
    styleHints: ["sports"],
    intensity: "balanced",
    source: "rules",
    suggestedRoute: "/animate/instant",
  };
}

function enrichInterpretation(
  base: AssistantInterpretation,
  message: string,
  context: AssistantInterpretationContext
): AssistantInterpretation {
  const text = normalize(message);
  const nl = !context.locale || context.locale.startsWith("nl");
  const presetId = detectMotionActionPresetFromMessage(text) as MotionActionPresetId | null;
  const intensity = detectIntensity(message) ?? base.intensity;
  const styleHints = [...new Set([...(base.styleHints ?? []), ...extractStyleHints(message)])];
  const constraints = [...new Set([...(base.constraints ?? []), ...extractConstraints(message)])];
  const prefillHints = {
    ...base.inferredSettings,
    ...(base.prefillHints ?? {}),
  };

  if (constraints.includes("clothing only")) {
    prefillHints.clothingOnly = true;
    prefillHints.protectFace = true;
    prefillHints.protectPose = true;
  }
  if (constraints.includes("protect face")) {
    prefillHints.protectFace = true;
  }
  if (intensity === "subtle") {
    prefillHints.intensity = "subtle";
    prefillHints.crowdDensity = "low";
  }

  let alternativeIntents = base.alternativeIntents;
  if (
    includesAny(text, ["iets met voetbal", "something with football", "doe iets met voetbal"]) &&
    !includesAny(text, ["doelpunt", "goal", "kampioen", "stadium"])
  ) {
    alternativeIntents = footballAlternatives(context.locale);
  }

  let followUpQuestions = base.followUpQuestions;
  if (presetId === "fans_recognize_me" || includesAny(text, ["herkennen", "recognize", "mijn naam"])) {
    followUpQuestions = limitQuestions(
      [
        ...followUpQuestions,
        {
          id: "recognition_tone",
          label: nl ? "Grappig, realistisch of filmisch?" : "Funny, realistic, or cinematic?",
          reason: nl ? "Bepaalt toon van de straatscène." : "Sets the tone of the street scene.",
          options: nl
            ? ["Grappig", "Realistisch", "Filmisch"]
            : ["Funny", "Realistic", "Cinematic"],
          required: false,
          affectsSettings: ["style", "mood"],
        },
      ],
      base.confidence
    );
  }

  if (
    (presetId === "red_carpet_moment" || presetId === "stadium_entrance") &&
    intensity === "subtle"
  ) {
    followUpQuestions = limitQuestions(
      [
        ...followUpQuestions,
        {
          id: "entrance_setting",
          label: nl ? "Rode loper, straat of luxe locatie?" : "Red carpet, street, or luxury venue?",
          reason: nl ? "Kiest de juiste entree-setting." : "Chooses the right entrance setting.",
          options: nl
            ? ["Rode loper", "Straat", "Luxe locatie"]
            : ["Red carpet", "Street", "Luxury venue"],
          required: false,
          affectsSettings: ["location", "sceneStyle"],
        },
      ],
      base.confidence
    );
  }

  if (includesAny(text, ["sportwagen", "supercar", "sports car"]) && includesAny(text, ["grappig", "funny"])) {
    styleHints.push("comedy");
    followUpQuestions = limitQuestions(
      [
        {
          id: "car_moment",
          label: nl
            ? "Wil je uitstappen, aankomen rijden of poseren naast de auto?"
            : "Step out, drive in, or pose beside the car?",
          reason: nl ? "Kiest het aankomstmoment." : "Chooses the arrival moment.",
          options: nl
            ? ["Uitstappen", "Aankomen rijden", "Poseren naast auto"]
            : ["Step out", "Drive in", "Pose beside car"],
          required: false,
          affectsSettings: ["actionPresetId", "sceneBeat"],
        },
      ],
      base.confidence
    );
  }

  return {
    ...base,
    normalizedMeaning: base.normalizedMeaning ?? base.understoodGoal,
    creativeGoal: base.creativeGoal ?? base.understoodGoal,
    styleHints,
    constraints,
    intensity,
    likelyPresetId: presetId ?? base.likelyPresetId,
    alternativeIntents,
    followUpQuestions,
    prefillHints,
    inferredSettings: prefillHints,
  };
}

function buildCelebrityEntranceInterpretation(
  message: string,
  context: AssistantInterpretationContext
): AssistantInterpretation {
  const nl = !context.locale || context.locale.startsWith("nl");
  const presetId = detectMotionActionPresetFromMessage(normalize(message)) ?? "hero_entrance";
  const intensity = detectIntensity(message) ?? "subtle";
  const constraints = extractConstraints(message);
  const styleHints = extractStyleHints(message);
  if (!styleHints.includes("cinematic")) {
    styleHints.push("cinematic");
  }

  return enrichInterpretation(
    {
      originalMessage: message,
      understoodGoal: nl
        ? "Een subtiele celebrity-achtige entree waarbij mensen je opmerken zonder overdreven scene."
        : "A subtle celebrity-style entrance where people notice you without an over-the-top scene.",
      detectedIntent: "create_motion_video",
      confidence: intensity === "subtle" ? "medium" : "high",
      targetModule: "motion",
      likelyActionId: "create_motion_video",
      extractedEntities: {
        actions: [nl ? "Entree / aankomst" : "Entrance / arrival"],
        style: styleHints,
      },
      inferredSettings: {
        subtype: "action_preset",
        actionPresetId: presetId,
        intensity,
      },
      missingInputs: [],
      followUpQuestions: [],
      likelyPresetId: presetId,
      creativeGoal: nl
        ? "Filmisch binnenkomen met subtiele aandacht van omstanders."
        : "Cinematic arrival with subtle attention from bystanders.",
      normalizedMeaning: nl ? "Subtiel beroemd aankomen" : "Subtle celebrity arrival",
      styleHints,
      constraints,
      intensity,
      source: "rules",
      suggestedRoute: "/animate/instant",
    },
    message,
    context
  );
}

function isCelebrityEntranceMessage(text: string): boolean {
  return (
    includesAny(text, [
      "beroemd aankom",
      "beroemd binnenkomen",
      "celebrity entrance",
      "hero entrance",
      "rode loper",
      "red carpet",
      "aankom lopen",
      "walk in like",
    ]) ||
    (includesAny(text, ["beroemd", "celebrity", "herken"]) &&
      includesAny(text, ["aankom", "binnenkomen", "entree", "entrance", "lopen", "walk"]))
  );
}

export function interpretConversationally(
  message: string,
  context: AssistantInterpretationContext = {}
): AssistantInterpretation | null {
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }

  const text = normalize(trimmed);
  if (
    includesAny(text, ["iets met voetbal", "something with football", "doe iets met voetbal"]) &&
    !includesAny(text, ["doelpunt", "goal", "scoor", "kampioen"])
  ) {
    return buildVagueFootballInterpretation(trimmed, context);
  }

  if (isCelebrityEntranceMessage(text)) {
    return buildCelebrityEntranceInterpretation(trimmed, context);
  }

  const cluster = detectIntentCluster(trimmed);
  if (cluster && cluster.clusterId !== "general_help" && cluster.confidence !== "low") {
    return enrichInterpretation(
      buildInterpretationFromIntentCluster(trimmed, cluster, context),
      trimmed,
      context
    );
  }

  const base = interpretAssistantRequest(trimmed, context);
  if (base) {
    return enrichInterpretation(base, trimmed, context);
  }

  if (cluster) {
    return enrichInterpretation(
      buildInterpretationFromIntentCluster(trimmed, cluster, context),
      trimmed,
      context
    );
  }

  return enrichInterpretation(buildGeneralHelpInterpretation(trimmed, context), trimmed, context);
}

export function enrichConversationalInterpretation(
  base: AssistantInterpretation,
  message: string,
  context: AssistantInterpretationContext = {}
): AssistantInterpretation {
  return enrichInterpretation(base, message, context);
}

export type AssistantConversationInterpretation = AssistantInterpretation;
