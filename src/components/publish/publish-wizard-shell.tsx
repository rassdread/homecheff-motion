"use client";

import { ReactNode } from "react";
import {
  PUBLISH_WIZARD_STEPS,
  PUBLISH_WIZARD_STEP_LABEL_KEYS,
  PUBLISH_WIZARD_STEP_HELP_KEYS,
  PUBLISH_WIZARD_STEP_WHY_KEYS,
  PUBLISH_WIZARD_STEP_NEXT_KEYS,
  PUBLISH_WIZARD_STEP_CONTROL_KEYS,
  type PublishWizardStepId,
} from "@/lib/publish-wizard-flow";
import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  step: PublishWizardStepId;
  onStepChange: (step: PublishWizardStepId) => void;
  children: ReactNode;
  canAdvance?: boolean;
  onNext?: () => void;
  onBack?: () => void;
};

export function PublishWizardShell({
  step,
  onStepChange,
  children,
  canAdvance = true,
  onNext,
  onBack,
}: Props) {
  const t = useActiveTranslator();
  const stepIndex = PUBLISH_WIZARD_STEPS.indexOf(step);

  return (
    <div className="space-y-4" data-testid="publish-wizard-shell">
      <nav className="flex flex-wrap gap-1.5" aria-label={t("publish.wizard.nav" as never)}>
        {PUBLISH_WIZARD_STEPS.map((id, index) => {
          const active = id === step;
          const done = index < stepIndex;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onStepChange(id)}
              className={
                active ? studioVisual.editorTabActive
                : done ?
                  "rounded-full border border-emerald-300/80 bg-emerald-50 px-3 py-1.5 text-[10px] font-semibold text-emerald-800"
                : "rounded-full border border-zinc-200 bg-white/80 px-3 py-1.5 text-[10px] font-semibold text-zinc-500"
              }
            >
              {t(PUBLISH_WIZARD_STEP_LABEL_KEYS[id] as never)}
            </button>
          );
        })}
      </nav>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
          {t("publish.wizard.aiCanDo" as never)}
        </p>
        <p className="text-sm text-zinc-700">{t(PUBLISH_WIZARD_STEP_HELP_KEYS[step] as never)}</p>
        <p className="text-xs font-medium text-sky-900">{t(PUBLISH_WIZARD_STEP_NEXT_KEYS[step] as never)}</p>
        <p className="text-xs text-zinc-500">{t(PUBLISH_WIZARD_STEP_WHY_KEYS[step] as never)}</p>
        <p className="text-xs text-emerald-800">{t(PUBLISH_WIZARD_STEP_CONTROL_KEYS[step] as never)}</p>
      </div>
      <div className={`${studioVisual.editorSurface} p-4`}>{children}</div>
      <div className="flex flex-wrap gap-2">
        {onBack ?
          <button
            type="button"
            onClick={onBack}
            className={`min-h-11 ${studioVisual.editorTabInactive}`}
          >
            {t("editor.flow.back" as never)}
          </button>
        : null}
        {onNext ?
          <button
            type="button"
            disabled={!canAdvance}
            onClick={onNext}
            className={`min-h-11 disabled:opacity-40 ${studioVisual.editorTabActive}`}
          >
            {t("editor.flow.continue" as never)}
          </button>
        : null}
      </div>
    </div>
  );
}
