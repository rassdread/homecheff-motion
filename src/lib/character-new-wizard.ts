import { buildDraftFromCharacterConcept } from "@/lib/studio-character-entry-actions";
import type { EnrichedCharacterConcept } from "@/lib/studio-character-wizard";
import { emptyAssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import { runCharacterEngine } from "@/lib/character-engine";
import type { CharacterDynamicAnswers, CharacterDynamicQuestion } from "@/types/character-cluster";
import type { CharacterEngineSaveMetadata, CharacterEngineSummary } from "@/types/character-engine";

export type CharacterNewWizardStep =
  | "describe"
  | "analyze"
  | "questions"
  | "generate"
  | "preview"
  | "save"
  | "complete";

export type CharacterNewWizardState = {
  step: CharacterNewWizardStep;
  idea: string;
  analyzed: boolean;
  readinessScore: number;
  questions: CharacterDynamicQuestion[];
  answers: CharacterDynamicAnswers;
  generatedImageUrl: string;
  generatedStorageKey: string;
  previewApproved: boolean;
  characterName: string;
  projectId: string | null;
  projectTitle: string | null;
  savedCharacterId: string | null;
  generationError: string;
  engineSummary: CharacterEngineSummary | null;
  engineSaveMetadata: CharacterEngineSaveMetadata | null;
};

export function createEmptyCharacterNewWizardState(project?: {
  id?: string | null;
  title?: string | null;
}): CharacterNewWizardState {
  return {
    step: "describe",
    idea: "",
    analyzed: false,
    readinessScore: 0,
    questions: [],
    answers: {},
    generatedImageUrl: "",
    generatedStorageKey: "",
    previewApproved: false,
    characterName: "",
    projectId: project?.id ?? null,
    projectTitle: project?.title ?? null,
    savedCharacterId: null,
    generationError: "",
    engineSummary: null,
    engineSaveMetadata: null,
  };
}

export function analyzeCharacterIdea(
  state: CharacterNewWizardState,
  locale: "nl" | "en" = "en"
): CharacterNewWizardState {
  const engine = runCharacterEngine({
    route: "new",
    idea: state.idea,
    locale,
  });
  return {
    ...state,
    analyzed: true,
    readinessScore: engine.motionReadiness.score,
    questions: engine.questions,
    answers: engine.answers,
    engineSummary: engine.summary,
    engineSaveMetadata: engine.saveMetadata,
    characterName: state.characterName || extractCharacterNameFromIdea(state.idea),
    step: "questions",
  };
}

function extractCharacterNameFromIdea(idea: string): string {
  const match = idea.match(/\b(called|named|genaamd)\s+([A-Z][a-z]+)/i);
  if (match?.[2]) {
    return match[2];
  }
  const words = idea.trim().split(/\s+/).filter(Boolean);
  return words.length > 0 ? `${words[0]} character` : "New character";
}

export function buildConceptFromNewWizardAnswers(
  idea: string,
  answers: CharacterDynamicAnswers
): EnrichedCharacterConcept {
  const role = String(answers.new_role ?? "").trim();
  const characterType = String(answers.new_characterType ?? "human");
  const visualStyle = String(answers.new_visualStyle ?? "cinematic");
  const personality = String(answers.new_personality ?? "friendly").trim();
  const appearance = String(answers.new_appearance ?? "").trim();

  const type =
    characterType === "mascot" ? "mascot" : characterType === "cartoon" ? "cartoon" : "human";

  return {
    type: type as EnrichedCharacterConcept["type"],
    presentation: "neutral",
    ageEnergy: "adult",
    style: visualStyle as EnrichedCharacterConcept["style"],
    coreTrait: (personality.split(" ")[0] ?? "friendly") as EnrichedCharacterConcept["coreTrait"],
    name: role || extractCharacterNameFromIdea(idea),
    clothing: appearance || "Context-appropriate wardrobe",
    personality: personality || idea.slice(0, 120),
    emotions: "Warm and expressive",
    voiceStyle: "Natural conversational",
    behavior: "Confident and clear",
    estimatedCredits: visualStyle === "realistic" ? 4 : 2,
  };
}

export function characterNewWizardToAssetDraft(
  state: CharacterNewWizardState
): AssetWizardDraft {
  const concept = buildConceptFromNewWizardAnswers(state.idea, state.answers);
  const draft = buildDraftFromCharacterConcept(concept);
  return {
    ...draft,
    name: state.characterName || concept.name,
    summaryPrompt: [state.idea.trim(), draft.summaryPrompt].filter(Boolean).join(" "),
    referenceImageUrl: state.generatedImageUrl || draft.referenceImageUrl,
    referenceStorageKey: state.generatedStorageKey || draft.referenceStorageKey,
    fields: {
      ...draft.fields,
      sourceRoute: "new",
    },
  };
}

export function nextCharacterNewWizardStep(step: CharacterNewWizardStep): CharacterNewWizardStep | null {
  const order: CharacterNewWizardStep[] = [
    "describe",
    "analyze",
    "questions",
    "generate",
    "preview",
    "save",
    "complete",
  ];
  const index = order.indexOf(step);
  return index >= 0 && index < order.length - 1 ? order[index + 1]! : null;
}
