"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  answerDirectorQuestion,
  currentDirectorQuestion,
  directorWizardQuestionBudget,
  skipDirectorQuestion,
  startDirectorQuestions,
} from "@/lib/studio-v11-director-wizard";
import type { StudioV11DirectorWizardState } from "@/types/studio-v11-director-wizard";

type Props = {
  wizard: StudioV11DirectorWizardState;
  onWizardChange: (next: StudioV11DirectorWizardState) => void;
  onComplete: (wizard: StudioV11DirectorWizardState) => void;
};

function formatSuggestion(value: string | string[]): string {
  return Array.isArray(value) ? value.join(" · ") : value;
}

export function StudioV11DirectorWizardPanel({ wizard, onWizardChange, onComplete }: Props) {
  const t = useActiveTranslator();
  const budget = useMemo(() => directorWizardQuestionBudget(wizard), [wizard]);
  const question = useMemo(() => currentDirectorQuestion(wizard), [wizard]);

  const confidenceClass = (level: string) => {
    if (level === "high") return "bg-emerald-50 text-emerald-800";
    if (level === "medium") return "bg-amber-50 text-amber-900";
    return "bg-red-50 text-red-800";
  };

  if (wizard.phase === "interpretation") {
    return (
      <div className="space-y-5" data-testid="studio-v11-director-interpretation">
        <section className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4">
          <h3 className="text-sm font-semibold text-violet-950">{t("studio.v11.interpretation.title" as never)}</h3>
          <p className="mt-1 text-xs text-violet-800">{t("studio.v11.interpretation.lead" as never)}</p>
          <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-violet-900">{t("studio.v10.interpretation.mainCharacters" as never)}</dt>
              <dd className="text-violet-950">{wizard.suggestions.characters.join(", ")}</dd>
            </div>
            <div>
              <dt className="font-semibold text-violet-900">{t("studio.v10.interpretation.locations" as never)}</dt>
              <dd className="text-violet-950">{wizard.suggestions.locations.join(", ")}</dd>
            </div>
            <div>
              <dt className="font-semibold text-violet-900">{t("studio.v10.interpretation.goal" as never)}</dt>
              <dd className="text-violet-950">{wizard.suggestions.goal}</dd>
            </div>
            <div>
              <dt className="font-semibold text-violet-900">{t("studio.v10.interpretation.audience" as never)}</dt>
              <dd className="text-violet-950">{wizard.suggestions.audience}</dd>
            </div>
            <div>
              <dt className="font-semibold text-violet-900">{t("studio.v10.interpretation.cta" as never)}</dt>
              <dd className="text-violet-950">{wizard.suggestions.cta}</dd>
            </div>
            <div>
              <dt className="font-semibold text-violet-900">{t("studio.v10.interpretation.narrativeType" as never)}</dt>
              <dd className="text-violet-950">{wizard.suggestions.narrativeType}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-zinc-900">{t("studio.v11.confidence.title" as never)}</h3>
          <ul className="mt-2 flex flex-wrap gap-1">
            {wizard.fieldConfidences.map((row) => (
              <li
                key={row.field}
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${confidenceClass(row.level)}`}
              >
                {t(`studio.v11.confidence.field.${row.field}` as never)}: {t(`studio.v11.confidence.level.${row.level}` as never)}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-zinc-600">
            {t("studio.v11.confidence.budget" as never, {
              count: String(budget.total),
              max: String(budget.max),
            } as never)}
          </p>
        </section>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (wizard.questions.length === 0) {
                onComplete(wizard);
                return;
              }
              onWizardChange(startDirectorQuestions(wizard));
            }}
            className="rounded-full bg-gradient-to-r from-[#006D52] to-[#0067B1] px-5 py-2.5 text-sm font-semibold text-white"
            data-testid="studio-v11-start-questions"
          >
            {wizard.questions.length === 0
              ? t("studio.v11.continueToPlanning" as never)
              : t("studio.v11.startQuestions" as never)}
          </button>
          {wizard.questions.length > 0 ?
            <button
              type="button"
              onClick={() => onComplete({ ...wizard, phase: "complete", updatedAt: new Date().toISOString() })}
              className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700"
            >
              {t("studio.v11.useAiProposal" as never)}
            </button>
          : null}
        </div>
      </div>
    );
  }

  if (wizard.phase === "questions" && question) {
    return (
      <div className="space-y-4" data-testid="studio-v11-director-questions">
        <p className="text-xs font-medium text-zinc-500">
          {t("studio.v11.questionProgress" as never, {
            current: String(wizard.currentQuestionIndex + 1),
            total: String(wizard.questions.length),
          } as never)}
        </p>

        <section className="rounded-2xl border border-sky-200 bg-sky-50/40 p-4">
          <h3 className="text-sm font-semibold text-zinc-900">{question.prompt}</h3>
          {question.suggestion ?
            <p className="mt-1 text-xs text-sky-900">
              {t("studio.v11.aiSuggestion" as never)}: {question.suggestion}
            </p>
          : null}
        </section>

        <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
          <p className="text-xs font-semibold text-amber-900">{t("studio.v11.whyAsk.title" as never)}</p>
          <p className="mt-1 text-xs text-amber-800">{question.explanation}</p>
        </section>

        <ul className="space-y-2">
          {question.options.map((option) => (
            <li key={option.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white p-3 hover:border-[#006D52]">
                <input
                  type="radio"
                  name={question.id}
                  checked={wizard.answers[question.id] === option.id}
                  onChange={() => {
                    const next = answerDirectorQuestion(wizard, question.id, option.id);
                    onWizardChange(next);
                    if (next.phase === "complete") {
                      onComplete(next);
                    }
                  }}
                />
                <span className="text-sm text-zinc-900">{option.label}</span>
              </label>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => {
            const next = skipDirectorQuestion(wizard, question.id);
            onWizardChange(next);
            if (next.phase === "complete") {
              onComplete(next);
            }
          }}
          className="text-sm font-semibold text-[#0067B1] hover:underline"
          data-testid="studio-v11-skip-question"
        >
          {t("studio.v11.useAiProposal" as never)}
        </button>
      </div>
    );
  }

  return null;
}
