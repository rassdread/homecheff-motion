"use client";

import { useEffect, useMemo, useState } from "react";
import {
  INSTANT_EXPORT_STUCK_MS,
  isInstantExportProgressStuck,
  type InstantPremiumActiveOperation,
  type InstantPremiumProgressStage,
} from "@/lib/instant-premium-progress-stage";
import { useMounted } from "@/hooks/use-mounted";
import { useActiveTranslator } from "@/i18n/client";
import type { InstantPremiumStatusResponse } from "@/types/animation-api";

const STAGE_LABEL_KEYS: Record<InstantPremiumProgressStage, string> = {
  segment_rendering: "instant.progress.stage.segmentRendering",
  merge_clips: "instant.progress.stage.mergeClips",
  poster_compositing: "instant.progress.stage.posterCompositing",
  export_video: "instant.progress.stage.exportVideo",
  upload_storage: "instant.progress.stage.uploadStorage",
  finalize: "instant.progress.stage.finalize",
  completed: "instant.progress.stage.completed",
  failed: "instant.progress.stage.failed",
};

const OPERATION_LABEL_KEYS: Record<InstantPremiumActiveOperation, string> = {
  segment_rendering: "instant.progress.operation.segmentRendering",
  repair: "instant.progress.operation.repair",
  rebuild: "instant.progress.operation.rebuild",
  merge_export: "instant.progress.operation.export",
  upload: "instant.progress.operation.upload",
  idle: "instant.progress.operation.idle",
};

export type InstantFinalProgressPanelProps = {
  snapshot: InstantPremiumStatusResponse | null;
  lastPolledAtMs: number | null;
  lastProgressChangeAtMs: number | null;
  connectionState?: "polling" | "reconnecting" | "worker_connecting" | "completed" | "idle";
  repairBusy?: boolean;
  rebuildBusy?: boolean;
  isAdmin?: boolean;
  showStuckActions?: boolean;
  onRepair?: () => void;
  onRebuild?: () => void;
  className?: string;
};

function useSecondsSince(timestampMs: number | null): number | null {
  const mounted = useMounted();
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (!mounted || timestampMs == null) {
      return;
    }
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - timestampMs) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [mounted, timestampMs]);

  return mounted && timestampMs != null ? seconds : null;
}

function barTone(
  stage: InstantPremiumProgressStage | undefined,
  isActive: boolean
): { track: string; fill: string; stripe: boolean } {
  if (stage === "failed") {
    return {
      track: "bg-red-100",
      fill: "bg-red-500",
      stripe: false,
    };
  }
  if (stage === "completed") {
    return {
      track: "bg-emerald-100",
      fill: "bg-emerald-500",
      stripe: false,
    };
  }
  if (isActive) {
    return {
      track: "bg-sky-100",
      fill: "bg-gradient-to-r from-emerald-500 via-sky-500 to-emerald-400",
      stripe: true,
    };
  }
  return {
    track: "bg-zinc-200",
    fill: "bg-zinc-400",
    stripe: false,
  };
}

