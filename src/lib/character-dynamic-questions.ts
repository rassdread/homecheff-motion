import {
  applyAiSuggestionsToAnswers,
  resolveMotionWizardQuestions,
} from "@/lib/motion-ready-character-wizard";
import { questionLimitForOverall, resolveOverallDirectorConfidence } from "@/lib/studio-v11-director-confidence";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import { detectBodyVisibilityFromVision } from "@/lib/studio-asset-animation-readiness";
import { detectMotionCharacterParts } from "@/lib/motion-ready-character-wizard";
import type {
  CharacterClusterRoute,
  CharacterDynamicAnswers,
  CharacterDynamicQuestion,
  CharacterReferenceMode,
} from "@/types/character-cluster";
export type { CharacterDynamicAnswers };
import type { StudioCharacterExtractionCustomization } from "@/lib/studio-character-entry-actions";

export type CharacterNewField =
  | "role"
  | "visualStyle"
  | "personality"
  | "appearance"
  | "characterType";

type CharacterFieldConfidence = {
  field: CharacterNewField;
  score: number;
  suggestion: string;
};

function scoreToLevel(score: number): "high" | "medium" | "low" {
  if (score >= 0.75) return "high";
  if (score >= 0.45) return "medium";
  return "low";
}

function ideaMentions(idea: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(idea.toLowerCase()));
}

export function scoreCharacterIdeaConfidences(idea: string): CharacterFieldConfidence[] {
  const trimmed = idea.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

  return [
    {
      field: "role",
      score:
        ideaMentions(trimmed, [/chef|kok|doctor|teacher|leraar|mascot|mascotte|hero|held|narrator|presentator|brand|merk/]) ||
        wordCount >= 8
          ? 0.82
          : wordCount >= 4
            ? 0.5
            : 0.25,
      suggestion: ideaMentions(trimmed, [/mascot|mascotte/i]) ? "Brand mascot" : "Lead character",
    },
    {
      field: "characterType",
      score: ideaMentions(trimmed, [/mascot|mascotte|cartoon|anime|pixar|realistic|realistisch|human|persoon|illustration/i])
        ? 0.85
        : 0.35,
      suggestion: ideaMentions(trimmed, [/mascot|mascotte/i]) ? "mascot" : "human",
    },
    {
      field: "visualStyle",
      score: ideaMentions(trimmed, [/cinematic|pixar|cartoon|realistic|realistisch|flat|vector|photo|illustration|3d/i])
        ? 0.8
        : wordCount >= 6
          ? 0.45
          : 0.3,
      suggestion: "cinematic",
    },
    {
      field: "personality",
      score: ideaMentions(trimmed, [/friendly|vriendelijk|funny|grappig|serious|serieus|confident|energetic|warm|playful/i])
        ? 0.78
        : 0.32,
      suggestion: "friendly and approachable",
    },
    {
      field: "appearance",
      score: ideaMentions(trimmed, [/shirt|jacket|apron|dress|uniform|hair|beard|glasses|green|blue|red|outfit|kleding/i])
        ? 0.8
        : wordCount >= 10
          ? 0.55
          : 0.28,
      suggestion: "Context-appropriate outfit",
    },
  ];
}

function buildNewCharacterQuestion(
  row: CharacterFieldConfidence,
  locale: "nl" | "en"
): CharacterDynamicQuestion | null {
  const level = scoreToLevel(row.score);
  if (level === "high") {
    return null;
  }

  const labelKeys: Record<CharacterNewField, string> = {
    role: "characterCluster.question.role",
    visualStyle: "characterCluster.question.visualStyle",
    personality: "characterCluster.question.personality",
    appearance: "characterCluster.question.appearance",
    characterType: "characterCluster.question.characterType",
  };

  const optionMap: Partial<Record<CharacterNewField, Array<{ id: string; labelKey: string }>>> = {
    characterType: [
      { id: "human", labelKey: "characterCluster.option.human" },
      { id: "mascot", labelKey: "characterCluster.option.mascot" },
      { id: "cartoon", labelKey: "characterCluster.option.cartoon" },
    ],
    visualStyle: [
      { id: "realistic", labelKey: "characterCluster.option.realistic" },
      { id: "cinematic", labelKey: "characterCluster.option.cinematic" },
      { id: "pixar-like", labelKey: "characterCluster.option.pixar" },
      { id: "cartoon", labelKey: "characterCluster.option.cartoon" },
    ],
  };

  return {
    id: `new_${row.field}`,
    labelKey: labelKeys[row.field],
    type: optionMap[row.field] ? "choice" : "text",
    options: optionMap[row.field],
    aiSuggestionKey: `characterCluster.aiSuggestion.${row.field}`,
    aiSuggestionValue: row.suggestion,
    required: level === "low",
  };
}

