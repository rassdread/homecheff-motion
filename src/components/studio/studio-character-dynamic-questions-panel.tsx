"use client";

import { useActiveTranslator } from "@/i18n/client";
import {
  allCharacterDynamicQuestionsAnswered,
  characterDynamicQuestionAnswered,
  type CharacterDynamicAnswers,
} from "@/lib/character-dynamic-questions";
import type { CharacterDynamicQuestion } from "@/types/character-cluster";

type Props = {
  questions: CharacterDynamicQuestion[];
  answers: CharacterDynamicAnswers;
  onAnswersChange: (answers: CharacterDynamicAnswers) => void;
};

export function StudioCharacterDynamicQuestionsPanel({ questions, answers, onAnswersChange }: Props) {
  const t = useActiveTranslator();

  if (questions.length === 0) {
    return null;
  }

  const applyAiSuggestion = (question: CharacterDynamicQuestion) => {
    if (!question.aiSuggestionValue) {
      return;
    }
    onAnswersChange({
      ...answers,
      [question.id]:
        question.type === "boolean" ? question.aiSuggestionValue === "true" : question.aiSuggestionValue,
    });
  };

  return (
    <div className="space-y-4" data-testid="character-dynamic-questions">
      {questions.map((question) => (
        <div key={question.id} className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-sm font-medium text-zinc-900">{t(question.labelKey as never)}</p>
          {question.aiSuggestionKey ?
            <button
              type="button"
              className="mt-1 text-xs font-semibold text-[#006D52] hover:underline"
              onClick={() => applyAiSuggestion(question)}
            >
              {t("characterCluster.aiSuggestion" as never)}
            </button>
          : null}

          {question.type === "choice" && question.options ?
            <div className="mt-2 space-y-1">
              {question.options.map((option) => (
                <label key={option.id} className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2">
                  <input
                    type="radio"
                    name={question.id}
                    checked={answers[question.id] === option.id}
                    onChange={() => onAnswersChange({ ...answers, [question.id]: option.id })}
                  />
                  <span className="text-sm">{t(option.labelKey as never)}</span>
                </label>
              ))}
            </div>
          : null}

          {question.type === "text" ?
            <input
              className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={String(answers[question.id] ?? "")}
              onChange={(e) => onAnswersChange({ ...answers, [question.id]: e.target.value })}
            />
          : null}

          {question.type === "boolean" ?
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  answers[question.id] === true ? "bg-[#006D52] text-white" : "border"
                }`}
                onClick={() => onAnswersChange({ ...answers, [question.id]: true })}
              >
                {t("characterCluster.yes" as never)}
              </button>
              <button
                type="button"
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  answers[question.id] === false ? "bg-zinc-800 text-white" : "border"
                }`}
                onClick={() => onAnswersChange({ ...answers, [question.id]: false })}
              >
                {t("characterCluster.no" as never)}
              </button>
            </div>
          : null}

          {question.required && !characterDynamicQuestionAnswered(question, answers) ?
            <p className="mt-1 text-xs text-amber-700">{t("characterCluster.required" as never)}</p>
          : null}
        </div>
      ))}
      {!allCharacterDynamicQuestionsAnswered(questions, answers) ?
        <p className="text-xs text-zinc-500">{t("characterCluster.answerAll" as never)}</p>
      : null}
    </div>
  );
}
