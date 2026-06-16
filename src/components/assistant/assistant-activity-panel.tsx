"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { AssistantPrefillActivityStep } from "@/types/assistant-prefill";

type Props = {
  steps: AssistantPrefillActivityStep[];
};

export function AssistantActivityPanel({ steps }: Props) {
  const t = useActiveTranslator();

  if (steps.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-xs text-zinc-700"
      data-testid="assistant-activity-panel"
    >
      <p className="mb-2 font-semibold text-zinc-900">
        {t("assistant.prefill.activity.title" as never)}
      </p>
      <ul className="space-y-1.5">
        {steps.map((step) => (
          <li key={step.id} className="flex items-start gap-2">
            <span aria-hidden>
              {step.status === "done" ? "✓" : step.status === "active" ? "→" : "○"}
            </span>
            <span className={step.status === "active" ? "font-medium text-zinc-900" : ""}>
              {t(step.labelKey as never)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
