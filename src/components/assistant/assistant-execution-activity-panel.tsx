"use client";

import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { AssistantExecutionPlan } from "@/types/assistant-tool-execution";

type Props = {
  plan: AssistantExecutionPlan;
  onOpenWizard?: () => void;
  onRetryStep?: (stepId: string) => void;
  onSkipStep?: (stepId: string) => void;
  onOpenManual?: (route: string) => void;
};

function statusIcon(status: string): string {
  switch (status) {
    case "completed":
      return "✓";
    case "running":
      return "⏳";
    case "failed":
      return "✗";
    case "requires_user_review":
      return "⚠";
    case "skipped":
      return "○";
    default:
      return "○";
  }
}

export function AssistantExecutionActivityPanel({
  plan,
  onOpenWizard,
  onRetryStep,
  onSkipStep,
  onOpenManual,
}: Props) {
  const t = useActiveTranslator();
  const allReady =
    plan.status === "completed" ||
    plan.steps.every(
      (step) =>
        step.status === "completed" ||
        step.status === "skipped" ||
        step.status === "requires_user_review"
    );

  return (
    <div
      className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 text-xs text-zinc-800"
      data-testid="assistant-execution-activity-panel"
    >
      <div>
        <p className="font-semibold text-zinc-900">
          {t("assistant.execution.activity.title" as never)}
        </p>
        <p className="mt-1 text-zinc-600">{plan.presetTitle}</p>
      </div>

      <ul className="space-y-1.5">
        {plan.steps.map((step) => (
          <li key={step.id} className="rounded-lg border border-white/70 bg-white/60 px-2 py-1.5">
            <div className="flex items-start gap-2">
              <span aria-hidden>{statusIcon(step.status)}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-900">{t(step.labelKey as never)}</p>
                {step.status === "failed" ? (
                  <div className="mt-1 space-y-1 text-amber-900">
                    <p>{t("assistant.execution.activity.stepFailed" as never)}</p>
                    <div className="flex flex-wrap gap-2">
                      {step.output?.retryable !== false && onRetryStep ? (
                        <button
                          type="button"
                          className="text-[11px] font-semibold text-indigo-700 underline"
                          onClick={() => onRetryStep(step.id)}
                        >
                          {t("assistant.execution.activity.retry" as never)}
                        </button>
                      ) : null}
                      {step.output?.skipAllowed && onSkipStep ? (
                        <button
                          type="button"
                          className="text-[11px] font-semibold text-indigo-700 underline"
                          onClick={() => onSkipStep(step.id)}
                        >
                          {t("assistant.execution.activity.skip" as never)}
                        </button>
                      ) : null}
                      {step.output?.manualRoute && onOpenManual ? (
                        <button
                          type="button"
                          className="text-[11px] font-semibold text-indigo-700 underline"
                          onClick={() => onOpenManual(step.output!.manualRoute!)}
                        >
                          {t("assistant.execution.activity.openManual" as never)}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {allReady ? (
        <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/80 p-2 text-emerald-950">
          <p className="font-semibold">{t("assistant.execution.activity.ready" as never)}</p>
          <p>{t("assistant.execution.activity.preparedByAssistant" as never)}</p>
          {onOpenWizard ? (
            <button
              type="button"
              className={`${studioVisual.btnPrimary} px-3 py-1.5 text-xs`}
              data-testid="assistant-execution-open-wizard-button"
              onClick={onOpenWizard}
            >
              {t("assistant.execution.activity.openWizard" as never)}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
