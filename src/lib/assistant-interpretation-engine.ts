import type { AssistantActionId } from "@/lib/assistant-action-registry";
import { buildAssistantActionRoute, type AssistantRouteContext } from "@/lib/assistant-route-builder";
import {
  applyPrefillAnswer,
  buildAssistantPrefillPackage,
  type AssistantPrefillDetectResult,
} from "@/lib/assistant-prefill-engine";
import { createAssistantPrefillId } from "@/lib/assistant-prefill-storage";
import {
  buildActionPresetInterpretation,
  buildActionPresetPrefillPackage,
} from "@/lib/motion-action-preset-prefill";
import {
  detectMotionActionPresetFromMessage,
  getMotionActionPreset,
  isMotionActionPresetId,
} from "@/lib/motion-action-presets";
import type { AssistantPrefillIntent, AssistantPrefillPackage, AssistantPrefillInterpretationSummary } from "@/types/assistant-prefill";
import type {
  AssistantInterpretation,
  AssistantInterpretationContext,
  AssistantInterpretationQuestion,
  AssistantInterpretationTargetModule,
} from "@/types/assistant-interpretation";

function buildInterpretationSummary(
  interpretation: AssistantInterpretation
): AssistantPrefillInterpretationSummary {
  return {
    understoodGoal: interpretation.creativeGoal ?? interpretation.understoodGoal,
    confidence: interpretation.confidence,
    feasibilityNotes: interpretation.safetyOrFeasibilityNotes,
    source: interpretation.source,
    followUpQuestions: interpretation.followUpQuestions,
    creativeGoal: interpretation.creativeGoal,
    styleHints: interpretation.styleHints,
    constraints: interpretation.constraints,
    intensity: interpretation.intensity,
    alternativeIntents: interpretation.alternativeIntents,
  };
}

const VALID_ACTION_IDS = new Set<string>([
  "create_character",
  "create_character_from_reference",
  "prepare_motion_character",
  "create_motion_video",
  "create_fusion",
  "create_publish_export",
  "open_project",
  "rename_project",
  "open_asset",
  "unknown",
]);

const VALID_MODULES = new Set<string>([
  "studio",
  "editor",
  "motion",
  "publish",
  "characters",
  "fusion",
  "projects",
  "library",
]);

const VALID_CONFIDENCE = new Set<string>(["high", "medium", "low"]);

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function includesAny(hay: string, needles: string[]): boolean {
  return needles.some((needle) => hay.includes(needle));
}

function isNl(locale?: string): boolean {
  return locale?.toLowerCase().startsWith("nl") ?? false;
}

function q(
  input: {
    id: string;
    labelNl: string;
    labelEn: string;
    reasonNl: string;
    reasonEn: string;
    optionsNl: string[];
    optionsEn: string[];
    required?: boolean;
    affectsSettings: string[];
  },
  locale?: string
): AssistantInterpretationQuestion {
  const nl = isNl(locale);
  return {
    id: input.id,
    label: nl ? input.labelNl : input.labelEn,
    reason: nl ? input.reasonNl : input.reasonEn,
    options: nl ? input.optionsNl : input.optionsEn,
    required: input.required ?? true,
    affectsSettings: input.affectsSettings,
  };
}

function limitQuestions(
  questions: AssistantInterpretationQuestion[],
  confidence: AssistantInterpretation["confidence"]
): AssistantInterpretationQuestion[] {
  const max = confidence === "high" ? 1 : confidence === "medium" ? 3 : 6;
  return questions.slice(0, max);
}

function intentToPrefill(intent: string): AssistantPrefillIntent | null {
  switch (intent) {
    case "outfit_from_reference":
    case "fusion_outfit":
      return "fusion_outfit";
    case "prepare_motion_character":
    case "character_motion_ready":
      return "character_motion_ready";
    case "studio_story":
      return "studio_story";
    case "create_motion_video":
    case "motion_video":
      return "motion_video";
    case "character_new":
      return "character_new";
    case "character_from_reference":
      return "character_from_reference";
    case "fusion_age_progression":
      return "fusion_age_progression";
    case "fusion_logo_placement":
      return "fusion_logo_placement";
    default:
      return null;
  }
}

function actionForIntent(intent: string): AssistantActionId | "unknown" {
  switch (intent) {
    case "outfit_from_reference":
    case "fusion_outfit":
    case "fusion_age_progression":
    case "fusion_logo_placement":
      return "create_fusion";
    case "prepare_motion_character":
    case "character_motion_ready":
      return "prepare_motion_character";
    case "studio_story":
      return "create_motion_video";
    case "create_motion_video":
    case "motion_video":
      return "create_motion_video";
    case "character_new":
      return "create_character";
    case "character_from_reference":
      return "create_character_from_reference";
    default:
      return "unknown";
  }
}

