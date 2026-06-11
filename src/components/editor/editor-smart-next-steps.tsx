"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { SmartNextStep } from "@/lib/editor-workflow-orchestration";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { EditorWorkspaceIntent } from "@/types/editor-instruction-studio";

type Props = {
  steps: SmartNextStep[];
  onStep: (step: SmartNextStep) => void;
};

export function EditorSmartNextSteps({ steps, onStep }: Props) {
  const t = useActiveTranslator();
  if (steps.length === 0) {
    return null;
  }
  return (
    <div className={`p-3 ${studioVisual.editorSurface}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {t("editor.workflow.next.title" as never)}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {steps.map((step) => (
          <button
            key={step.id}
            type="button"
            onClick={() => onStep(step)}
            className="rounded-full border border-[#0067B1]/30 bg-[#0067B1]/5 px-3 py-1.5 text-xs font-semibold text-[#0067B1] hover:bg-[#0067B1]/10"
          >
            {t(step.labelKey as never)}
          </button>
        ))}
      </div>
    </div>
  );
}

export type { EditorWorkspaceIntent };
