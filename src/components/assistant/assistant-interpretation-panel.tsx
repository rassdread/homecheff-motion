"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { AssistantPrefillPackage } from "@/types/assistant-prefill";

type Props = {
  prefill: AssistantPrefillPackage;
  onAnswer?: (answer: string) => void;
};

export function AssistantInterpretationPanel({ prefill, onAnswer }: Props) {
  const t = useActiveTranslator();
  const summary = prefill.interpretationSummary;
  if (!summary) {
    return null;
  }

  const pendingQuestion = summary.followUpQuestions[0];

  return (
    <div className="space-y-3" data-testid="assistant-interpretation-panel">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
          {t("assistant.interpretation.title" as never)}
        </p>
        <p className="mt-1 text-xs font-medium text-zinc-600">
          {t("assistant.interpretation.thinking" as never)}
        </p>
        <p className="mt-1 text-sm text-zinc-800">{summary.creativeGoal ?? summary.understoodGoal}</p>
        <p className="mt-1 text-[11px] text-zinc-500">
          {t("assistant.interpretation.confidence" as never, {
            level: summary.confidence,
          })}
        </p>
      </div>

      {summary.styleHints && summary.styleHints.length > 0 ? (
        <div>
          <p className="text-[11px] font-semibold text-zinc-700">
            {t("assistant.interpretation.style" as never)}
          </p>
          <p className="mt-1 text-xs text-zinc-600">{summary.styleHints.join(" · ")}</p>
        </div>
      ) : null}

      {summary.constraints && summary.constraints.length > 0 ? (
        <div>
          <p className="text-[11px] font-semibold text-zinc-700">
            {t("assistant.interpretation.constraints" as never)}
          </p>
          <p className="mt-1 text-xs text-zinc-600">{summary.constraints.join(" · ")}</p>
        </div>
      ) : null}

      {summary.intensity ? (
        <p className="text-xs text-zinc-600">
          {t("assistant.interpretation.intensity" as never, { level: summary.intensity })}
        </p>
      ) : null}

      {summary.alternativeIntents && summary.alternativeIntents.length > 0 && onAnswer ? (
        <div>
          <p className="text-[11px] font-semibold text-zinc-700">
            {t("assistant.interpretation.alternatives" as never)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {summary.alternativeIntents.map((alt) => (
              <button
                key={alt.intent}
                type="button"
                className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700"
                title={alt.reason}
                onClick={() => onAnswer(alt.label)}
              >
                {alt.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {summary.feasibilityNotes && summary.feasibilityNotes.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-2 text-xs text-amber-950">
          {summary.feasibilityNotes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      ) : null}

      {pendingQuestion && onAnswer ? (
        <div>
          <p className="font-semibold text-zinc-900">{pendingQuestion.label}</p>
          <p className="mt-1 text-[11px] text-zinc-600">{pendingQuestion.reason}</p>
          {pendingQuestion.options.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {pendingQuestion.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700"
                  data-testid={`assistant-interpretation-option-${pendingQuestion.id}`}
                  onClick={() => onAnswer(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