function moduleForIntent(intent: string): AssistantInterpretationTargetModule {
  switch (intent) {
    case "outfit_from_reference":
    case "fusion_outfit":
    case "fusion_age_progression":
    case "fusion_logo_placement":
      return "fusion";
    case "prepare_motion_character":
    case "character_motion_ready":
    case "character_new":
    case "character_from_reference":
      return "characters";
    case "studio_story":
      return "studio";
    case "create_motion_video":
    case "motion_video":
      return "motion";
    default:
      return "projects";
  }
}

function understoodKeyForIntent(intent: string): `assistant.understood.${string}` {
  switch (intent) {
    case "outfit_from_reference":
    case "fusion_outfit":
      return "assistant.understood.fusionOutfit";
    case "prepare_motion_character":
    case "character_motion_ready":
      return "assistant.understood.motionReadyCharacter";
    case "studio_story":
      return "assistant.understood.studioStory";
    case "create_motion_video":
    case "motion_video":
      return "assistant.understood.motionActionClip";
    case "character_new":
      return "assistant.understood.createCharacter";
    case "character_from_reference":
      return "assistant.understood.characterFromReference";
    default:
      return "assistant.understood.generic";
  }
}

function detectRuleIntent(message: string): {
  intent: string;
  confidence: AssistantInterpretation["confidence"];
} | null {
  const text = normalize(message);

  if (
    includesAny(text, [
      "alleen die jas",
      "alleen kleding",
      "jas veranderen",
      "outfit veranderen",
      "only the jacket",
      "only clothing",
      "change the jacket",
    ]) ||
    (includesAny(text, ["gezicht niet", "niet mijn gezicht", "face not", "don't change my face"]) &&
      includesAny(text, ["jas", "kleding", "outfit", "jacket", "clothing"]))
  ) {
    return { intent: "outfit_from_reference", confidence: "high" };
  }

  if (
    includesAny(text, [
      "poppetje",
      "figuurtje",
      "mascot",
      "selfie",
      "animeren",
      "laten bewegen",
      "later bewegen",
      "motion-ready",
      "motion ready",
      "voor animatie",
      "for animation",
      "animatie personage",
      "animatieklaar",
    ]) &&
    includesAny(text, ["bewegen", "animeren", "animatie", "animation", "motion", "laten"])
  ) {
    return { intent: "prepare_motion_character", confidence: "high" };
  }

  if (
    includesAny(text, ["selfie", "poppetje", "figuurtje"]) &&
    includesAny(text, ["personage", "character", "maken", "create"])
  ) {
    return { intent: "prepare_motion_character", confidence: "medium" };
  }

  if (
    includesAny(text, [
      "doelpunt",
      "scoor",
      "score goal",
      "voetbal",
      "football",
      "wedstrijd",
      "stadium",
      "stadion",
      "goal celebration",
      "kampioen",
      "dunk",
      "snowboard",
      "skateboard",
      "moonwalk",
      "rode loper",
      "red carpet",
      "fans herkennen",
      "straatinterview",
      "sportwagen",
      "bergtop",
      "catwalk",
    ])
  ) {
    return { intent: "create_motion_video", confidence: "medium" };
  }

  if (detectMotionActionPresetFromMessage(text)) {
    return { intent: "create_motion_video", confidence: "medium" };
  }

  if (
    includesAny(text, ["grappig", "funny", "herkennen", "recognize", "op straat", "on the street"]) &&
    includesAny(text, ["video", "filmpje", "clip", "motion"])
  ) {
    return { intent: "create_motion_video", confidence: "medium" };
  }

  if (
    includesAny(text, ["filmpje", "video", "clip"]) &&
    includesAny(text, ["voetbal", "football", "scoor", "doelpunt", "wedstrijd"])
  ) {
    return { intent: "create_motion_video", confidence: "medium" };
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
    return { intent: "studio_story", confidence: "high" };
  }

  if (includesAny(text, ["jas op", "outfit", "kleding", "jacket on", "zet deze jas"])) {
    return { intent: "outfit_from_reference", confidence: "medium" };
  }

  if (
    includesAny(text, [
      "animeren",
      "motion-ready",
      "motion ready",
      "voor animatie",
      "later animeren",
    ])
  ) {
    return { intent: "prepare_motion_character", confidence: "medium" };
  }

  return null;
}