export function InstantFinalProgressPanel({
  snapshot,
  lastPolledAtMs,
  lastProgressChangeAtMs,
  connectionState = "idle",
  repairBusy = false,
  rebuildBusy = false,
  isAdmin = false,
  showStuckActions = true,
  onRepair,
  onRebuild,
  className = "",
}: InstantFinalProgressPanelProps) {
  const t = useActiveTranslator();
  const pollSecondsAgo = useSecondsSince(lastPolledAtMs);

  const stage = snapshot?.currentStage ?? (snapshot?.status === "completed" ? "completed" : "segment_rendering");
  const operation = snapshot?.activeOperation ?? "idle";
  const percent = snapshot?.progressPercent ?? 0;
  const isCompleted =
    (snapshot?.status === "completed" || stage === "completed") && !snapshot?.finalRebuildFailed;
  const isFailed =
    snapshot?.status === "failed" ||
    stage === "failed" ||
    Boolean(snapshot?.exportFailureReason || snapshot?.finalRebuildFailed);
  const userFailureKey = snapshot?.userExportErrorKey;
  const technicalError = snapshot?.exportLastError ?? snapshot?.errorMessage;
  const isActive =
    !isCompleted &&
    !isFailed &&
    (repairBusy ||
      rebuildBusy ||
      snapshot?.isRebuildingFinalVideo ||
      snapshot?.isRestoringFinalVideo ||
      snapshot?.status === "running" ||
      snapshot?.status === "finalizing" ||
      snapshot?.status === "queued");

  const stuck = useMemo(
    () =>
      isInstantExportProgressStuck({
        isActive: Boolean(isActive && (snapshot?.status === "finalizing" || (percent >= 70 && !isCompleted))),
        lastProgressChangeAtMs,
      }) || Boolean(snapshot?.finalizationStuck),
    [isActive, lastProgressChangeAtMs, snapshot?.finalizationStuck, snapshot?.status, percent, isCompleted]
  );

  const tone = barTone(isFailed ? "failed" : stage, isActive);
  const stageLabelKey = STAGE_LABEL_KEYS[stage] ?? STAGE_LABEL_KEYS.segment_rendering;
  const operationLabelKey = repairBusy
    ? OPERATION_LABEL_KEYS.repair
    : rebuildBusy
      ? OPERATION_LABEL_KEYS.rebuild
      : OPERATION_LABEL_KEYS[operation] ?? OPERATION_LABEL_KEYS.idle;

  const heartbeatLabel =
    pollSecondsAgo == null
      ? "—"
      : pollSecondsAgo === 0
        ? t("instant.progress.lastUpdatedNow")
        : t("instant.progress.lastUpdatedAgo", { seconds: pollSecondsAgo });

  return (
    <div className={`rounded-xl border border-zinc-200 bg-white/90 p-4 shadow-sm ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {isActive ? (
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-sky-500"
              aria-hidden
            />
          ) : isCompleted ? (
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
          ) : isFailed ? (
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" aria-hidden />
          ) : (
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-zinc-300" aria-hidden />
          )}
          <p className="text-sm font-semibold text-zinc-900">{t(stageLabelKey as never)}</p>
        </div>
        <p className="text-sm font-bold tabular-nums text-zinc-800">{percent}%</p>
      </div>

      <p className="mt-1 text-xs text-zinc-600">{t(operationLabelKey as never)}</p>

      <div className={`mt-3 h-3 w-full overflow-hidden rounded-full ${tone.track}`}>
        <div
          className={`relative h-full rounded-full transition-all duration-700 ease-out ${tone.fill}`}
          style={{ width: `${Math.max(isActive || isCompleted ? 4 : 0, percent)}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {tone.stripe ? (
            <span
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "linear-gradient(45deg,rgba(255,255,255,.22) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.22) 50%,rgba(255,255,255,.22) 75%,transparent 75%,transparent)",
                backgroundSize: "1rem 1rem",
                animation: "instant-progress-stripe 1s linear infinite",
              }}
              aria-hidden
            />
          ) : null}
        </div>
      </div>

      <p className="mt-2 text-xs text-zinc-500" suppressHydrationWarning>
        {t("instant.progress.lastUpdatedPrefix")} {heartbeatLabel}
        {connectionState === "reconnecting" || connectionState === "worker_connecting"
          ? ` · ${t("instant.progress.reconnecting")}`
          : null}
      </p>

      {isFailed ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-950">
          <p className="font-medium">
            {userFailureKey ? t(userFailureKey as never) : t("instant.exportFailure.generic")}
          </p>
          {isAdmin && technicalError ? (
            <p className="mt-1 break-words font-mono text-xs text-red-900/90">{technicalError}</p>
          ) : null}
          {snapshot?.finalRebuildFailed && snapshot?.finalVideoUrl ? (
            <p className="mt-2 text-xs text-red-800/90">
              {t("instant.progress.rebuildFinalFailedKeepsPrevious")}
            </p>
          ) : null}
          {showStuckActions && (snapshot?.canRebuildFinalVideo || snapshot?.canRepairFinalVideo) ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {snapshot?.canRepairFinalVideo && onRepair ? (
                <button
                  type="button"
                  disabled={repairBusy}
                  onClick={onRepair}
                  className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 disabled:opacity-60"
                >
                  {repairBusy ? t("instant.recover.restoring") : t("instant.progress.repairFinalVideo")}
                </button>
              ) : null}
              {snapshot?.canRebuildFinalVideo && onRebuild ? (
                <button
                  type="button"
                  disabled={rebuildBusy}
                  onClick={onRebuild}
                  className="rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-900 disabled:opacity-60"
                >
                  {rebuildBusy ? t("instant.progress.rebuildingFinal") : t("instant.progress.rebuildFinalVideo")}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {stuck && !isCompleted && !isFailed ? (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <p className="font-medium">{t("instant.progress.exportStuckTitle")}</p>
          <p className="mt-1 text-xs text-amber-900/90">
            {t("instant.progress.exportStuckHint", { seconds: Math.round(INSTANT_EXPORT_STUCK_MS / 1000) })}
          </p>
          {showStuckActions ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {snapshot?.canRepairFinalVideo && onRepair ? (
                <button
                  type="button"
                  disabled={repairBusy}
                  onClick={onRepair}
                  className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 disabled:opacity-60"
                >
                  {repairBusy ? t("instant.recover.restoring") : t("instant.progress.repairFinalVideo")}
                </button>
              ) : null}
              {snapshot?.canRebuildFinalVideo && onRebuild ? (
                <button
                  type="button"
                  disabled={rebuildBusy}
                  onClick={onRebuild}
                  className="rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-900 disabled:opacity-60"
                >
                  {rebuildBusy ? t("instant.progress.rebuildingFinal") : t("instant.progress.rebuildFinalVideo")}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {isAdmin && snapshot ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-zinc-100 pt-3 font-mono text-[10px] text-zinc-500">
          <div>
            <dt className="text-zinc-400">currentStage</dt>
            <dd>{snapshot.currentStage ?? stage}</dd>
          </div>
          <div>
            <dt className="text-zinc-400">failedAtStage</dt>
            <dd>{snapshot.failedAtStage ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-400">progress</dt>
            <dd>{percent}</dd>
          </div>
          <div>
            <dt className="text-zinc-400">exportId</dt>
            <dd className="truncate">{snapshot.exportId ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-400">exportStatus</dt>
            <dd>{snapshot.exportStatus ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-400">exportProvider</dt>
            <dd>{snapshot.exportProvider ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-400">failureReason</dt>
            <dd>{snapshot.exportFailureReason ?? snapshot.failureReason ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-400">exportLastError</dt>
            <dd className="col-span-2 break-all">{snapshot.exportLastError ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-400">workerError</dt>
            <dd className="col-span-2 break-all">{snapshot.workerError ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-400">workerJobStatus</dt>
            <dd>{snapshot.workerJobStatus ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-400">rebuildCount</dt>
            <dd>{snapshot.rebuildCount ?? 0}</dd>
          </div>
          <div>
            <dt className="text-zinc-400">segmentCount</dt>
            <dd>{snapshot.segmentCount ?? snapshot.segments?.length ?? 0}</dd>
          </div>
          <div>
            <dt className="text-zinc-400">activeOperation</dt>
            <dd>{snapshot.activeOperation ?? operation}</dd>
          </div>
          <div>
            <dt className="text-zinc-400">finalRebuildFailed</dt>
            <dd>{snapshot.finalRebuildFailed ? "true" : "false"}</dd>
          </div>
        </dl>
      ) : null}
    </div>
  );
}
