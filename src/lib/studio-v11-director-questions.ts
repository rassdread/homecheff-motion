import type {
  StudioV11ConfidenceField,
  StudioV11DirectorSuggestions,
  StudioV11DynamicQuestion,
  StudioV11FieldConfidence,
} from "@/types/studio-v11-director-wizard";
import {
  questionLimitForOverall,
  resolveOverallDirectorConfidence,
} from "@/lib/studio-v11-director-confidence";

function formatListSuggestion(value: string | string[]): string {
  return Array.isArray(value) ? value.join(", ") : value;
}

function optionsForField(
  field: StudioV11ConfidenceField,
  locale: "nl" | "en"
): Array<{ id: string; label: string }> {
  if (field === "cta") {
    return locale === "nl"
      ? [
          { id: "register", label: "Registreren" },
          { id: "discover", label: "Meer ontdekken" },
          { id: "contact", label: "Contact opnemen" },
          { id: "buy", label: "Product kopen" },
          { id: "other", label: "Anders" },
        ]
      : [
          { id: "register", label: "Sign up" },
          { id: "discover", label: "Discover more" },
          { id: "contact", label: "Contact us" },
          { id: "buy", label: "Buy product" },
          { id: "other", label: "Other" },
        ];
  }
  if (field === "narrativeType") {
    return locale === "nl"
      ? [
          { id: "story", label: "Verhaal" },
          { id: "commercial", label: "Reclame" },
          { id: "explainer", label: "Uitleg" },
          { id: "community", label: "Community" },
          { id: "documentary", label: "Documentair" },
        ]
      : [
          { id: "story", label: "Story" },
          { id: "commercial", label: "Commercial" },
          { id: "explainer", label: "Explainer" },
          { id: "community", label: "Community" },
          { id: "documentary", label: "Documentary" },
        ];
  }
  if (field === "dialogueMode") {
    return locale === "nl"
      ? [
          { id: "voice_over_only", label: "Alleen voice-over" },
          { id: "dialogue_only", label: "Alleen dialogen" },
          { id: "voice_over_and_dialogue", label: "Beide" },
          { id: "silent", label: "Geen gesproken tekst" },
        ]
      : [
          { id: "voice_over_only", label: "Voice-over only" },
          { id: "dialogue_only", label: "Dialogue only" },
          { id: "voice_over_and_dialogue", label: "Both" },
          { id: "silent", label: "No spoken audio" },
        ];
  }
  if (field === "characters") {
    return locale === "nl"
      ? [
          { id: "self", label: "Ikzelf" },
          { id: "mascots", label: "Mascotte(s)" },
          { id: "customers", label: "Klanten" },
          { id: "team", label: "Team" },
          { id: "other", label: "Anders" },
        ]
      : [
          { id: "self", label: "Myself" },
          { id: "mascots", label: "Mascot(s)" },
          { id: "customers", label: "Customers" },
          { id: "team", label: "Team" },
          { id: "other", label: "Other" },
        ];
  }
  if (field === "duration") {
    return locale === "nl"
      ? [
          { id: "15", label: "15 sec" },
          { id: "30", label: "30 sec" },
          { id: "60", label: "60 sec" },
          { id: "90", label: "90 sec" },
          { id: "auto", label: "Automatisch" },
        ]
      : [
          { id: "15", label: "15 sec" },
          { id: "30", label: "30 sec" },
          { id: "60", label: "60 sec" },
          { id: "90", label: "90 sec" },
          { id: "auto", label: "Automatic" },
        ];
  }
  return [];
}

function questionKindForField(field: StudioV11ConfidenceField) {
  if (field === "dialogueMode") return "voice" as const;
  if (field === "narrativeType") return "narrative" as const;
  if (field === "cta") return "cta" as const;
  if (field === "characters") return "characters" as const;
  if (field === "duration") return "duration" as const;
  if (field === "audience") return "audience" as const;
  if (field === "goal") return "goal" as const;
  if (field === "emotion") return "emotion" as const;
  if (field === "locations") return "locations" as const;
  if (field === "products") return "products" as const;
  return "confirm" as const;
}

function buildQuestionForConfidence(
  row: StudioV11FieldConfidence,
  locale: "nl" | "en"
): StudioV11DynamicQuestion {
  const suggestion = formatListSuggestion(row.suggestion);
  const required = row.level === "low";
  const kind = questionKindForField(row.field);
  const options = optionsForField(row.field, locale);

  const prompt =
    row.level === "medium" && locale === "nl"
      ? `We denken: ${suggestion}. Klopt dat?`
      : row.level === "medium"
        ? `We think: ${suggestion}. Is that right?`
        : locale === "nl"
          ? questionPromptNl(row.field)
          : questionPromptEn(row.field);

  return {
    id: `v11_q_${row.field}`,
    field: row.field,
    kind,
    required,
    prompt,
    explanation: locale === "nl" ? explanationNl(row.field) : explanationEn(row.field),
    options,
    suggestion,
  };
}

function questionPromptNl(field: StudioV11ConfidenceField): string {
  const map: Record<StudioV11ConfidenceField, string> = {
    goal: "Wat is het hoofddoel van deze video?",
    audience: "Wie is je doelgroep?",
    cta: "Wat moet de kijker doen na het bekijken?",
    duration: "Hoe lang mag de video ongeveer duren?",
    narrativeType: "Welke stijl wil je?",
    characters: "Wie speelt de hoofdrol?",
    locations: "Welke locaties zijn belangrijk?",
    products: "Welke producten of merken moeten zichtbaar zijn?",
    emotion: "Welke emotie moet overheersen?",
    dialogueMode: "Hoe wil je het verhaal vertellen?",
  };
  return map[field];
}

