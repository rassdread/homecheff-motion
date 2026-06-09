"use client";

import { useEffect, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { GENERATION_PROGRESS_STEP_IDS, type GenerationProgressStepId } from "@/types/studio-asset-generation-workbench";

type Props = {
  activeStepId: GenerationProgressStepId;
  running?: boolean;
};

const STEP_ORDER = GENERATION_PROGRESS_STEP_IDS;

export function StudioWizardGenerationProgress({ activeStepId, running = true }: Props) {
  const t = useActiveTranslator();
  const activeIndex = STEP_ORDER.indexOf(activeStepId);
  const baseProgress = ((activeIndex + 1) / STEP_ORDER.length) * 100;
  const [animation, setAnimation] = useState({ stepId: activeStepId, tick: 0 });

  useEffect(() => {
    if (!running) {
      return;
    }
    const timer = setInterval(() => {
      setAnimation((current) => {
        if (current.stepId !== activeStepId) {
          return { stepId: activeStepId, tick: 1 };
        }
        return { stepId: activeStepId, tick: current.tick + 1 };
      });
    }, 400);
    return () => clearInterval(timer);
  }, [activeStepId, running]);

  const animationBump =
    animation.stepId === activeStepId ? Math.min(8, animation.tick * 2) : 0;
  const progress = running ? Math.min(100, baseProgress + animationBump) : 100;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {t("studio.workbench.generationProgress.title")}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-[#0067B1] transition-all duration-300"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
      <ol className="mt-4 space-y-2">
        {STEP_ORDER.map((stepId, index) => {
          const state =
            index < activeIndex ? "done" : index === activeIndex && running ? "active" : "pending";
          return (
            <li
              key={stepId}
              className={`flex items-center gap-2 text-sm ${
                state === "active"
                  ? "font-semibold text-[#0067B1]"
                  : state === "done"
                    ? "text-emerald-700"
                    : "text-zinc-400"
              }`}
            >
              <span className="w-5 text-center">{state === "done" ? "✓" : state === "active" ? "…" : "○"}</span>
              {t(`studio.workbench.generationProgress.step.${stepId}` as never)}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
