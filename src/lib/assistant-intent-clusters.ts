import type { AssistantActionId } from "@/lib/assistant-action-registry";
import { detectMotionActionPresetFromMessage } from "@/lib/motion-action-presets";
import { buildActionPresetInterpretation } from "@/lib/motion-action-preset-prefill";
import { getMotionActionPreset } from "@/lib/motion-action-presets";
import type {
  AssistantInterpretation,
  AssistantInterpretationContext,
  AssistantInterpretationQuestion,
} from "@/types/assistant-interpretation";

export type IntentClusterId =
  | "mascot_variant"
  | "outfit_change"
  | "future_identity"
  | "celebrity_scene"
  | "sports_action"
  | "publish_help"
  | "general_help";

export type IntentClusterMatch = {
  clusterId: IntentClusterId;
  confidence: AssistantInterpretation["confidence"];
  score: number;
};

type ClusterRule = {
  id: IntentClusterId;
  needles: string[];
  weight?: number;
};

const CLUSTER_RULES: ClusterRule[] = [
  {
    id: "mascot_variant",
    needles: [
      "mascotte alternatief",
      "mascot alternative",
      "andere mascotte",
      "nieuwe mascotte versie",
      "mascotte variant",
      "alternatief karakter",
      "andere versie van dit figuur",
      "onze mascotte moderner",
      "chef anders maken",
      "garden anders maken",
      "designer anders maken",
      "cartoon poppetje alternatief",
      "mascotte alternatief maken",
      "alternatieve mascotte",
      "mascot variant",
      "nieuwe versie mascotte",
    ],
    weight: 3,
  },
  {
    id: "outfit_change",
    needles: [
      "deze jas op mij",
      "jas op mij zetten",
      "andere outfit",
      "kleding veranderen",
      "alleen kleding",
      "only clothing",
      "clothing only",
      "outfit veranderen",
      "gezicht hetzelfde",
      "face same",
      "protect face",
      "niet mijn gezicht",
    ],
    weight: 2,
  },
  {
    id: "future_identity",
    needles: [
      "als ik ouder ben",
      "when i'm older",
      "over 30 jaar",
      "in 30 years",
      "toekomstige kind",
      "future child",
      "familie kenmerken",
      "family traits",
      "ouder worden",
      "age progression",
      "leeftijd veranderen",
    ],
    weight: 2,
  },
  {
    id: "celebrity_scene",
    needles: [
      "mensen herkennen mij",
      "people recognize me",
      "herkennen op straat",
      "recognize on the street",
      "beroemd aankom",
      "celebrity entrance",
      "rode loper",
      "red carpet",
      "fans roepen mijn naam",
      "fans shout my name",
      "supercar aankomst",
      "sports car arrival",
      "niet te overdreven beroemd",
      "subtle celebrity",
    ],
    weight: 2,
  },
  {
    id: "sports_action",
    needles: [
      "doelpunt",
      "goal celebration",
      "dunk",
      "snowboard",
      "skateboard",
      "moonwalk",
      "salto",
      "somersault",
      "voetbal",
      "football",
      "iets met voetbal",
      "something with football",
      "kampioen",
      "championship",
      "stadium",
      "stadion",
    ],
    weight: 2,
  },
  {
    id: "publish_help",
    needles: [
      "klaarzetten voor tiktok",
      "ready for tiktok",
      "ondertitels",
      "subtitles",
      "engelse versie",
      "english version",
      "voice-over toevoegen",
      "add voice-over",
      "voiceover toevoegen",
      "publiceren op social",
      "publish to social",
      "exporteren voor",
      "export for",
    ],
    weight: 2,
  },
  {
    id: "general_help",
    needles: [
      "kan je me helpen",
      "kun je me helpen",
      "can you help me",
      "help me",
      "waar begin ik",
      "where do i start",
      "wat kan je",
      "what can you",
      "ik weet niet wat",
      "i don't know what",
    ],
    weight: 1,
  },
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function includesAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

function isNl(locale?: string): boolean {
  return !locale || locale.startsWith("nl");
}

function limitQuestions(
  questions: AssistantInterpretationQuestion[],
  confidence: AssistantInterpretation["confidence"]
): AssistantInterpretationQuestion[] {
  const max = confidence === "high" ? 2 : confidence === "medium" ? 4 : 6;
  return questions.slice(0, max);
}

function scoreCluster(text: string, rule: ClusterRule): number {
  let score = 0;
  for (const needle of rule.needles) {
    if (text.includes(needle)) {
      score += rule.weight ?? 1;
    }
  }
  if (rule.id === "mascot_variant" && text.includes("mascotte") && includesAny(text, ["alternatief", "variant", "andere", "nieuwe"])) {
    score += 4;
  }
  if (rule.id === "mascot_variant" && text.includes("mascot") && includesAny(text, ["alternative", "variant", "another", "new"])) {
    score += 4;
  }
  return score;
}

export function detectIntentCluster(message: string): IntentClusterMatch | null {
  const text = normalize(message);
  if (!text) {
    return null;
  }

  let best: IntentClusterMatch | null = null;
  for (const rule of CLUSTER_RULES) {
    const score = scoreCluster(text, rule);
    if (score <= 0) {
      continue;
    }
    const confidence: AssistantInterpretation["confidence"] =
      score >= 4 ? "high" : score >= 2 ? "medium" : "low";
    if (!best || score > best.score) {
      best = { clusterId: rule.id, confidence, score };
    }
  }
  return best;
}

function libraryMascotCount(context: AssistantInterpretationContext): number {
  return context.snapshot?.library.characters.length ?? 0;
}

function buildMascotVariantInterpretation(
  message: string,
  context: AssistantInterpretationContext,
  confidence: AssistantInterpretation["confidence"]
): AssistantInterpretation {
  const nl = isNl(context.locale);
  const mascotCount = libraryMascotCount(context);
  const hasMascots = mascotCount > 0;

  const questions = limitQuestions(
    [
      {
        id: "mascot_existing",
        label: nl
          ? "Heb je al een bestaande mascotte?"
          : "Do you already have an existing mascot?",
        reason: nl ? "Bepaalt of we vanuit referentie of scratch starten." : "Decides reference vs scratch.",
        options: nl ? ["Ja", "Nee", "Weet ik niet"] : ["Yes", "No", "Not sure"],
        required: true,
        affectsSettings: ["sourceType"],
      },
      {
        id: "mascot_identity",
        label: nl
          ? "Wil je dezelfde identiteit behouden?"
          : "Do you want to keep the same identity?",
        reason: nl ? "Helpt stijlvariant vs compleet nieuw ontwerp kiezen." : "Helps pick style variant vs new design.",
        options: nl ? ["Ja, zelfde identiteit", "Nee, mag anders"] : ["Yes, same identity", "No, can change"],
        required: false,
        affectsSettings: ["protectIdentity"],
      },
      {
        id: "mascot_change_focus",
        label: nl
          ? "Wil je vooral stijl, kleur, outfit of karakter veranderen?"
          : "Do you mainly want to change style, color, outfit, or character?",
        reason: nl ? "Stuurt editor- of character-flow." : "Routes editor or character flow.",
        options: nl
          ? ["Stijl", "Kleur", "Outfit", "Karakter", "Alles een beetje"]
          : ["Style", "Color", "Outfit", "Character", "A bit of everything"],
        required: false,
        affectsSettings: ["variantFocus"],
      },
    ],
    confidence
  );

  const alternatives = [
    {
      label: nl ? "Bestaande mascotte uploaden" : "Upload existing mascot",
      intent: "character_from_reference",
      reason: nl ? "Start vanuit referentiefoto" : "Start from reference photo",
    },
    {
      label: nl ? "Kies mascotte uit bibliotheek" : "Pick mascot from library",
      intent: "open_library_character",
      reason: nl ? "Hergebruik wat je al hebt" : "Reuse what you already have",
    },
    {
      label: nl ? "Nieuwe mascotte ontwerpen" : "Design a new mascot",
      intent: "character_new",
      reason: nl ? "Volledig nieuw ontwerp" : "Brand-new design",
    },
    {
      label: nl ? "Mascotte animatieklaar maken" : "Make mascot motion-ready",
      intent: "character_motion_ready",
      reason: nl ? "Klaar voor Motion" : "Ready for Motion",
    },
    {
      label: nl ? "Mascotte menselijker/cartoonachtiger maken" : "Make mascot more human/cartoon-like",
      intent: "character_style_variant",
      reason: nl ? "Stijlvariant van bestaand figuur" : "Style variant of existing figure",
    },
  ];

  let understoodGoal = nl
    ? "Ik denk dat je een alternatieve versie van een mascotte wilt maken."
    : "I think you want to create an alternative version of a mascot.";

  if (hasMascots) {
    understoodGoal += nl
      ? ` Ik zie ${mascotCount} personage(s)/mascotte(s) in je bibliotheek.`
      : ` I see ${mascotCount} character(s)/mascot(s) in your library.`;
  } else if (!context.isAuthenticated) {
    understoodGoal += nl
      ? " Je kunt het idee bekijken, maar om een mascotte op te slaan moet je inloggen."
      : " You can explore the idea, but you need to sign in to save a mascot.";
  } else {
    understoodGoal += nl
      ? " Upload eerst een afbeelding van je huidige mascotte, of start met een nieuw ontwerp."
      : " Upload an image of your current mascot first, or start with a new design.";
  }

  return {
    originalMessage: message,
    understoodGoal,
    detectedIntent: "mascot_variant",
    confidence,
    targetModule: "characters",
    likelyActionId: hasMascots ? "create_character_from_reference" : "create_character",
    extractedEntities: {
      characters: [nl ? "Mascotte / personage" : "Mascot / character"],
      constraints: [nl ? "Variant van bestaand figuur" : "Variant of existing figure"],
    },
    inferredSettings: {
      variantIntent: "mascot_alternative",
      protectIdentity: true,
    },
    missingInputs: hasMascots
      ? []
      : nl
        ? ["mascotte-referentie of nieuw ontwerp"]
        : ["mascot reference or new design"],
    followUpQuestions: questions,
    alternativeIntents: alternatives,
    creativeGoal: nl ? "Alternatieve mascotte-versie" : "Alternative mascot version",
    normalizedMeaning: nl ? "Mascotte alternatief" : "Mascot alternative",
    suggestedRoute: hasMascots ? "/studio/characters/from-reference" : "/studio/characters/new",
    source: "rules",
  };
}

function buildOutfitChangeInterpretation(
  message: string,
  context: AssistantInterpretationContext,
  confidence: AssistantInterpretation["confidence"]
): AssistantInterpretation {
  const nl = isNl(context.locale);
  const protectFace = includesAny(normalize(message), [
    "gezicht hetzelfde",
    "face same",
    "niet mijn gezicht",
    "protect face",
  ]);

  return {
    originalMessage: message,
    understoodGoal: nl
      ? "Alleen kleding/outfit wijzigen en je gezicht hetzelfde houden."
      : "Change only clothing/outfit while keeping your face the same.",
    detectedIntent: "outfit_from_reference",
    confidence: protectFace ? "high" : confidence,
    targetModule: "fusion",
    likelyActionId: "create_fusion",
    extractedEntities: {
      constraints: [
        nl ? "Alleen kleding" : "Clothing only",
        ...(protectFace ? [nl ? "Gezicht beschermen" : "Protect face"] : []),
      ],
    },
    inferredSettings: {
      fusionArchetype: "character_outfit",
      clothingOnly: true,
      protectFace: true,
      protectPose: true,
      protectIdentity: true,
    },
    missingInputs: nl ? ["persoonfoto", "outfit-referentie"] : ["person photo", "outfit reference"],
    followUpQuestions: limitQuestions(
      [
        {
          id: "outfit_source",
          label: nl ? "Heb je al een foto van de outfit?" : "Do you already have an outfit photo?",
          reason: nl ? "Fusion heeft een kledingreferentie nodig." : "Fusion needs a clothing reference.",
          options: nl ? ["Ja, uploaden", "Nog niet"] : ["Yes, upload", "Not yet"],
          required: true,
          affectsSettings: ["outfitRole"],
        },
      ],
      confidence
    ),
    prefillHints: { clothingOnly: true, protectFace: true, protectPose: true },
    suggestedRoute: "/editor/start?workflow=combine",
    source: "rules",
  };
}

function buildFutureIdentityInterpretation(
  message: string,
  context: AssistantInterpretationContext,
  confidence: AssistantInterpretation["confidence"]
): AssistantInterpretation {
  const nl = isNl(context.locale);
  return {
    originalMessage: message,
    understoodGoal: nl
      ? "Een toekomstige of leeftijdsvariant van jezelf of een familielid visualiseren."
      : "Visualize a future or age variant of yourself or a family member.",
    detectedIntent: "fusion_age_progression",
    confidence,
    targetModule: "fusion",
    likelyActionId: "create_fusion",
    extractedEntities: { actions: [nl ? "Leeftijd / toekomst" : "Age / future"] },
    inferredSettings: { fusionArchetype: "age_progression" },
    missingInputs: nl ? ["bronfoto"] : ["source photo"],
    followUpQuestions: [],
    suggestedRoute: "/editor/fuse",
    source: "rules",
  };
}

function buildCelebritySceneInterpretation(
  message: string,
  context: AssistantInterpretationContext,
  confidence: AssistantInterpretation["confidence"]
): AssistantInterpretation {
  const nl = isNl(context.locale);
  const text = normalize(message);
  const presetId = detectMotionActionPresetFromMessage(text);
  if (presetId) {
    const preset = getMotionActionPreset(presetId);
    if (preset) {
      return buildActionPresetInterpretation(message, preset, context.locale);
    }
  }

  const subtle = includesAny(text, ["niet te overdreven", "niet overdreven", "subtiel", "subtle", "not too"]);
  return {
    originalMessage: message,
    understoodGoal: nl
      ? "Een herkenbare of celebrity-achtige straat- of entreescène met jou in de hoofdrol."
      : "A recognizable or celebrity-style street or entrance scene starring you.",
    detectedIntent: "create_motion_video",
    confidence: subtle ? "medium" : confidence,
    targetModule: "motion",
    likelyActionId: "create_motion_video",
    likelyPresetId: presetId ?? (includesAny(text, ["herkennen", "recognize"]) ? "fans_recognize_me" : "hero_entrance"),
    extractedEntities: { style: [nl ? "Filmisch / sociaal" : "Cinematic / social"] },
    inferredSettings: {
      actionPresetId: presetId ?? (includesAny(text, ["herkennen", "recognize"]) ? "fans_recognize_me" : "hero_entrance"),
      intensity: subtle ? "subtle" : "balanced",
    },
    missingInputs: nl ? ["foto van jezelf"] : ["photo of yourself"],
    followUpQuestions: [],
    intensity: subtle ? "subtle" : "balanced",
    constraints: subtle ? ["not too exaggerated"] : [],
    suggestedRoute: "/animate/instant",
    source: "rules",
  };
}

function buildSportsActionInterpretation(
  message: string,
  context: AssistantInterpretationContext,
  confidence: AssistantInterpretation["confidence"]
): AssistantInterpretation {
  const nl = isNl(context.locale);
  const presetId = detectMotionActionPresetFromMessage(normalize(message));
  if (presetId) {
    const preset = getMotionActionPreset(presetId);
    if (preset) {
      return buildActionPresetInterpretation(message, preset, context.locale);
    }
  }

  const alternatives = [
    { label: nl ? "Doelpunt vieren" : "Goal celebration", intent: "goal_celebration", presetId: "goal_celebration", reason: "" },
    { label: nl ? "Stadionopkomst" : "Stadium walkout", intent: "stadium_entrance", presetId: "stadium_entrance", reason: "" },
    { label: nl ? "Dunk / salto / actie" : "Dunk / flip / action", intent: "sports_action", presetId: "dunk", reason: "" },
  ];

  return {
    originalMessage: message,
    understoodGoal: nl
      ? "Een sport- of actieclip — nog niet helemaal duidelijk welk moment."
      : "A sports or action clip — the exact moment isn't fully clear yet.",
    detectedIntent: "create_motion_video",
    confidence: includesAny(normalize(message), ["iets met voetbal", "something with football"]) ? "low" : confidence,
    targetModule: "motion",
    likelyActionId: "create_motion_video",
    extractedEntities: { actions: [nl ? "Sport / actie" : "Sports / action"] },
    inferredSettings: { actionClipCandidate: true },
    missingInputs: nl ? ["welk sportmoment"] : ["which sports moment"],
    alternativeIntents: alternatives,
    followUpQuestions: limitQuestions(
      [
        {
          id: "sports_variant",
          label: nl ? "Welke actie past het best?" : "Which action fits best?",
          reason: nl ? "Kies het sportmoment." : "Pick the sports moment.",
          options: alternatives.map((row) => row.label),
          required: true,
          affectsSettings: ["actionPresetId"],
        },
      ],
      confidence
    ),
    suggestedRoute: "/animate/instant",
    source: "rules",
  };
}

function buildPublishHelpInterpretation(
  message: string,
  context: AssistantInterpretationContext,
  confidence: AssistantInterpretation["confidence"]
): AssistantInterpretation {
  const nl = isNl(context.locale);
  return {
    originalMessage: message,
    understoodGoal: nl
      ? "Je video klaarzetten voor publicatie, ondertitels of een andere taalversie."
      : "Prepare your video for publishing, subtitles, or another language version.",
    detectedIntent: "publish_export",
    confidence,
    targetModule: "publish",
    likelyActionId: "create_publish_export",
    extractedEntities: { actions: [nl ? "Publiceren / exporteren" : "Publish / export"] },
    inferredSettings: {},
    missingInputs: [],
    followUpQuestions: limitQuestions(
      [
        {
          id: "publish_goal",
          label: nl ? "Wat wil je precies doen?" : "What exactly do you want to do?",
          reason: nl ? "Publish dekt meerdere workflows." : "Publish covers multiple workflows.",
          options: nl
            ? ["TikTok / social export", "Ondertitels", "Engelse versie", "Voice-over toevoegen"]
            : ["TikTok / social export", "Subtitles", "English version", "Add voice-over"],
          required: true,
          affectsSettings: ["publishMode"],
        },
      ],
      confidence
    ),
    suggestedRoute: "/publish",
    source: "rules",
  };
}

export function buildGeneralHelpInterpretation(
  message: string,
  context: AssistantInterpretationContext
): AssistantInterpretation {
  const nl = isNl(context.locale);
  return {
    originalMessage: message,
    understoodGoal: nl ? "Creatief aan de slag in HomeCheff Studio." : "Get creative in HomeCheff Studio.",
    detectedIntent: "producer_guidance",
    confidence: "low",
    targetModule: "studio",
    likelyActionId: "unknown",
    extractedEntities: {},
    inferredSettings: {},
    missingInputs: [],
    followUpQuestions: [],
    alternativeIntents: [
      { label: nl ? "Iets maken met een foto" : "Make something from a photo", intent: "fusion", reason: "" },
      { label: nl ? "Een video maken" : "Make a video", intent: "motion_video", reason: "" },
      { label: nl ? "Een personage of mascotte maken" : "Create a character or mascot", intent: "character_new", reason: "" },
      { label: nl ? "Een project afmaken" : "Finish a project", intent: "open_project", reason: "" },
      { label: nl ? "Publiceren of exporteren" : "Publish or export", intent: "publish", reason: "" },
    ],
    source: "rules",
  };
}

export function buildInterpretationFromIntentCluster(
  message: string,
  match: IntentClusterMatch,
  context: AssistantInterpretationContext
): AssistantInterpretation {
  switch (match.clusterId) {
    case "mascot_variant":
      return buildMascotVariantInterpretation(message, context, match.confidence);
    case "outfit_change":
      return buildOutfitChangeInterpretation(message, context, match.confidence);
    case "future_identity":
      return buildFutureIdentityInterpretation(message, context, match.confidence);
    case "celebrity_scene":
      return buildCelebritySceneInterpretation(message, context, match.confidence);
    case "sports_action":
      return buildSportsActionInterpretation(message, context, match.confidence);
    case "publish_help":
      return buildPublishHelpInterpretation(message, context, match.confidence);
    case "general_help":
      return buildGeneralHelpInterpretation(message, context);
    default:
      return buildGeneralHelpInterpretation(message, context);
  }
}

export function clusterOptionActionId(intent: string): AssistantActionId | undefined {
  switch (intent) {
    case "character_from_reference":
      return "create_character_from_reference";
    case "character_new":
      return "create_character";
    case "character_motion_ready":
      return "prepare_motion_character";
    case "motion_video":
      return "create_motion_video";
    case "fusion":
      return "create_fusion";
    case "publish":
      return "create_publish_export";
    case "open_project":
      return "open_project";
    case "open_library_character":
      return "open_asset";
    default:
      return undefined;
  }
}

export function clusterOptionRoute(intent: string): string | undefined {
  switch (intent) {
    case "character_from_reference":
      return "/studio/characters/from-reference";
    case "character_new":
      return "/studio/characters/new";
    case "character_motion_ready":
      return "/studio/characters/motion-ready";
    case "character_style_variant":
      return "/editor/fuse";
    case "open_library_character":
      return "/studio/assets/browse";
    case "motion_video":
      return "/animate/instant";
    case "fusion":
      return "/editor/start?workflow=combine";
    case "publish":
      return "/publish";
    case "open_project":
      return "/projects";
    default:
      return undefined;
  }
}
