import { buildDirectorFieldSuggestions } from "@/lib/studio-v11-director-suggestions";
import {
  questionLimitForOverall,
  resolveOverallDirectorConfidence,
  scoreDirectorFieldConfidences,
} from "@/lib/studio-v11-director-confidence";
import {
  applyDirectorAnswerToSuggestions,
  generateDirectorDynamicQuestions,
} from "@/lib/studio-v11-director-questions";
import { applyNarrativeMode } from "@/lib/studio-v10-story-planning";
import type { StudioProductionBrief } from "@/types/studio-production-brief";
import type { StudioProductionBriefSelections } from "@/types/studio-production-brief-v3";
import type { StudioStoryInterpretation } from "@/lib/studio-story-interpretation";
import type { StudioV10StoryPlanningState } from "@/types/studio-v10-story-planning";
import type {
  StudioV11ConfidenceField,
  StudioV11DirectorWizardState,
} from "@/types/studio-v11-director-wizard";

function localeFrom(input?: string): "nl" | "en" {
  return input?.toLowerCase().startsWith("nl") ? "nl" : "en";
}

export function buildStudioV11DirectorWizard(input: {
  idea: string;
  selections: StudioProductionBriefSelections;
  brief?: StudioProductionBrief;
  locale?: string;
}): StudioV11DirectorWizardState {
  const locale = localeFrom(input.locale);
  const suggestions = buildDirectorFieldSuggestions(input);
  const fieldConfidences = scoreDirectorFieldConfidences({
    idea: input.idea,
    selections: input.selections,
    suggestions,
    brief: input.brief,
  });
  const overallConfidence = resolveOverallDirectorConfidence(fieldConfidences);
  const questions = generateDirectorDynamicQuestions({ confidences: fieldConfidences, locale });
  const now = new Date().toISOString();

  return {
    version: 1,
    locale,
    suggestions,
    fieldConfidences,
    questions,
    answers: {},
    skippedFields: [],
    overallConfidence,
    phase: questions.length === 0 ? "complete" : "interpretation",
    currentQuestionIndex: 0,
    builtAt: now,
    updatedAt: now,
  };
}

export function answerDirectorQuestion(
  state: StudioV11DirectorWizardState,
  questionId: string,
  answerId: string
): StudioV11DirectorWizardState {
  const question = state.questions.find((q) => q.id === questionId);
  if (!question) return state;

  const suggestions = applyDirectorAnswerToSuggestions(
    state.suggestions,
    question.field,
    answerId,
    state.locale
  );
  const nextIndex = state.currentQuestionIndex + 1;
  const complete = nextIndex >= state.questions.length;

  return {
    ...state,
    suggestions,
    answers: { ...state.answers, [questionId]: answerId },
    currentQuestionIndex: nextIndex,
    phase: complete ? "complete" : "questions",
    updatedAt: new Date().toISOString(),
  };
}

export function skipDirectorQuestion(
  state: StudioV11DirectorWizardState,
  questionId: string
): StudioV11DirectorWizardState {
  const question = state.questions.find((q) => q.id === questionId);
  if (!question) return state;

  const nextIndex = state.currentQuestionIndex + 1;
  const complete = nextIndex >= state.questions.length;

  return {
    ...state,
    skippedFields: [...state.skippedFields, question.field],
    currentQuestionIndex: nextIndex,
    phase: complete ? "complete" : "questions",
    updatedAt: new Date().toISOString(),
  };
}

export function startDirectorQuestions(state: StudioV11DirectorWizardState): StudioV11DirectorWizardState {
  if (state.questions.length === 0) {
    return { ...state, phase: "complete", updatedAt: new Date().toISOString() };
  }
  return { ...state, phase: "questions", currentQuestionIndex: 0, updatedAt: new Date().toISOString() };
}

export function mergeDirectorWizardIntoV10Planning(
  planning: StudioV10StoryPlanningState,
  wizard: StudioV11DirectorWizardState
): StudioV10StoryPlanningState {
  const { suggestions } = wizard;
  const withNarrative = applyNarrativeMode(planning, suggestions.dialogueMode);
  return {
    ...withNarrative,
    interpretation: {
      ...withNarrative.interpretation,
      audience: suggestions.audience,
      goal: suggestions.goal,
      emotion: suggestions.emotion,
      narrativeType: suggestions.narrativeType,
      cta: suggestions.cta,
      mainCharacters: suggestions.characters,
      locations: suggestions.locations,
      products: suggestions.products,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function directorWizardQuestionBudget(state: StudioV11DirectorWizardState): {
  min: number;
  max: number;
  total: number;
} {
  const budget = questionLimitForOverall(state.overallConfidence);
  return { ...budget, total: state.questions.length };
}

export function currentDirectorQuestion(
  state: StudioV11DirectorWizardState
): StudioV11DirectorWizardState["questions"][number] | null {
  if (state.phase !== "questions") return null;
  return state.questions[state.currentQuestionIndex] ?? null;
}

export function patchInterpretationFromDirector(
  interpretation: StudioStoryInterpretation,
  wizard: StudioV11DirectorWizardState
): StudioStoryInterpretation {
  const { suggestions } = wizard;
  return {
    ...interpretation,
    audience: suggestions.audience,
    narrativeType: suggestions.narrativeType,
    emotionalDirection: suggestions.emotion,
    scenes: interpretation.scenes.map((scene, index) => ({
      ...scene,
      characters: suggestions.characters.slice(0, 3),
      title: scene.title || suggestions.locations[index] || scene.title,
    })),
    builtAt: new Date().toISOString(),
  };
}

export function highConfidenceFields(state: StudioV11DirectorWizardState): StudioV11ConfidenceField[] {
  return state.fieldConfidences.filter((f) => f.level === "high").map((f) => f.field);
}
