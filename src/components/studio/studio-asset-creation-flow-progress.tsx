"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { AssetCreationWizardStep } from "@/types/studio-asset-creation";

const FLOW_STEPS: AssetCreationWizardStep[] = [
  "entry",
  "proposal",
  "builder",
  "readiness",
  "save",
];

type Props = {
  /** Wizard-complete phases: builder form is active. */
  phase: "wizard" | "builder";
  wizardStep?: AssetCreationWizardStep;
};

export function StudioAssetCreationFlowProgress({ phase, wizardStep = "entry" }: Props) {
  const t = useActiveTranslator();
  const activeIndex =
    phase === "wizard"
      ? Math.max(0, ["kind", "entry", "proposal", "builder"].indexOf(wizardStep))
      : 3;

  return (
    <ol className="flex flex-wrap gap-1 text-[11px] font-semibold text-zinc-500">
      {FLOW_STEPS.map((step, index) => {
        const labelKey = `studio.assetCreation.wizard.step.${step}` as const;
        const active = phase === "builder" ? index <= 4 : index <= activeIndex;
        return (
          <li key={step} className={active ? "text-[#0067B1]" : ""}>
            {t(labelKey as never)}
            {index < FLOW_STEPS.length - 1 ? " → " : ""}
          </li>
        );
      })}
    </ol>
  );
}
