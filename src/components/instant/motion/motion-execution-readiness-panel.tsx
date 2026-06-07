"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import type { MotionExecutionConsumptionSummary } from "@/types/motion-handoff-execution-consumption";
import type { MotionHandoffExecutionPrefillSummary } from "@/types/motion-handoff-execution-prefill";

type ReadinessItemId =
  | "approach"
  | "images"
  | "duration"
  | "actions"
  | "jobs"
  | "fallback";

const READINESS_STATUS_ICON: Record<string, string> = {
  ok: "✓",
  warn: "!",
  missing: "—",
};

type Props = {
  prefill?: MotionHandoffExecutionPrefillSummary | null;
  consumption?: MotionExecutionConsumptionSummary | null;
};

export function MotionExecutionReadinessPanel({ prefill, consumption }: Props) {
  const t = useActiveTranslator();

  if (!prefill && !consumption) {
    return null;
  }

  const executionModeKey =
    prefill?.executionModeLabelKey ??
    (consumption?.executionMode === "action_chain"
      ? "motion.handoff.executionPrefill.mode.actionChain"
      : consumption?.executionMode === "hybrid"
        ? "motion.handoff.executionPrefill.mode.hybrid"
        : "motion.handoff.executionPrefill.mode.storyVideo");

  const readinessItems: Array<{ id: ReadinessItemId; status: "ok" | "warn" | "missing" }> = [];

  readinessItems.push({
    id: "approach",
    status: consumption?.executionMode || prefill ? "ok" : "warn",
  });

  const missingImages = consumption?.missingImageCount ?? prefill?.missingImageCount ?? 0;
  readinessItems.push({
    id: "images",
    status: missingImages === 0 ? "ok" : missingImages > 0 && (consumption?.presentImageCount ?? 0) > 0 ? "warn" : "missing",
  });

  readinessItems.push({
    id: "duration",
    status: (consumption?.totalDurationSeconds ?? prefill?.totalDurationSeconds ?? 0) > 0 ? "ok" : "warn",
  });

  if (consumption?.actionSegmentCount && consumption.actionSegmentCount > 0) {
    readinessItems.push({
      id: "actions",
      status: "ok",
    });
  }

  readinessItems.push({
    id: "jobs",
    status: consumption?.jobCountMismatch ? "warn" : "ok",
  });

  readinessItems.push({
    id: "fallback",
    status: consumption?.fallbackActive || prefill?.fallbackActive ? "warn" : "ok",
  });

  const filteredItems =
    consumption?.executionMode === "story_video" || !consumption?.actionSegmentCount
      ? readinessItems.filter((i) => i.id !== "actions")
      : readinessItems;

  return (
    <div className="rounded-xl border border-[#006D52]/25 bg-[#006D52]/5 px-4 py-3">
      <p className="text-sm font-semibold text-[#006D52]">
        {t("motion.handoff.executionConsumption.readinessTitle")}
      </p>
      <p className="mt-1 text-xs text-zinc-700">
        {t(executionModeKey as TranslationKey)}
        {" · "}
        {t("motion.handoff.executionPrefill.durationEstimate", {
          seconds: String(consumption?.totalDurationSeconds ?? prefill?.totalDurationSeconds ?? 0),
        })}
        {consumption?.transitionUnitCount ?
          <>
            {" · "}
            {t("motion.handoff.executionConsumption.transitionUnits", {
              count: String(consumption.transitionUnitCount),
            })}
          </>
        : null}
      </p>

      <ul className="mt-3 space-y-1.5">
        {filteredItems.map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-xs text-zinc-800">
            <span
              className={
                item.status === "ok"
                  ? "font-semibold text-[#006D52]"
                  : item.status === "warn"
                    ? "font-semibold text-amber-700"
                    : "font-semibold text-zinc-500"
              }
              aria-hidden
            >
              {READINESS_STATUS_ICON[item.status]}
            </span>
            <span>
              {t(
                `motion.handoff.executionConsumption.readiness.${item.id}` as TranslationKey
              )}
            </span>
          </li>
        ))}
      </ul>

      {consumption?.jobCountMismatch ?
        <p className="mt-2 text-xs text-amber-800">
          {t("motion.handoff.executionConsumption.warning.jobCountMismatch", {
            planned: String(consumption.plannedJobCount),
            expected: String(consumption.expectedTransitionRowCount),
          })}
        </p>
      : null}

      {missingImages > 0 ?
        <p className="mt-2 text-xs text-amber-800">
          {t("motion.handoff.executionPrefill.warning.missingImagesCount", {
            count: String(missingImages),
          })}
        </p>
      : null}

      <p className="mt-2 text-xs font-medium text-zinc-800">
        {prefill?.readyToRender ?? consumption?.readyToRender
          ? t("motion.handoff.executionPrefill.readyToRender")
          : t("motion.handoff.executionPrefill.notReadyToRender")}
      </p>
    </div>
  );
}
