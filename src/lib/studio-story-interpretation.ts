/**
 * Story Builder V2 — AI Director interpretation (locale-aware, non-paraphrase).
 */

import type { StudioProductionBriefSelections } from "@/types/studio-production-brief-v3";

export type StoryInterpretationLocale = "nl" | "en";

export type StoryClarificationQuestion = {
  id: string;
  prompt: string;
  options: string[];
};

export type StoryDirectionOption = {
  id: string;
  title: string;
  summary: string;
  emotionalBeat: string;
};

export type StorySceneProposal = {
  id: string;
  title: string;
  purpose: string;
  visualIdea: string;
  emotion: string;
  characters: string[];
};

export type StudioStoryInterpretation = {
  locale: StoryInterpretationLocale;
  coreConcept: string;
  narrativeType: string;
  emotionalDirection: string;
  audience: string;
  interpretation: string;
  confidence: number;
  directions: StoryDirectionOption[];
  questions: StoryClarificationQuestion[];
  scenes: StorySceneProposal[];
  selectedDirectionId?: string;
  builtAt: string;
};

function detectLocale(locale?: string): StoryInterpretationLocale {
  return locale?.toLowerCase().startsWith("nl") ? "nl" : "en";
}

function ideaSignals(idea: string): {
  journey: boolean;
  mascots: boolean;
  community: boolean;
  rotterdam: boolean;
  locations: boolean;
} {
  const lower = idea.toLowerCase();
  return {
    journey: /loop|walk|reis|journey|langs|door|route|pad/.test(lower),
    mascots: /mascot|mascotte|character|figuur/.test(lower) || /\b\d+\s*(mascot|mascotte)/.test(lower),
    community: /community|gemeenschap|samen|team|verbinding|connect/.test(lower),
    rotterdam: /rotterdam/.test(lower),
    locations: /locatie|location|plek|stad|city|locaties/.test(lower),
  };
}

function pickAudience(
  selections: StudioProductionBriefSelections,
  locale: StoryInterpretationLocale
): string {
  const aud = selections.audience[0];
  const mapEn: Record<string, string> = {
    consumers: "General public",
    business: "Investors & partners",
    youth: "New users & creators",
    seniors: "Community builders",
    general: "Broad audience",
  };
  const mapNl: Record<string, string> = {
    consumers: "Algemeen publiek",
    business: "Investeerders & partners",
    youth: "Nieuwe gebruikers & makers",
    seniors: "Community builders",
    general: "Breed publiek",
  };
  const map = locale === "nl" ? mapNl : mapEn;
  return map[aud ?? "general"] ?? map.general;
}

function pickNarrativeType(
  signals: ReturnType<typeof ideaSignals>,
  selections: StudioProductionBriefSelections,
  locale: StoryInterpretationLocale
): string {
  if (signals.journey && signals.mascots) {
    return locale === "nl" ? "Teamvorming / heldenreis" : "Team formation / hero journey";
  }
  if (selections.goals.includes("story")) {
    return locale === "nl" ? "Cinematische short" : "Cinematic short";
  }
  if (selections.goals.includes("sell") || selections.goals.includes("promote")) {
    return locale === "nl" ? "Promotie / merkverhaal" : "Promotional brand story";
  }
  return locale === "nl" ? "Ontdekkingsverhaal" : "Discovery narrative";
}

function buildInterpretationText(
  idea: string,
  signals: ReturnType<typeof ideaSignals>,
  locale: StoryInterpretationLocale
): string {
  if (locale === "nl") {
    if (signals.journey && signals.mascots) {
      return "Een verhaal over het vinden van gelijkgestemden onderweg — elke ontmoeting voegt een stukje identiteit toe tot een levende gemeenschap ontstaat.";
    }
    if (signals.community) {
      return "Een verhaal waarin losse elementen samenkomen tot een gedeeld gevoel van thuishoren en samenwerking.";
    }
    return "Een groeiverhaal: van individueel moment naar gedeeld momentum en herkenning.";
  }
  if (signals.journey && signals.mascots) {
    return "A story about finding your people along the way — each encounter adds identity until a living community emerges.";
  }
  if (signals.community) {
    return "A narrative where scattered pieces converge into belonging and shared momentum.";
  }
  return "An interpretation as a growth story — from individual spark to collective movement.";
}

