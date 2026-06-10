"use client";

import { useActiveTranslator } from "@/i18n/client";
import { skillLabelKey } from "@/lib/editor-v7-action-plan";
import type { EditorV7CommandPlan } from "@/types/homecheff-visual-editor";

type Props = {
  plan: EditorV7CommandPlan;
  busy?: boolean;
  onPreview: () => void;
  onApply: () => void;
  onEdit: () => void;
  onCancel: () => void;
};

export function EditorActionPlanPreview({ plan, busy, onPreview, onApply, onEdit, onCancel }: Props) {
  const t = useActiveTranslator();

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/80 p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
            {t("editor.v7.plan.title" as never)}
          </p>
          {plan.skillId ?
            <p className="mt-1 text-xs text-violet-600">
              {t(skillLabelKey(plan.skillId) as never)}
            </p>
          : null}
          <p className="mt-1 text-sm text-violet-950">“{plan.prompt}”</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-medium text-violet-700 hover:text-violet-900"
        >
          {t("editor.v7.plan.cancel" as never)}
        </button>
      </div>

      <ul className="mb-4 space-y-2">
        {plan.steps.map((step) => (
          <li key={step.id} className="flex items-start gap-2 text-sm text-violet-950">
            <span className="mt-0.5 text-emerald-600" aria-hidden>
              {step.status === "done" ? "✓" : "○"}
            </span>
            <span>
              {t(step.labelKey as never)}
              {step.objectLabel ?
                <span className="ml-1 text-violet-700">— {step.objectLabel}</span>
              : null}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onPreview}
          className="rounded-lg border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-900 hover:bg-violet-100 disabled:opacity-50"
        >
          {t("editor.v7.plan.preview" as never)}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onApply}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {t("editor.v7.plan.apply" as never)}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onEdit}
          className="rounded-lg border border-violet-300 px-4 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-100 disabled:opacity-50"
        >
          {t("editor.v7.plan.edit" as never)}
        </button>
      </div>
    </div>
  );
}