function buildMotionCharacterInterpretation(
  message: string,
  locale?: string
): AssistantInterpretation {
  const nl = isNl(locale);
  const questions = limitQuestions(
    [
      q({
        id: "body_style",
        labelNl: "Realistisch of cartoon?",
        labelEn: "Realistic or cartoon?",
        reasonNl: "Dit bepaalt de stijl van het animatieklaar personage.",
        reasonEn: "This sets the style of your motion-ready character.",
        optionsNl: ["Realistisch", "Cartoon"],
        optionsEn: ["Realistic", "Cartoon"],
        affectsSettings: ["style", "characterType"],
      }),
      q({
        id: "clothing",
        labelNl: "Welke kleding moet het lichaam krijgen?",
        labelEn: "What clothing should the body wear?",
        reasonNl: "Helpt het personage consistent voor te bereiden voor animatie.",
        reasonEn: "Helps prepare a consistent character for animation.",
        optionsNl: ["Casual", "Sport", "Chef outfit", "Neutraal"],
        optionsEn: ["Casual", "Sport", "Chef outfit", "Neutral"],
        required: false,
        affectsSettings: ["clothing"],
      }),
      q({
        id: "pose",
        labelNl: "Welke houding wil je?",
        labelEn: "Which pose do you want?",
        reasonNl: "Een neutrale of vriendelijke pose werkt het best voor motion.",
        reasonEn: "A neutral or friendly pose works best for motion.",
        optionsNl: ["Neutrale pose", "Vriendelijke pose"],
        optionsEn: ["Neutral pose", "Friendly pose"],
        affectsSettings: ["pose"],
      }),
    ],
    "medium"
  );

  return {
    originalMessage: message,
    understoodGoal: nl
      ? "Een animatieklaar personage maken van een selfie."
      : "Create a motion-ready character from a selfie.",
    detectedIntent: "prepare_motion_character",
    confidence: "medium",
    targetModule: "characters",
    likelyActionId: "prepare_motion_character",
    extractedEntities: {
      people: [nl ? "Jij / hoofdpersonage" : "You / main character"],
      characters: [nl ? "Animatieklaar personage" : "Motion-ready character"],
      constraints: [nl ? "Volledig lichaam voor animatie" : "Full body for animation"],
    },
    inferredSettings: {
      motionReadyNeeded: true,
      fullBodyRequired: true,
      handsRequired: true,
      feetRequired: true,
      transparentBackground: true,
      saveToLibrary: true,
    },
    missingInputs: nl ? ["selfie of bronfoto"] : ["selfie or source photo"],
    followUpQuestions: questions,
    suggestedRoute: "/studio/characters/motion-ready",
    source: "rules",
  };
}

function buildOutfitFusionInterpretation(message: string, locale?: string): AssistantInterpretation {
  const nl = isNl(locale);
  const protectFace = includesAny(normalize(message), [
    "gezicht niet",
    "niet mijn gezicht",
    "face not",
    "don't change my face",
  ]);

  return {
    originalMessage: message,
    understoodGoal: nl
      ? "Alleen kleding vervangen vanuit een referentie, zonder je gezicht te wijzigen."
      : "Replace clothing from a reference without changing your face.",
    detectedIntent: "outfit_from_reference",
    confidence: "high",
    targetModule: "fusion",
    likelyActionId: "create_fusion",
    extractedEntities: {
      people: [nl ? "Jij / hoofdpersonage" : "You / main character"],
      assets: [nl ? "Kledingreferentie" : "Clothing reference"],
      constraints: protectFace
        ? [nl ? "Gezicht beschermen" : "Protect face", nl ? "Pose behouden" : "Preserve pose"]
        : [nl ? "Alleen kleding wijzigen" : "Clothing only"],
    },
    inferredSettings: {
      fusionIntent: "outfit_from_reference",
      fusionArchetype: "character_outfit",
      clothingOnly: true,
      protectFace: true,
      protectIdentity: true,
      protectPose: true,
      protectBackground: true,
      protectSkin: true,
      protectHair: true,
    },
    missingInputs: nl
      ? ["persoonfoto", "kledingreferentie"]
      : ["person photo", "clothing reference"],
    followUpQuestions: limitQuestions(
      [
        q({
          id: "person_photo",
          labelNl: "Welke foto is van jou?",
          labelEn: "Which photo is you?",
          reasonNl: "De fusion-wizard heeft een duidelijke persoonfoto nodig.",
          reasonEn: "The fusion wizard needs a clear person photo.",
          optionsNl: ["Upload in wizard"],
          optionsEn: ["Upload in wizard"],
          affectsSettings: ["personRole"],
        }),
        q({
          id: "outfit_photo",
          labelNl: "Welke foto is de jas of outfit?",
          labelEn: "Which photo is the jacket or outfit?",
          reasonNl: "De kledingreferentie bepaalt wat er vervangen wordt.",
          reasonEn: "The clothing reference defines what gets replaced.",
          optionsNl: ["Upload in wizard"],
          optionsEn: ["Upload in wizard"],
          affectsSettings: ["outfitRole"],
        }),
      ],
      "high"
    ),
    suggestedRoute: "/editor/start?workflow=combine",
    source: "rules",
  };
}