function buildDirections(
  signals: ReturnType<typeof ideaSignals>,
  locale: StoryInterpretationLocale
): StoryDirectionOption[] {
  if (locale === "nl") {
    return [
      {
        id: "journey",
        title: "De reis",
        summary: signals.rotterdam
          ? "Iemand loopt door Rotterdam. Mascottes verschijnen één voor één. Slot: iedereen beweegt samen."
          : "Een wandeling langs plekken. Mascottes verschijnen geleidelijk. Slot: gezamenlijke beweging.",
        emotionalBeat: "Hoopvol, nieuwsgierig",
      },
      {
        id: "missing_pieces",
        title: "De ontbrekende stukken",
        summary: "Elke mascotte staat voor iets dat nog mist. Het slot rondt het team af.",
        emotionalBeat: "Warm, verbindend",
      },
      {
        id: "movement",
        title: "De beweging",
        summary: "De stad voelt leeg. Mascottes transformeren de omgeving in een levende community.",
        emotionalBeat: "Inspirerend, epic",
      },
    ];
  }
  return [
    {
      id: "journey",
      title: "The Journey",
      summary: signals.rotterdam
        ? "A walk through Rotterdam. Mascots appear one by one. Final beat: everyone moves together."
        : "A walk across locations. Mascots appear gradually. Final beat: collective movement.",
      emotionalBeat: "Hopeful, curious",
    },
    {
      id: "missing_pieces",
      title: "The Missing Pieces",
      summary: "Each mascot represents something still missing. The finale completes the team.",
      emotionalBeat: "Warm, connecting",
    },
    {
      id: "movement",
      title: "The Movement",
      summary: "The city feels empty. Mascots slowly transform it into a living community.",
      emotionalBeat: "Inspiring, epic",
    },
  ];
}

function buildQuestions(
  selections: StudioProductionBriefSelections,
  locale: StoryInterpretationLocale,
  confidence: number
): StoryClarificationQuestion[] {
  if (confidence >= 0.75) {
    return [];
  }
  if (locale === "nl") {
    const questions: StoryClarificationQuestion[] = [];
    if (selections.tones.length === 0) {
      questions.push({
        id: "tone",
        prompt: "Welke toon heeft de voorkeur?",
        options: ["Inspirerend", "Emotioneel", "Humoristisch", "Episch"],
      });
    }
    if (selections.goals.length === 0) {
      questions.push({
        id: "goal",
        prompt: "Wat is het hoofddoel?",
        options: [
          "HomeCheff promoten",
          "Concept uitleggen",
          "Verhaal vertellen",
          "Gebruikers aantrekken",
          "Investeerders overtuigen",
        ],
      });
    }
    if (selections.length.length === 0) {
      questions.push({
        id: "length",
        prompt: "Videolengte?",
        options: ["15 sec", "30 sec", "60 sec", "Aangepast"],
      });
    }
    return questions.slice(0, 3);
  }
  const questions: StoryClarificationQuestion[] = [];
  if (selections.tones.length === 0) {
    questions.push({
      id: "tone",
      prompt: "Which tone do you prefer?",
      options: ["Inspirational", "Emotional", "Humorous", "Epic"],
    });
  }
  if (selections.goals.length === 0) {
    questions.push({
      id: "goal",
      prompt: "Main goal?",
      options: [
        "Promote HomeCheff",
        "Explain concept",
        "Tell a story",
        "Attract users",
        "Convince investors",
      ],
    });
  }
  if (selections.length.length === 0) {
    questions.push({
      id: "length",
      prompt: "Video length?",
      options: ["15 sec", "30 sec", "60 sec", "Custom"],
    });
  }
  return questions.slice(0, 3);
}

