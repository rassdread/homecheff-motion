"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { InstantVideoRepairFeedback } from "@/hooks/use-instant-video-repair";
import { useSecondsSince } from "@/hooks/use-seconds-since";
import type { InstantRepairUiView } from "@/lib/instant-repair-ui-state";
import {
  buildRepairAdminStatusFields,
  INSTANT_REPAIR_STATUS_STALE_MS,
  resolveRepairLastUpdateMs,
  resolveRepairStatusStaleAnchorMs,
  resolveRepairWorkerStatusKey,
  resolveVideoRepairStageMessageKey,
  resolveVideoRepairStepIndex,
  VIDEO_REPAIR_STEP_COUNT,
} from "@/lib/instant-video-repair-display";
import type { InstantPremiumStatusResponse } from "@/types/animation-api";

type Props = {
  className?: string;
  uiView: InstantRepairUiView;
  repairInFlight: boolean;
  feedback: InstantVideoRepairFeedback;
  snapshot: InstantPremiumStatusResponse | null;
  lastPolledAtMs?: number | null;
  lastProgressChangeAtMs?: number | null;
  isAdmin?: boolean;
  disabled?: boolean;
  disabledReasonKey?: string | null;
  onRepair: () => void;
};

export function InstantVideoRepairCard({
  className = "",
  uiView,
  repairInFlight,
  feedback,
  snapshot,
  lastPolledAtMs = null,
  lastProgressChangeAtMs = null,
  isAdmin = false,
  disabled = false,
  disabledReasonKey = null,
  onRepair,
}: Props) {
  const t = useActiveTranslator();
  const isRunning = uiView === "repair_running";
  const lastUpdateMs = resolveRepairLastUpdateMs({
    lastPolledAtMs,
    videoRepairUpdatedAt: snapshot?.videoRepairUpdatedAt,
  });
  const pollSecondsAgo = useSecondsSince(lastUpdateMs);
  const staleAnchorMs = resolveRepairStatusStaleAnchorMs({
    lastProgressChangeAtMs,
    lastPolledAtMs,
    videoRepairUpdatedAt: snapshot?.videoRepairUpdatedAt,
  });
  const secondsSinceProgress = useSecondsSince(staleAnchorMs);
  const showStillBusy = useMemo(() => {
    if (!isRunning && !repairInFlight) {
      return false;
    }
    if (secondsSinceProgress == null) {
      return false;
    }
    return secondsSinceProgress * 1000 >= INSTANT_REPAIR_STATUS_STALE_MS;
  }, [isRunning, repairInFlight, secondsSinceProgress]);

  if (uiView === "none" || uiView === "completed") {
    return null;
  }

  const repairStage = snapshot?.videoRepairStage ?? null;
  const stepIndex = resolveVideoRepairStepIndex(repairStage);
  const stageMessageKey = resolveVideoRepairStageMessageKey(
    repairStage,
    snapshot?.videoRepairUserMessageKey ?? feedback.userMessageKey
  );
  const stageLabel = t(stageMessageKey as never);
  const stepLine = t("instant.videoRepair.stepProgress", {
    current: stepIndex,
    total: VIDEO_REPAIR_STEP_COUNT,
    stage: stageLabel,
  });

  const workerStatusKey = resolveRepairWorkerStatusKey(snapshot);
  const adminFields = buildRepairAdminStatusFields(snapshot);
  const showSpinner = repairInFlight || feedback.kind === "starting";
  const lastUpdatedLabel =
    pollSecondsAgo == null
      ? "—"
      : pollSecondsAgo === 0
        ? t("instant.progress.lastUpdatedNow")
        : t("instant.progress.lastUpdatedAgo", { seconds: pollSecondsAgo });

  const userErrorKey =
    feedback.kind === "error"
      ? feedback.userMessageKey
      : feedback.kind === "already_running"
        ? feedback.userMessageKey
        : null;

  return (
    <div
      className={`rounded-xl border p-4 ${className} ${
        isRunning
          ? "border-sky-200 bg-sky-50"
          : userErrorKey
            ? "border-red-200 bg-red-50"
            : "border-emerald-200 bg-emerald-50"
      }`}
    >
      <h3 className="text-sm font-semibold text-zinc-900">{t("instant.videoRepair.cardTitle")}</h3>
      {!isRunning ? (
        <p className="mt-1 text-xs leading-snug text-zinc-600">{t("instant.videoRepair.hint")}</p>
      ) : null}

      {isRunning ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-start gap-2">
            <span
              className="mt-0.5 inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-sky-600 border-t-transparent"
              aria-hidden
            />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm font-medium text-sky-950">{stepLine}</p>

              <p className="text-xs text-zinc-600" suppressHydrationWarning>
                {t("instant.progress.lastUpdatedPrefix")} {lastUpdatedLabel}
              </p>

              <p className="text-xs font-medium text-sky-900">{t(workerStatusKey as never)}</p>

              {showStillBusy ? (
                <p className="rounded-md border border-sky-200/80 bg-white/70 px-2.5 py-2 text-xs leading-snug text-sky-950">
                  {t("instant.videoRepair.stillBusy")}
                </p>
              ) : null}
            </div>
          </div>

          {isAdmin ? (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-sky-200/80 pt-2 font-mono text-[10px] text-zinc-600">
              <div>
                <dt className="text-zinc-400">{t("instant.videoRepair.admin.activeOperation")}</dt>
                <dd>{adminFields.activeOperation}</dd>
              </div>
              <div>
                <dt className="text-zinc-400">{t("instant.videoRepair.admin.workerJobStatus")}</dt>
                <dd>{adminFields.workerJobStatus}</dd>
              </div>
              <div>
                <dt className="text-zinc-400">{t("instant.videoRepair.admin.repairStage")}</dt>
                <dd>{adminFields.repairStage}</dd>
              </div>
              <div>
                <dt className="text-zinc-400">{t("instant.videoRepair.admin.exportProgress")}</dt>
                <dd>{adminFields.exportProgress}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-zinc-400">{t("instant.videoRepair.admin.lastRepairUpdate")}</dt>
                <dd className="break-all">{adminFields.lastRepairUpdate}</dd>
              </div>
            </dl>
          ) : null}

          {isAdmin && feedback.adminDetail ? (
            <pre className="max-h-28 overflow-auto rounded border border-zinc-200 bg-white p-2 text-[10px] text-zinc-700">
              {feedback.adminDetail}
            </pre>
          ) : null}
        </div>
      ) : (
        <>
          <button
            type="button"
            disabled={disabled || showSpinner}
            onClick={onRepair}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-400 bg-white px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {showSpinner ? (
              <span
                className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent"
                aria-hidden
              />
            ) : null}
            {showSpinner ? t("instant.videoRepair.starting") : t("instant.videoRepair.cta")}
          </button>
          {disabled && disabledReasonKey ? (
            <p className="mt-2 text-xs text-amber-900">{t(disabledReasonKey as never)}</p>
          ) : null}
          {feedback.kind === "starting" || feedback.kind === "started" ? (
            <p className="mt-2 text-xs font-medium text-emerald-900">
              {t((feedback.userMessageKey ?? "instant.videoRepair.starting") as never)}
            </p>
          ) : null}
        </>
      )}

      {userErrorKey ? (
        <p className="mt-2 text-xs text-red-800">{t(userErrorKey as never)}</p>
      ) : null}

      {isAdmin && !isRunning && feedback.adminDetail ? (
        <pre className="mt-2 max-h-36 overflow-auto rounded border border-zinc-200 bg-white p-2 text-[10px] text-zinc-700">
          {feedback.adminDetail}
        </pre>
      ) : null}
    </div>
  );
}