function resolveNewCharacterQuestions(idea: string, locale: "nl" | "en"): CharacterDynamicQuestion[] {
  const confidences = scoreCharacterIdeaConfidences(idea);
  const fieldConfidences = confidences.map((c) => ({
    field: c.field as never,
    level: scoreToLevel(c.score),
    suggestion: c.suggestion,
    reasonKey: `characterCluster.confidence.${c.field}`,
  }));
  const overall = resolveOverallDirectorConfidence(fieldConfidences);
  const limit = questionLimitForOverall(overall);

  const candidates = confidences
    .map((row) => buildNewCharacterQuestion(row, locale))
    .filter((q): q is CharacterDynamicQuestion => q !== null);

  const required = candidates.filter((q) => q.required);
  const optional = candidates.filter((q) => !q.required);
  const picked = [...required];
  for (const q of optional) {
    if (picked.length >= limit.max) break;
    picked.push(q);
  }
  return picked.slice(0, limit.max);
}

function resolveFromReferenceQuestions(input: {
  vision: AssetVisionAnalysis;
  referenceMode: CharacterReferenceMode;
  locale: "nl" | "en";
}): CharacterDynamicQuestion[] {
  const parts = detectMotionCharacterParts(input.vision);
  const bodyVisibility = detectBodyVisibilityFromVision(input.vision);
  const motionQuestions = resolveMotionWizardQuestions({
    vision: input.vision,
    bodyVisibility,
    parts,
  });

  const questions: CharacterDynamicQuestion[] = motionQuestions.map((q) => ({
    id: `ref_${q.id}`,
    labelKey: q.labelKey,
    type: q.type,
    options: q.options,
    aiSuggestionKey: q.aiSuggestionKey,
    aiSuggestionValue: q.aiSuggestionValue,
    required: false,
  }));

  if (input.referenceMode === "custom_variant" || input.referenceMode === "new_character") {
    const customizeFields: Array<keyof StudioCharacterExtractionCustomization> = [
      "clothing",
      "style",
      "colors",
    ];
    for (const field of customizeFields) {
      questions.push({
        id: `ref_custom_${field}`,
        labelKey: `characterCluster.question.customize.${field}`,
        type: "text",
        aiSuggestionKey: `characterCluster.aiSuggestion.customize.${field}`,
        aiSuggestionValue: input.vision.keyFeatures?.[0] ?? "",
        required: input.referenceMode === "new_character",
      });
    }
  }

  return questions;
}

function motionQuestionsToUnified(
  vision: AssetVisionAnalysis,
  locale: "nl" | "en"
): CharacterDynamicQuestion[] {
  const parts = detectMotionCharacterParts(vision);
  const bodyVisibility = detectBodyVisibilityFromVision(vision);
  const motionQuestions = resolveMotionWizardQuestions({ vision, bodyVisibility, parts });
  return motionQuestions.map((q) => ({
    id: q.id,
    labelKey: q.labelKey,
    type: q.type,
    options: q.options,
    aiSuggestionKey: q.aiSuggestionKey,
    aiSuggestionValue: q.aiSuggestionValue,
    required: false,
  }));
}

export function resolveCharacterDynamicQuestions(input: {
  route: CharacterClusterRoute;
  idea?: string;
  vision?: AssetVisionAnalysis | null;
  referenceMode?: CharacterReferenceMode;
  locale?: "nl" | "en";
}): CharacterDynamicQuestion[] {
  const locale = input.locale ?? "en";

  switch (input.route) {
    case "new":
      return resolveNewCharacterQuestions(input.idea?.trim() ?? "", locale);
    case "from-reference":
      if (!input.vision) {
        return [];
      }
      return resolveFromReferenceQuestions({
        vision: input.vision,
        referenceMode: input.referenceMode ?? "exact",
        locale,
      });
    case "motion-ready":
      if (!input.vision) {
        return [];
      }
      return motionQuestionsToUnified(input.vision, locale);
    default:
      return [];
  }
}

export function applyCharacterDynamicAiSuggestions(
  questions: CharacterDynamicQuestion[]
): CharacterDynamicAnswers {
  const answers: CharacterDynamicAnswers = {};
  for (const question of questions) {
    if (!question.aiSuggestionValue) {
      continue;
    }
    if (question.type === "boolean") {
      answers[question.id] = question.aiSuggestionValue === "true";
    } else {
      answers[question.id] = question.aiSuggestionValue;
    }
  }
  return answers;
}

export function applyMotionReadyAnswersFromDynamic(
  questions: CharacterDynamicQuestion[],
  answers: CharacterDynamicAnswers
) {
  const motionQuestions = questions.filter((q) => !q.id.startsWith("ref_"));
  return applyAiSuggestionsToAnswers(
    motionQuestions.map((q) => ({
      id: q.id.replace(/^ref_/, "") as never,
      labelKey: q.labelKey,
      type: q.type,
      options: q.options,
      aiSuggestionKey: q.aiSuggestionKey,
      aiSuggestionValue: q.aiSuggestionValue,
    }))
  );
}

export function characterDynamicQuestionAnswered(
  question: CharacterDynamicQuestion,
  answers: CharacterDynamicAnswers
): boolean {
  const value = answers[question.id];
  if (question.type === "boolean") {
    return value !== undefined;
  }
  return typeof value === "string" && value.trim().length > 0;
}

export function allCharacterDynamicQuestionsAnswered(
  questions: CharacterDynamicQuestion[],
  answers: CharacterDynamicAnswers
): boolean {
  return questions.every((q) => !q.required || characterDynamicQuestionAnswered(q, answers));
}
