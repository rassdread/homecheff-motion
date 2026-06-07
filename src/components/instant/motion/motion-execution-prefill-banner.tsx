"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import type { MotionHandoffExecutionPrefillSummary } from "@/types/motion-handoff-execution-prefill";

type Props = {
  prefill: MotionHandoffExecutionPrefillSummary;
};

export function MotionExecutionPrefillBanner({ prefill }: Props) {
  const t = useActiveTranslator();

  return (
    <div className="rounded-xl border border-[#006D52]/25 bg-[#006D52]/5 px-4 py-3">
      <p className="text-sm font-semibold text-[#006D52]">
        {t("motion.handoff.executionPrefill.preparedApproach")}
      </p>
      <p className="mt-1 text-xs text-zinc-700">
        {t(prefill.executionModeLabelKey as TranslationKey)}
        {" · "}
        {t("motion.handoff.executionPrefill.durationEstimate", {
          seconds: String(prefill.totalDurationSeconds),
        })}
        {prefill.usesMultipleSteps ?
          <>
            {" · "}
            {t("motion.handoff.executionPrefill.multipleSteps")}
          </>
        : null}
      </p>
      {prefill.warningCount > 0 || prefill.missingImageCount > 0 ?
        <p className="mt-2 text-xs text-amber-800">
          {prefill.missingImageCount > 0
            ? t("motion.handoff.executionPrefill.missingImagesTitle")
            : null}
          {prefill.warningCount > 0 && prefill.missingImageCount > 0 ? " · " : null}
          {prefill.warningCount > 0
            ? t("motion.handoff.executionPrefill.warningsCount", {
                count: String(prefill.warningCount),
              })
            : null}
        </p>
      : null}
      <p className="mt-1 text-xs font-medium text-zinc-800">
        {prefill.readyToRender
          ? t("motion.handoff.executionPrefill.readyToRender")
          : t("motion.handoff.executionPrefill.notReadyToRender")}
      </p>
    </div>
  );
}