function buildMotionVideoInterpretation(
  message: string,
  locale?: string,
  variant: "sports" | "street" = "sports"
): AssistantInterpretation {
  const nl = isNl(locale);
  const isSports = variant === "sports";

  const understoodGoal = isSports
    ? nl
      ? "Een korte actieclip waarin jij scoort of een doelpunt viert."
      : "A short action clip where you score or celebrate a goal."
    : nl
      ? "Een grappige herkenbare straatvideo met jou in de hoofdrol."
      : "A funny recognizable street video starring you.";

  const inferredSettings = isSports
    ? {
        actionClipCandidate: true,
        scene: "football stadium",
        action: "score goal celebration",
        style: "cinematic sports",
        mood: "exciting",
      }
    : {
        actionClipCandidate: true,
        scene: "city street",
        action: "funny recognition moment",
        style: "humorous social",
        mood: "playful",
      };

  const feasibilityNl = isSports
    ? "Exact balcontact en complexe sportbewegingen kunnen wisselend uitpakken. Een doelpuntviering is betrouwbaarder dan een perfecte trap."
    : "Herkenbare straatscènes werken het best met een duidelijke foto van jou en een eenvoudig scenario.";
  const feasibilityEn = isSports
    ? "Exact ball contact and complex sports motion can vary. A goal celebration is more reliable than a perfect kick."
    : "Recognizable street scenes work best with a clear photo of you and a simple scenario.";

  return {
    originalMessage: message,
    understoodGoal,
    detectedIntent: "create_motion_video",
    confidence: "medium",
    targetModule: "motion",
    likelyActionId: "create_motion_video",
    extractedEntities: {
      people: [nl ? "Jij / hoofdpersonage" : "You / main character"],
      locations: isSports
        ? [nl ? "Voetbalstadion" : "Football stadium"]
        : [nl ? "Straat / stad" : "Street / city"],
      actions: isSports
        ? [nl ? "Scoren of vieren" : "Score or celebrate"]
        : [nl ? "Grappig herkend worden" : "Funny recognition moment"],
      style: isSports
        ? [nl ? "Filmisch sportief" : "Cinematic sports"]
        : [nl ? "Grappig / sociaal" : "Funny / social"],
    },
    inferredSettings,
    missingInputs: nl ? ["foto van jezelf"] : ["photo of yourself"],
    followUpQuestions: limitQuestions(
      [
        q({
          id: "moment_focus",
          labelNl: "Wil je het moment van scoren of vooral het vieren?",
          labelEn: "Do you want the scoring moment or mainly the celebration?",
          reasonNl: "Viering is betrouwbaarder voor AI-motion dan exact balcontact.",
          reasonEn: "Celebration is more reliable for AI motion than exact ball contact.",
          optionsNl: ["Scoren", "Vieren", "Beide proberen"],
          optionsEn: ["Scoring", "Celebration", "Try both"],
          affectsSettings: ["action", "motionPreset"],
        }),
        q({
          id: "style_tone",
          labelNl: "Realistisch, grappig of filmisch?",
          labelEn: "Realistic, funny, or cinematic?",
          reasonNl: "Dit stuurt stijl en mood in de Motion-wizard.",
          reasonEn: "This guides style and mood in the Motion wizard.",
          optionsNl: ["Realistisch", "Grappig", "Filmisch"],
          optionsEn: ["Realistic", "Funny", "Cinematic"],
          affectsSettings: ["style", "mood"],
        }),
        q({
          id: "source_photo",
          labelNl: "Heb je een foto van jezelf?",
          labelEn: "Do you have a photo of yourself?",
          reasonNl: "Een bronfoto helpt consistentie in de clip.",
          reasonEn: "A source photo helps consistency in the clip.",
          optionsNl: ["Ja, upload in wizard", "Nog niet"],
          optionsEn: ["Yes, upload in wizard", "Not yet"],
          affectsSettings: ["sourceImages"],
        }),
      ],
      "medium"
    ),
    safetyOrFeasibilityNotes: [nl ? feasibilityNl : feasibilityEn],
    suggestedRoute: "/animate/instant",
    source: "rules",
  };
}

