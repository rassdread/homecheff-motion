"use client";

import { useEffect, useRef } from "react";
import { AssistantWizardPrefillBanner } from "@/components/assistant/assistant-wizard-prefill-banner";
import { MotionActionPresetSummaryCard } from "@/components/instant/motion-action-preset-summary";
import { useAssistantWizardPrefill } from "@/hooks/use-assistant-wizard-prefill";
import { applyAssistantPrefillToInstantMotion } from "@/lib/assistant-wizard-prefill-apply";
import type { AssistantPrefillPackage } from "@/types/assistant-prefill";

type Props = {
  onApply: (pkg: AssistantPrefillPackage) => void;
};

export function InstantAssistantPrefillApplier({ onApply }: Props) {
  const { prefill, hasPrefill, clearPrefill } = useAssistantWizardPrefill();
  const appliedRef = useRef(false);

  useEffect(() => {
    if (!prefill || appliedRef.current) {
      return;
    }
    appliedRef.current = true;
    onApply(prefill);
  }, [onApply, prefill]);

  if (!hasPrefill || !prefill) {
    return null;
  }

  return (
    <>
      <AssistantWizardPrefillBanner
        prefill={prefill}
        onClear={clearPrefill}
        onAdjust={() => {
          document.getElementById("instant-wizard-main")?.scrollIntoView({ behavior: "smooth" });
        }}
      />
      {prefill.motion?.actionPresetId ? (
        <MotionActionPresetSummaryCard motion={prefill.motion} />
      ) : null}
    </>
  );
}

export { applyAssistantPrefillToInstantMotion };
