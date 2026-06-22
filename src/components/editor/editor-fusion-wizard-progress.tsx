"use client";

import { useActiveTranslator } from "@/i18n/client";
import { fusionWizardProgressLabelKey } from "@/lib/editor-fusion-wizard-render";
import { FUSION_WIZARD_PROGRESS_STEP_KEYS } from "@/lib/editor-fusion-wizard-flow";
import { HomeCheffOrbitLoader } from "@/components/editor/homecheff-orbit-loader";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  activeStepIndex: number;
};

export function EditorFusionWizardProgress({ activeStepIndex }: Props) {
  const t = useActiveTranslator();

  return (
    <section
      className={`space-y-4 rounded-2xl border border-zinc-200 p-6 ${studioVisual.editorSurface}`}
      data-testid="fusion-wizard-progress"
    >
      <div className="flex justify-center">
        <HomeCheffOrbitLoader state="generating" size="md" />
      </div>
      <ol className="space-y-2">
        {FUSION_WIZARD_PROGRESS_STEP_KEYS.map((key, index) => {
          const done = index < activeStepIndex;
          const active = index === activeStepIndex;
          return (
            <li
              key={key}
              className={`flex items-center gap-2 text-sm ${
                active ? "font-semibold text-[#0067B1]" : done ? "text-emerald-700" : "text-zinc-500"
              }`}
              data-step-index={index}
              data-active={active ? "true" : "false"}
            >
              <span aria-hidden>{done ? "✓" : active ? "…" : "○"}</span>
              {t(fusionWizardProgressLabelKey(index) as never)}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
