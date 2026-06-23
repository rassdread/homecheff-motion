"use client";

import { useActiveTranslator } from "@/i18n/client";
import {
  mapFusionPipelineStepToUserProgress,
  wizardUserProgressLabelKey,
  WIZARD_USER_PROGRESS_STEP_KEYS,
} from "@/lib/wizard-user-copy";
import { HomeCheffOrbitLoader } from "@/components/editor/homecheff-orbit-loader";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  activeStepIndex: number;
};

export function EditorFusionWizardProgress({ activeStepIndex }: Props) {
  const t = useActiveTranslator();
  const userStepIndex = mapFusionPipelineStepToUserProgress(activeStepIndex);

  return (
    <section
      className={`space-y-4 rounded-2xl border border-zinc-200 p-6 ${studioVisual.editorSurface}`}
      data-testid="fusion-wizard-progress"
    >
      <div className="flex justify-center">
        <HomeCheffOrbitLoader state="generating" size="md" />
      </div>
      <ol className="space-y-2">
        {WIZARD_USER_PROGRESS_STEP_KEYS.map((key, index) => {
          const done = index < userStepIndex;
          const active = index === userStepIndex;
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
              {t(wizardUserProgressLabelKey(index) as never)}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