function buildStudioStoryInterpretation(message: string, locale?: string): AssistantInterpretation {
  const nl = isNl(locale);
  const isHomeCheff = normalize(message).includes("homecheff");

  return {
    originalMessage: message,
    understoodGoal: nl
      ? "Een promotievideo plannen voor HomeCheff."
      : "Plan a promotional video for HomeCheff.",
    detectedIntent: "studio_story",
    confidence: "medium",
    targetModule: "studio",
    likelyActionId: "create_motion_video",
    extractedEntities: {
      products: [nl ? "HomeCheff platform" : "HomeCheff platform"],
      characters: isHomeCheff
        ? [
            nl ? "Jij / merkstem" : "You / brand voice",
            nl ? "Chef mascotte" : "Chef mascot",
            nl ? "Garden mascotte" : "Garden mascot",
          ]
        : [nl ? "Hoofdpersonage" : "Main character"],
      locations: [nl ? "Lokale community" : "Local community"],
    },
    inferredSettings: {
      storyType: "promotion",
      narrativeMode: "voiceover",
      likelyAudience: "local community",
      cta: nl ? "Ontdek HomeCheff" : "Discover HomeCheff",
      sceneCount: 4,
      durationSeconds: 30,
    },
    missingInputs: nl ? ["doelgroep", "lengte", "voice mode"] : ["audience", "duration", "voice mode"],
    followUpQuestions: limitQuestions(
      [
        q({
          id: "audience",
          labelNl: "Voor wie is de video bedoeld?",
          labelEn: "Who is the video for?",
          reasonNl: "Dit bepaalt toon en verhaalrichting in Studio.",
          reasonEn: "This shapes tone and story direction in Studio.",
          optionsNl: ["Consumenten", "Zakelijk", "Algemeen publiek"],
          optionsEn: ["Consumers", "Business", "General audience"],
          affectsSettings: ["audience", "storyType"],
        }),
        q({
          id: "narrative_mode",
          labelNl: "Voice-over, dialogen of beide?",
          labelEn: "Voice-over, dialogue, or both?",
          reasonNl: "Dit bepaalt of Studio dialogen, voice-over of beide voorbereidt.",
          reasonEn: "This determines whether Studio prepares dialogue, voice-over, or both.",
          optionsNl: ["Voice-over", "Dialogen", "Beide", "Geen spraak"],
          optionsEn: ["Voice-over", "Dialogue", "Both", "No speech"],
          affectsSettings: ["narrativeMode", "voicePlan", "dialoguePlan"],
        }),
        q({
          id: "duration",
          labelNl: "Hoe lang moet de video ongeveer zijn?",
          labelEn: "Roughly how long should the video be?",
          reasonNl: "Helpt scene-aantal en pacing vooraf in te stellen.",
          reasonEn: "Helps prefill scene count and pacing.",
          optionsNl: ["30 seconden", "60 seconden"],
          optionsEn: ["30 seconds", "60 seconds"],
          affectsSettings: ["durationSeconds", "sceneCount"],
        }),
      ],
      "medium"
    ),
    suggestedRoute: "/studio/storyboards/new",
    source: "rules",
  };
}

export function interpretAssistantRequest(
  message: string,
  context: AssistantInterpretationContext = {}
): AssistantInterpretation | null {
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }

  const detected = detectRuleIntent(trimmed);
  if (!detected) {
    return null;
  }

  switch (detected.intent) {
    case "outfit_from_reference":
      return buildOutfitFusionInterpretation(trimmed, context.locale);
    case "prepare_motion_character":
      return buildMotionCharacterInterpretation(trimmed, context.locale);
    case "create_motion_video": {
      const presetId = detectMotionActionPresetFromMessage(trimmed);
      if (presetId) {
        const preset = getMotionActionPreset(presetId);
        if (preset) {
          return buildActionPresetInterpretation(trimmed, preset, context.locale);
        }
      }
      const text = normalize(trimmed);
      const variant =
        includesAny(text, ["grappig", "herkennen", "straat", "funny", "street"]) &&
        !includesAny(text, ["voetbal", "football", "doelpunt", "scoor"])
          ? "street"
          : "sports";
      return buildMotionVideoInterpretation(trimmed, context.locale, variant);
    }
    case "studio_story":
      return buildStudioStoryInterpretation(trimmed, context.locale);
    default:
      return null;
  }
}