function questionPromptEn(field: StudioV11ConfidenceField): string {
  const map: Record<StudioV11ConfidenceField, string> = {
    goal: "What is the main goal of this video?",
    audience: "Who is your target audience?",
    cta: "What should viewers do after watching?",
    duration: "Roughly how long should the video be?",
    narrativeType: "Which style do you want?",
    characters: "Who is the lead character?",
    locations: "Which locations matter?",
    products: "Which products or brands should appear?",
    emotion: "Which emotion should dominate?",
    dialogueMode: "How should the story be told?",
  };
  return map[field];
}

function explanationNl(field: StudioV11ConfidenceField): string {
  const map: Record<StudioV11ConfidenceField, string> = {
    goal: "Studio mist nog duidelijkheid over het doel — dat bepaalt structuur en pacing.",
    audience: "Studio mist nog informatie over de doelgroep. Hierdoor kunnen we CTA en tone-of-voice beter bepalen.",
    cta: "Zonder duidelijke CTA weten kijkers niet wat de volgende stap is.",
    duration: "De lengte beïnvloedt scene-aantal, tempo en muziekstructuur.",
    narrativeType: "De vertelstijl bepaalt hoe scenes en overlays worden opgebouwd.",
    characters: "Personages bepalen wie spreekt en welke assets nodig zijn.",
    locations: "Locaties helpen scene-voorstellen en visuele continuïteit te maken.",
    products: "Producten bepalen welke props en overlays in beeld komen.",
    emotion: "Emotie stuurt muziek, voice-over en camerastijl.",
    dialogueMode: "Dit bepaalt of we voice-over, dialogen of beide plannen.",
  };
  return map[field];
}

function explanationEn(field: StudioV11ConfidenceField): string {
  const map: Record<StudioV11ConfidenceField, string> = {
    goal: "Studio still needs clarity on the goal — it drives structure and pacing.",
    audience: "Studio is missing audience context. That helps us shape CTA and tone of voice.",
    cta: "Without a clear CTA, viewers won't know the next step.",
    duration: "Length affects scene count, pacing, and music structure.",
    narrativeType: "Narrative style shapes how scenes and overlays are built.",
    characters: "Characters determine who speaks and which assets are required.",
    locations: "Locations help build scene proposals and visual continuity.",
    products: "Products define which props and overlays appear on screen.",
    emotion: "Emotion guides music, voice-over, and camera feel.",
    dialogueMode: "This determines whether we plan voice-over, dialogue, or both.",
  };
  return map[field];
}

const FIELD_PRIORITY: StudioV11ConfidenceField[] = [
  "cta",
  "audience",
  "goal",
  "characters",
  "locations",
  "narrativeType",
  "dialogueMode",
  "duration",
  "emotion",
  "products",
];

export function generateDirectorDynamicQuestions(input: {
  confidences: StudioV11FieldConfidence[];
  locale: "nl" | "en";
}): StudioV11DynamicQuestion[] {
  const overall = resolveOverallDirectorConfidence(input.confidences);
  const limit = questionLimitForOverall(overall);

  const candidates = FIELD_PRIORITY.map((field) => input.confidences.find((c) => c.field === field)!)
    .filter((row) => row.level !== "high")
    .map((row) => buildQuestionForConfidence(row, input.locale));

  const required = candidates.filter((q) => q.required);
  const optional = candidates.filter((q) => !q.required);

  const picked = [...required];
  for (const q of optional) {
    if (picked.length >= limit.max) break;
    picked.push(q);
  }

  if (picked.length < limit.min) {
    for (const q of optional) {
      if (picked.some((p) => p.id === q.id)) continue;
      picked.push(q);
      if (picked.length >= limit.min) break;
    }
  }

  return picked.slice(0, limit.max);
}

export function applyDirectorAnswerToSuggestions(
  suggestions: StudioV11DirectorSuggestions,
  field: StudioV11ConfidenceField,
  answerId: string,
  locale: "nl" | "en"
): StudioV11DirectorSuggestions {
  const next = { ...suggestions };
  const label = optionsForField(field, locale).find((o) => o.id === answerId)?.label ?? answerId;

  switch (field) {
    case "cta":
      next.cta = label;
      break;
    case "audience":
      next.audience = label;
      break;
    case "goal":
      next.goal = label;
      break;
    case "narrativeType":
      next.narrativeType = label;
      break;
    case "emotion":
      next.emotion = label;
      break;
    case "duration":
      next.durationLabel = label;
      next.durationSeconds =
        answerId === "15" ? 15 : answerId === "30" ? 30 : answerId === "60" ? 60 : answerId === "90" ? 90 : next.durationSeconds;
      break;
    case "dialogueMode":
      next.dialogueMode =
        answerId === "voice_over_only" ||
        answerId === "dialogue_only" ||
        answerId === "voice_over_and_dialogue" ||
        answerId === "silent"
          ? answerId
          : next.dialogueMode;
      break;
    case "characters":
      if (answerId === "self") next.characters = [locale === "nl" ? "Hoofdpersoon" : "Lead", ...next.characters.slice(1)];
      if (answerId === "mascots") next.characters = next.characters.filter((c) => /mascot/i.test(c));
      break;
    default:
      break;
  }
  return next;
}
