"use client";

import { useActiveTranslator } from "@/i18n/client";
import {
  EDITOR_FLOW_STEPS,
  type EditorFlowStepId,
  type EditorFlowStepState,
} from "@/lib/editor-flow-steps";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  activeStep: EditorFlowStepId;
  stepStates?: Partial<Record<EditorFlowStepId, EditorFlowStepState>>;
  compact?: boolean;
  className?: string;
};

function stepCircleClass(state: EditorFlowStepState): string {
  switch (state) {
    case "complete":
      return "bg-[#0067B1] text-white border-[#0067B1]";
    case "active":
      return "bg-white text-[#0067B1] border-[#0067B1] ring-2 ring-[#0067B1]/30";
    case "blocked":
      return "bg-zinc-100 text-zinc-400 border-zinc-200";
    default:
      return "bg-white text-zinc-500 border-zinc-200";
  }
}

export function EditorFlowStepper({ activeStep, stepStates = {}, compact, className = "" }: Props) {
  const t = useActiveTranslator();

  return (
    <nav
      aria-label={t("editor.flow.stepper.label" as never)}
      className={`${className}`}
      data-testid="editor-flow-stepper"
      data-active-step={activeStep}
    >
      <ol className="flex flex-wrap items-center gap-2 sm:gap-3">
        {EDITOR_FLOW_STEPS.map((step, index) => {
          const state =
            stepStates[step.id] ??
            (step.id === activeStep
              ? "active"
              : EDITOR_FLOW_STEPS.findIndex((s) => s.id === activeStep) > index
                ? "complete"
                : "upcoming");
          const labelKey = compact ? step.shortLabelKey : step.labelKey;
          return (
            <li key={step.id} className="flex min-w-0 items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${stepCircleClass(state)}`}
                aria-current={state === "active" ? "step" : undefined}
              >
                {state === "complete" ? "✓" : index + 1}
              </span>
              <span
                className={`hidden text-xs font-semibold sm:inline ${
                  state === "active" ? "text-zinc-900" : state === "complete" ? "text-[#0067B1]" : "text-zinc-500"
                }`}
              >
                {t(labelKey as never)}
              </span>
              {index < EDITOR_FLOW_STEPS.length - 1 ?
                <span className="hidden text-zinc-300 sm:inline" aria-hidden>
                  →
                </span>
              : null}
            </li>
          );
        })}
      </ol>
      {compact ?
        <p className="mt-1 text-xs font-semibold text-zinc-700 sm:hidden">
          {t(EDITOR_FLOW_STEPS.find((s) => s.id === activeStep)?.labelKey as never)}
        </p>
      : null}
    </nav>
  );
}

type ActionBarProps = {
  onBack?: () => void;
  onContinue?: () => void;
  onSaveDraft?: () => void;
  onClose?: () => void;
  continueLabel?: string;
  backLabel?: string;
  continueDisabled?: boolean;
  backDisabled?: boolean;
  busy?: boolean;
};

export function EditorFlowActionBar({
  onBack,
  onContinue,
  onSaveDraft,
  onClose,
  continueLabel,
  backLabel,
  continueDisabled,
  backDisabled,
  busy,
}: ActionBarProps) {
  const t = useActiveTranslator();

  return (
    <div
      className="sticky bottom-0 z-20 -mx-4 border-t border-zinc-200/80 bg-white/95 px-4 py-3 backdrop-blur-md sm:static sm:mx-0 sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none"
      data-testid="editor-flow-action-bar"
    >
      <div className="flex flex-wrap items-center gap-2">
        {onBack ?
          <button
            type="button"
            disabled={backDisabled || busy}
            onClick={onBack}
            className="min-h-11 flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 disabled:opacity-50 sm:flex-none"
          >
            {backLabel ?? t("editor.flow.back" as never)}
          </button>
        : null}
        {onSaveDraft ?
          <button
            type="button"
            disabled={busy}
            onClick={onSaveDraft}
            className="hidden min-h-11 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 sm:inline-flex"
          >
            {t("editor.flow.saveDraft" as never)}
          </button>
        : null}
        {onClose ?
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="min-h-11 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-600"
          >
            {t("editor.flow.close" as never)}
          </button>
        : null}
        {onContinue ?
          <button
            type="button"
            disabled={continueDisabled || busy}
            onClick={onContinue}
            className={`min-h-11 flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:flex-none ${studioVisual.btnGradientPrimary}`}
            data-testid="editor-flow-continue"
          >
            {continueLabel ?? t("editor.flow.continue" as never)}
          </button>
        : null}
      </div>
    </div>
  );
}