function buildSceneProposals(
  direction: StoryDirectionOption,
  locale: StoryInterpretationLocale
): StorySceneProposal[] {
  if (locale === "nl") {
    if (direction.id === "missing_pieces") {
      return [
        {
          id: "scene_1",
          title: "Iets ontbreekt",
          purpose: "Spanning opbouwen",
          visualIdea: "Lege straat of studio — één mascotte alleen",
          emotion: "Nieuwsgierigheid",
          characters: ["Hoofdpersoon"],
        },
        {
          id: "scene_2",
          title: "Stuk voor stuk",
          purpose: "Team vormen",
          visualIdea: "Elke ontmoeting voegt een mascotte toe",
          emotion: "Verwachting",
          characters: ["Hoofdpersoon", "Mascottes"],
        },
        {
          id: "scene_3",
          title: "Compleet team",
          purpose: "Pay-off",
          visualIdea: "Volledige groep in beweging",
          emotion: "Vreugde",
          characters: ["Volledig team"],
        },
      ];
    }
    return [
      {
        id: "scene_1",
        title: "De reis begint",
        purpose: "Hook",
        visualIdea: direction.summary.includes("Rotterdam")
          ? "Wandeling door Rotterdam"
          : "Vertrek op route langs locaties",
        emotion: "Nieuwsgierigheid",
        characters: ["Hoofdpersoon"],
      },
      {
        id: "scene_2",
        title: "Ontmoetingen",
        purpose: "Middendeel",
        visualIdea: "Drie mascottes verschijnen op verschillende plekken",
        emotion: "Verwondering",
        characters: ["Hoofdpersoon", "Mascottes"],
      },
      {
        id: "scene_3",
        title: "Samen verder",
        purpose: "Slot",
        visualIdea: "Groep in beweging — community gevoel",
        emotion: "Inspiratie",
        characters: ["Volledig team"],
      },
    ];
  }
  return [
    {
      id: "scene_1",
      title: "The journey begins",
      purpose: "Hook",
      visualIdea: "Walking through the city",
      emotion: "Curiosity",
      characters: ["Main character"],
    },
    {
      id: "scene_2",
      title: "Encounters",
      purpose: "Rising action",
      visualIdea: "Three mascots appear at distinct locations",
      emotion: "Wonder",
      characters: ["Main character", "Mascots"],
    },
    {
      id: "scene_3",
      title: "Moving together",
      purpose: "Payoff",
      visualIdea: "Group in motion — community feeling",
      emotion: "Inspiration",
      characters: ["Full team"],
    },
  ];
}

export function interpretStoryIdea(input: {
  idea: string;
  selections: StudioProductionBriefSelections;
  locale?: string;
  languageCode?: string;
}): StudioStoryInterpretation {
  const locale = detectLocale(input.locale ?? input.languageCode);
  const idea = input.idea.trim() || (locale === "nl" ? "Een dag in de keuken" : "A day in the kitchen");
  const signals = ideaSignals(idea);
  const tone = input.selections.tones[0] ?? "energetic";
  const confidence =
    0.45 +
    (signals.journey ? 0.15 : 0) +
    (signals.mascots ? 0.15 : 0) +
    (input.selections.goals.length > 0 ? 0.1 : 0) +
    (input.selections.tones.length > 0 ? 0.1 : 0);

  const directions = buildDirections(signals, locale);
  const selected = directions[0]!;

  return {
    locale,
    coreConcept:
      locale === "nl"
        ? signals.journey && signals.mascots
          ? "Community Journey"
          : "Verbinding bouwen"
        : signals.journey && signals.mascots
          ? "Community Journey"
          : "Building connection",
    narrativeType: pickNarrativeType(signals, input.selections, locale),
    emotionalDirection:
      locale === "nl"
        ? tone === "emotional"
          ? "Emotioneel"
          : tone === "inspiring"
            ? "Inspirerend"
            : tone === "funny"
              ? "Luchtig"
              : "Energiek"
        : tone,
    audience: pickAudience(input.selections, locale),
    interpretation: buildInterpretationText(idea, signals, locale),
    confidence: Math.min(0.95, confidence),
    directions,
    questions: buildQuestions(input.selections, locale, confidence),
    scenes: buildSceneProposals(selected, locale),
    selectedDirectionId: selected.id,
    builtAt: new Date().toISOString(),
  };
}

export function applyStoryDirection(
  interpretation: StudioStoryInterpretation,
  directionId: string
): StudioStoryInterpretation {
  const direction = interpretation.directions.find((d) => d.id === directionId);
  if (!direction) {
    return interpretation;
  }
  return {
    ...interpretation,
    selectedDirectionId: directionId,
    scenes: buildSceneProposals(direction, interpretation.locale),
    builtAt: new Date().toISOString(),
  };
}

export function answerStoryQuestions(
  interpretation: StudioStoryInterpretation,
  answers: Record<string, string>
): StudioStoryInterpretation {
  const answered = interpretation.questions.filter((q) => !answers[q.id]);
  return {
    ...interpretation,
    questions: answered,
    confidence: Math.min(0.98, interpretation.confidence + 0.08),
    builtAt: new Date().toISOString(),
  };
}
