"use client";

import { useMemo } from "react";
import {
  INSTANT_EXPORT_STUCK_MS,
  isInstantExportProgressStuck,
  type InstantPremiumActiveOperation,
  type InstantPremiumProgressStage,
} from "@/lib/instant-premium-progress-stage";
import { InstantRecoveryActionButtons } from "@/components/instant/instant-recovery-action-buttons";
import { InstantVideoRepairCard } from "@/components/instant/instant-video-repair-card";
import { MotionRenderPipelinePanel } from "@/components/instant/motion-render-pipeline-panel";
import { TextLanguageRenderProgressPanel } from "@/components/instant/text-language-render-progress-panel";
import type { InstantVideoRepairFeedback } from "@/hooks/use-instant-video-repair";
import type { InstantRepairUiView } from "@/lib/instant-repair-ui-state";
import {
  deriveTextRerenderLocalPhase,
  isTextRerenderProgressActive,
  resolveTextRerenderProgress,
} from "@/lib/text-language-render-progress";
import { useSecondsSince } from "@/hooks/use-seconds-since";
import { useActiveTranslator } from "@/i18n/client";
import type { InstantPremiumStatusResponse } from "@/types/animation-api";

const STAGE_LABEL_KEYS: Record<InstantPremiumProgressStage, string> = {
  segment_rendering: "instant.progress.stage.segmentRendering",
  foreground_segmentation: "instant.progress.stage.foregroundSegmentation",
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
  repair: "instant.videoRepair.busy",
  rebuild: "instant.textRerender.busy",
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
  onTextRerender?: () => void;
  onForceRebuild?: () => void;
  showUnifiedRepair?: boolean;
  repairUiView?: InstantRepairUiView;
  repairFeedback?: InstantVideoRepairFeedback;
  pollingError?: {
    userMessageKey: "instant.videoRepair.pollFailed";
    adminDetail: string | null;
  } | null;
  /** Hide repair / rerender buttons (e.g. project detail quick actions). */
  hideRecoveryActions?: boolean;
  /** Hide worker/export debug grid (project detail uses collapsed advanced section). */
  hideAdminDiagnostics?: boolean;
  /** Progress bars only — status/recovery handled by RenderActivityStatusCard. */
  compactProgressOnly?: boolean;
  className?: string;
};

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
      track: "bg-[#006D52]/10",
      fill: "bg-[#006D52]",
      stripe: false,
    };
  }
  if (isActive) {
    return {
      track: "bg-[#0067B1]/10",
      fill: "bg-gradient-to-r from-[#006D52] via-[#0067B1] to-[#006D52]",
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
  onTextRerender,
  onForceRebuild,
  showUnifiedRepair = false,
  repairUiView = "none",
  repairFeedback = {
    kind: "idle",
    userMessageKey: null,
    adminDetail: null,
    lastHttpStatus: null,
  },
  pollingError = null,
  hideRecoveryActions = false,
  hideAdminDiagnostics = false,
  compactProgressOnly = false,
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

  const repairActive =
    repairBusy ||
    snapshot?.videoRepairStatus === "running" ||
    Boolean(snapshot?.isRestoringFinalVideo) ||
    repairFeedback.kind === "starting" ||
    repairFeedback.kind === "started";

  const textRerenderLocalPhase = deriveTextRerenderLocalPhase({
    savingStoryboard: rebuildBusy && !snapshot?.isRebuildingFinalVideo,
    isRebuildingFinalVideo: snapshot?.isRebuildingFinalVideo,
    rebuildFailed:
      Boolean(snapshot?.finalRebuildFailed) &&
      !snapshot?.isRebuildingFinalVideo &&
      !rebuildBusy,
  });

  const textRerenderProgress = useMemo(
    () =>
      resolveTextRerenderProgress({
        localPhase: textRerenderLocalPhase,
        progressPercent: snapshot?.progressPercent,
        finalExportStage:
          snapshot?.finalExportStage ?? snapshot?.repairAdminDetail?.finalExportStage ?? null,
        isRebuildingFinalVideo: snapshot?.isRebuildingFinalVideo,
        rebuildFailed:
          Boolean(snapshot?.finalRebuildFailed) &&
          !snapshot?.isRebuildingFinalVideo &&
          !rebuildBusy,
        errorMessage: snapshot?.exportLastError ?? snapshot?.errorMessage,
      }),
    [
      rebuildBusy,
      snapshot?.errorMessage,
      snapshot?.exportLastError,
      snapshot?.finalExportStage,
      snapshot?.finalRebuildFailed,
      snapshot?.isRebuildingFinalVideo,
      snapshot?.progressPercent,
      snapshot?.repairAdminDetail?.finalExportStage,
      textRerenderLocalPhase,
    ]
  );

  const showTextRerenderProgress =
    isTextRerenderProgressActive({
      localPhase: textRerenderLocalPhase,
      isRebuildingFinalVideo: snapshot?.isRebuildingFinalVideo,
    }) || textRerenderProgress.phase === "failed";

  const stuck = useMemo(
    () =>
      isInstantExportProgressStuck({
        isActive: Boolean(isActive && (snapshot?.status === "finalizing" || (percent >= 70 && !isCompleted))),
        lastProgressChangeAtMs,
        repairInProgress: repairActive,
      }) || (Boolean(snapshot?.finalizationStuck) && !repairActive),
    [
      isActive,
      lastProgressChangeAtMs,
      snapshot?.finalizationStuck,
      snapshot?.status,
      percent,
      isCompleted,
      repairActive,
    ]
  );

  const showFailedBanner = isFailed && !repairActive;
  const showStuckBanner = stuck && !isCompleted && !showFailedBanner && !repairActive;

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
      {!compactProgressOnly ?
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {isActive ? (
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-sky-500"
                  aria-hidden
                />
              ) : isCompleted ? (
                <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[#006D52]" aria-hidden />
              ) : isFailed ? (
                <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" aria-hidden />
              ) : (
                <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-zinc-300" aria-hidden />
              )}
              <p className="text-sm font-semibold text-zinc-900">{t(stageLabelKey as never)}</p>
            </div>
            <p className="text-sm font-bold tabular-nums text-zinc-800">{percent}%</p>
          </div>

          <p className="mt-1 text-xs text-zinc-600">
            {showTextRerenderProgress ? null : t(operationLabelKey as never)}
          </p>
        </>
      : (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("instant.progress.pipelineTitle")}
          </p>
          <p className="text-sm font-bold tabular-nums text-zinc-800">{percent}%</p>
        </div>
      )}

      {showTextRerenderProgress ? (
        <TextLanguageRenderProgressPanel progress={textRerenderProgress} className="mt-3" />
      ) : (
        <MotionRenderPipelinePanel snapshot={snapshot} className="mt-3" />
      )}

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

      {showUnifiedRepair && onRepair && !compactProgressOnly ? (
        <InstantVideoRepairCard
          className="mt-3"
          uiView={repairUiView}
          repairInFlight={Boolean(repairBusy)}
          feedback={repairFeedback}
          snapshot={snapshot}
          lastPolledAtMs={lastPolledAtMs}
          lastProgressChangeAtMs={lastProgressChangeAtMs}
          isAdmin={isAdmin}
          onRepair={onRepair}
        />
      ) : null}

      {pollingError ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <p className="font-medium">{t(pollingError.userMessageKey as never)}</p>
          {isAdmin && pollingError.adminDetail ? (
            <p className="mt-1 break-words font-mono text-xs text-amber-900/90">{pollingError.adminDetail}</p>
          ) : null}
        </div>
      ) : null}

      {showFailedBanner && !compactProgressOnly ? (
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
          {showStuckActions && !hideRecoveryActions ?
            <InstantRecoveryActionButtons
              className="mt-3"
              snapshot={snapshot}
              repairBusy={repairBusy}
              hideVideoRepair={showUnifiedRepair}
              textRerenderBusy={rebuildBusy}
              forceRebuildBusy={rebuildBusy}
              isAdmin={isAdmin}
              onVideoRepair={onRepair}
              onTextRerender={onTextRerender}
              onForceRebuild={onForceRebuild}
            />
          : null}
        </div>
      ) : null}

      {showStuckBanner && !compactProgressOnly ? (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <p className="font-medium">{t("instant.progress.exportStuckTitle")}</p>
          <p className="mt-1 text-xs text-amber-900/90">
            {t("instant.progress.exportStuckHint", { seconds: Math.round(INSTANT_EXPORT_STUCK_MS / 1000) })}
          </p>
          {showStuckActions && !showUnifiedRepair && !hideRecoveryActions ?
            <InstantRecoveryActionButtons
              className="mt-3"
              snapshot={snapshot}
              repairBusy={repairBusy}
              hideVideoRepair={showUnifiedRepair}
              textRerenderBusy={rebuildBusy}
              forceRebuildBusy={rebuildBusy}
              isAdmin={isAdmin}
              onVideoRepair={onRepair}
              onTextRerender={onTextRerender}
              onForceRebuild={onForceRebuild}
            />
          : null}
        </div>
      ) : null}

      {isAdmin && snapshot && !hideAdminDiagnostics ? (
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