export function validateAssistantInterpretation(raw: unknown): AssistantInterpretation | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const originalMessage = typeof row.originalMessage === "string" ? row.originalMessage.trim() : "";
  const understoodGoal = typeof row.understoodGoal === "string" ? row.understoodGoal.trim() : "";
  const detectedIntent = typeof row.detectedIntent === "string" ? row.detectedIntent.trim() : "";
  const confidence = typeof row.confidence === "string" ? row.confidence : "";
  const targetModule = typeof row.targetModule === "string" ? row.targetModule : "";
  const likelyActionId = typeof row.likelyActionId === "string" ? row.likelyActionId : "unknown";

  if (!originalMessage || !understoodGoal || !detectedIntent) {
    return null;
  }
  if (!VALID_CONFIDENCE.has(confidence) || !VALID_MODULES.has(targetModule)) {
    return null;
  }
  if (!VALID_ACTION_IDS.has(likelyActionId)) {
    return null;
  }

  if (understoodGoal.length > 400 || understoodGoal === originalMessage) {
    return null;
  }

  const entities = (row.extractedEntities ?? {}) as Record<string, unknown>;
  const sanitizedEntities: AssistantInterpretation["extractedEntities"] = {};
  for (const key of [
    "people",
    "characters",
    "assets",
    "locations",
    "products",
    "actions",
    "style",
    "constraints",
  ] as const) {
    const value = entities[key];
    if (Array.isArray(value)) {
      const items = value
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim())
        .filter((item) => item !== originalMessage && item.length < 120);
      if (items.length > 0) {
        sanitizedEntities[key] = items.slice(0, 8);
      }
    }
  }

  const inferredSettings =
    row.inferredSettings && typeof row.inferredSettings === "object" && !Array.isArray(row.inferredSettings)
      ? (row.inferredSettings as Record<string, unknown>)
      : {};

  const missingInputs = Array.isArray(row.missingInputs)
    ? row.missingInputs.filter((item): item is string => typeof item === "string").slice(0, 8)
    : [];

  const followUpQuestions: AssistantInterpretationQuestion[] = [];
  if (Array.isArray(row.followUpQuestions)) {
    for (const item of row.followUpQuestions.slice(0, 6)) {
      if (!item || typeof item !== "object") {
        continue;
      }
      const qRow = item as Record<string, unknown>;
      const id = typeof qRow.id === "string" ? qRow.id.trim() : "";
      const label = typeof qRow.label === "string" ? qRow.label.trim() : "";
      const reason = typeof qRow.reason === "string" ? qRow.reason.trim() : "";
      const options = Array.isArray(qRow.options)
        ? qRow.options.filter((opt): opt is string => typeof opt === "string").slice(0, 6)
        : [];
      const affectsSettings = Array.isArray(qRow.affectsSettings)
        ? qRow.affectsSettings.filter((opt): opt is string => typeof opt === "string").slice(0, 8)
        : [];
      if (!id || !label || options.length === 0) {
        continue;
      }
      followUpQuestions.push({
        id,
        label,
        reason: reason || label,
        options,
        required: qRow.required !== false,
        affectsSettings,
      });
    }
  }

  const safetyOrFeasibilityNotes = Array.isArray(row.safetyOrFeasibilityNotes)
    ? row.safetyOrFeasibilityNotes
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .slice(0, 4)
    : undefined;

  return {
    originalMessage,
    understoodGoal,
    detectedIntent,
    confidence: confidence as AssistantInterpretation["confidence"],
    targetModule: targetModule as AssistantInterpretationTargetModule,
    likelyActionId: likelyActionId as AssistantActionId | "unknown",
    extractedEntities: sanitizedEntities,
    inferredSettings,
    missingInputs,
    followUpQuestions: limitQuestions(
      followUpQuestions,
      confidence as AssistantInterpretation["confidence"]
    ),
    safetyOrFeasibilityNotes,
    suggestedRoute: typeof row.suggestedRoute === "string" ? row.suggestedRoute : undefined,
    source: "llm",
  };
}

function mapInterpretationQuestionToPrefill(
  question: AssistantInterpretationQuestion
): import("@/types/assistant-prefill").AssistantPrefillQuestion | null {
  const known: Record<string, `assistant.prefill.question.${string}`> = {
    body_style: "assistant.prefill.question.bodyStyle",
    pose: "assistant.prefill.question.pose",
    audience: "assistant.prefill.question.audience",
    duration: "assistant.prefill.question.duration",
    voice_mode: "assistant.prefill.question.voiceMode",
    narrative_mode: "assistant.prefill.question.voiceMode",
    person_photo: "assistant.prefill.question.personPhoto",
    outfit_photo: "assistant.prefill.question.outfitPhoto",
    clothing_only: "assistant.prefill.question.clothingOnly",
  };

  const labelKey = known[question.id];
  if (labelKey) {
    return {
      id: question.id,
      labelKey,
      kind: "choice",
      options: question.options.map((option, index) => ({
        id: option.toLowerCase().replace(/\s+/g, "_").slice(0, 24) || `opt_${index}`,
        labelKey: labelKey,
      })),
    };
  }

  if (question.id === "person_photo" || question.id === "outfit_photo" || question.id === "source_photo") {
    return {
      id: question.id,
      labelKey: "assistant.prefill.question.personPhoto",
      kind: "confirm",
    };
  }

  return {
    id: question.id,
    labelKey: "assistant.prefill.question.bodyStyle",
    kind: "choice",
    options: question.options.map((option, index) => ({
      id: `interpretation_${question.id}_${index}`,
      labelKey: "assistant.prefill.question.bodyStyle",
    })),
  };
}

function buildMotionVideoPackage(
  interpretation: AssistantInterpretation,
  routeContext: AssistantRouteContext
): AssistantPrefillPackage {
  const settings = interpretation.inferredSettings;
  const presetIdRaw = settings.actionPresetId;
  if (isMotionActionPresetId(presetIdRaw)) {
    const fromPreset = buildActionPresetPrefillPackage({
      presetId: presetIdRaw,
      message: interpretation.originalMessage,
      routeContext,
      interpretation,
    });
    if (fromPreset) {
      return fromPreset;
    }
  }

  const styleRaw = String(settings.style ?? "");
  const moodRaw = String(settings.mood ?? "");
  const motionStyle =
    styleRaw.includes("humor") || moodRaw.includes("playful")
      ? "social"
      : styleRaw.includes("cinematic") || styleRaw.includes("sport")
        ? "cinematic"
        : "realistic";

  const pending = interpretation.followUpQuestions
    .map(mapInterpretationQuestionToPrefill)
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  return {
    version: 1,
    id: createAssistantPrefillId(),
    intent: "motion_video",
    actionId: "create_motion_video",
    targetRoute: buildAssistantActionRoute("create_motion_video", routeContext),
    projectId: routeContext.projectId ?? null,
    generationGoal: interpretation.understoodGoal,
    estimatedCost: null,
    readiness: pending.length > 0 ? "waiting_for_answer" : "ready_to_open",
    missingInputs: ["assistant.prefill.missing.person"],
    pendingQuestions: pending,
    activitySteps: [
      { id: "intent", labelKey: "assistant.prefill.activity.intent", status: "done" },
      { id: "route", labelKey: "assistant.prefill.activity.route", status: "done" },
      {
        id: "questions",
        labelKey: "assistant.prefill.activity.questions",
        status: pending.length > 0 ? "active" : "done",
      },
      {
        id: "settings",
        labelKey: "assistant.prefill.activity.settings",
        status: pending.length > 0 ? "pending" : "done",
      },
      {
        id: "review",
        labelKey: "assistant.prefill.activity.review",
        status: pending.length > 0 ? "pending" : "active",
      },
    ],
    motion: {
      style: motionStyle,
      mood: moodRaw || "exciting",
      motionPreset: String(settings.action ?? "celebration"),
      textOverlayPreference: interpretation.extractedEntities.actions?.[0],
      durationSeconds: 5,
    },
    understoodKey: understoodKeyForIntent(interpretation.detectedIntent),
    settingLabelKeys: ["assistant.prefill.setting.motionStyle", "assistant.prefill.setting.motionMood"],
    interpretationSummary: buildInterpretationSummary(interpretation),
    interpretation,
    createdAt: new Date().toISOString(),
    providerCalls: 0,
    creditsConsumed: 0,
  };
}

export function buildPrefillPackageFromInterpretation(
  interpretation: AssistantInterpretation,
  routeContext: AssistantRouteContext
): AssistantPrefillPackage | null {
  if (interpretation.likelyActionId === "unknown") {
    return null;
  }

  const prefillIntent = intentToPrefill(interpretation.detectedIntent);
  if (!prefillIntent) {
    return null;
  }

  if (prefillIntent === "motion_video") {
    return buildMotionVideoPackage(interpretation, routeContext);
  }

  const legacyDetect: AssistantPrefillDetectResult = {
    kind: "prefill",
    intent: prefillIntent,
    actionId: actionForIntent(interpretation.detectedIntent) as AssistantActionId,
    understoodKey: understoodKeyForIntent(interpretation.detectedIntent),
  };

  const base = buildAssistantPrefillPackage({
    intent: legacyDetect.intent,
    message: interpretation.originalMessage,
    actionId: legacyDetect.actionId,
    understoodKey: legacyDetect.understoodKey,
    routeContext,
  });

  if (!base) {
    return null;
  }

  const interpretationQuestions = interpretation.followUpQuestions
    .map(mapInterpretationQuestionToPrefill)
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const mergedQuestions =
    interpretationQuestions.length > 0 ? interpretationQuestions : base.pendingQuestions;

  const readiness =
    mergedQuestions.length > 0 ? ("waiting_for_answer" as const) : base.readiness;

  return {
    ...base,
    generationGoal: interpretation.understoodGoal,
    readiness,
    pendingQuestions: mergedQuestions,
    missingInputs: base.missingInputs,
    interpretation,
    interpretationSummary: buildInterpretationSummary(interpretation),
    activitySteps: base.activitySteps.map((step) => {
      if (step.id === "questions") {
        return {
          ...step,
          status: mergedQuestions.length > 0 ? "active" : "done",
        };
      }
      if (step.id === "review") {
        return {
          ...step,
          status: readiness === "ready_to_open" ? "active" : "pending",
        };
      }
      return step;
    }),
    targetRoute:
      interpretation.suggestedRoute ??
      buildAssistantActionRoute(legacyDetect.actionId, routeContext),
  };
}

export function tryResolveInterpretationAnswer(
  interpretation: AssistantInterpretation,
  questionId: string,
  answer: string
): AssistantInterpretation {
  const remaining = interpretation.followUpQuestions.filter((q) => q.id !== questionId);
  const inferredSettings = { ...interpretation.inferredSettings };

  if (questionId === "body_style") {
    inferredSettings.style = answer.includes("cartoon") ? "cartoon" : "realistic";
  }
  if (questionId === "pose") {
    inferredSettings.pose = answer.includes("friend") || answer.includes("vriend")
      ? "friendly"
      : "neutral_standing";
  }
  if (questionId === "narrative_mode" || questionId === "voice_mode") {
    inferredSettings.narrativeMode = answer.includes("dialog") || answer.includes("dialoog")
      ? "dialogue"
      : "voiceover";
  }
  if (questionId === "duration") {
    inferredSettings.durationSeconds = answer.includes("60") ? 60 : 30;
  }
  if (questionId === "style_tone") {
    inferredSettings.style = answer.includes("film") || answer.includes("cinematic")
      ? "cinematic"
      : answer.includes("grapp") || answer.includes("funny")
        ? "humorous"
        : "realistic";
  }
  if (questionId === "moment_focus") {
    inferredSettings.action = answer.includes("vier") || answer.includes("celebr")
      ? "goal celebration"
      : "scoring moment";
  }

  const answeredCount = interpretation.followUpQuestions.length - remaining.length + 1;
  const confidence =
    remaining.length === 0
      ? "high"
      : answeredCount >= 2
        ? "medium"
        : interpretation.confidence;

  return {
    ...interpretation,
    inferredSettings,
    followUpQuestions: remaining,
    confidence,
    missingInputs: remaining.length > 0 ? interpretation.missingInputs : [],
  };
}

export function applyInterpretationAnswerToPrefill(
  pkg: AssistantPrefillPackage,
  interpretation: AssistantInterpretation,
  questionId: string,
  answer: string
): { interpretation: AssistantInterpretation; pkg: AssistantPrefillPackage } {
  const nextInterpretation = tryResolveInterpretationAnswer(interpretation, questionId, answer);
  const routeContext: AssistantRouteContext = {
    projectId: pkg.projectId,
  };
  let nextPkg =
    buildPrefillPackageFromInterpretation(nextInterpretation, routeContext) ?? pkg;

  if (pkg.questionAnswers && Object.keys(pkg.questionAnswers).length > 0) {
    nextPkg = applyPrefillAnswer(nextPkg, questionId, answer);
  } else {
    nextPkg = {
      ...nextPkg,
      questionAnswers: { ...(nextPkg.questionAnswers ?? {}), [questionId]: answer },
    };
  }

  return { interpretation: nextInterpretation, pkg: { ...nextPkg, interpretation: nextInterpretation } };
}

export function tryResolveInterpretationAnswerFromMessage(
  interpretation: AssistantInterpretation,
  message: string
): { questionId: string; answer: string } | null {
  const pending = interpretation.followUpQuestions[0];
  if (!pending) {
    return null;
  }
  const text = normalize(message);
  const option = pending.options.find(
    (row) =>
      text === row.toLowerCase() ||
      text.includes(row.toLowerCase()) ||
      normalize(row) === text
  );
  if (option) {
    return { questionId: pending.id, answer: option };
  }
  if (pending.id === "person_photo" || pending.id === "outfit_photo" || pending.id === "source_photo") {
    if (includesAny(text, ["ja", "yes", "ok", "upload", "klaar", "done"])) {
      return { questionId: pending.id, answer: "ready" };
    }
  }
  return null;
}

export function containsLiteralUserPromptCopy(
  interpretation: AssistantInterpretation,
  userMessage: string
): boolean {
  const normalizedUser = normalize(userMessage);
  if (normalizedUser.length < 12) {
    return false;
  }
  if (normalize(interpretation.understoodGoal) === normalizedUser) {
    return true;
  }
  const entityValues = Object.values(interpretation.extractedEntities).flat();
  return entityValues.some((value) => normalize(value) === normalizedUser);
}
