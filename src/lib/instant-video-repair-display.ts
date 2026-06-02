import {
  INSTANT_VIDEO_REPAIR_STAGE_I18N,
  type InstantVideoRepairStage,
} from "@/lib/instant-video-repair";
import type { InstantPremiumStatusResponse } from "@/types/animation-api";

/** User-visible repair steps (excludes transient started/done/failed labels). */
export const VIDEO_REPAIR_STEP_COUNT = 4;

export const VIDEO_REPAIR_PROGRESS_STAGES = [
  "checking_source",
  "preparing_clean",
  "reapplying_texts",
  "uploading_final",
] as const satisfies readonly InstantVideoRepairStage[];

const STAGE_TO_STEP_INDEX: Record<InstantVideoRepairStage, number> = {
  started: 1,
  checking_source: 1,
  preparing_clean: 2,
  reapplying_texts: 3,
  uploading_final: 4,
  done: 4,
  failed: 1,
};

export const INSTANT_REPAIR_STATUS_STALE_MS = 30_000;

export function resolveVideoRepairStepIndex(
  stage: string | null | undefined
): number {
  if (!stage || !(stage in STAGE_TO_STEP_INDEX)) {
    return 1;
  }
  return STAGE_TO_STEP_INDEX[stage as InstantVideoRepairStage];
}

export function resolveVideoRepairStageMessageKey(
  stage: string | null | undefined,
  fallbackKey?: string | null
): string {
  if (stage && stage in INSTANT_VIDEO_REPAIR_STAGE_I18N) {
    return INSTANT_VIDEO_REPAIR_STAGE_I18N[stage as InstantVideoRepairStage];
  }
  return fallbackKey ?? INSTANT_VIDEO_REPAIR_STAGE_I18N.started;
}

export function isRepairStatusStale(
  lastChangeAtMs: number | null,
  nowMs: number = Date.now()
): boolean {
  if (lastChangeAtMs == null) {
    return false;
  }
  return nowMs - lastChangeAtMs >= INSTANT_REPAIR_STATUS_STALE_MS;
}

export function resolveRepairLastUpdateMs(input: {
  lastPolledAtMs: number | null;
  videoRepairUpdatedAt: string | null | undefined;
}): number | null {
  if (input.lastPolledAtMs != null) {
    return input.lastPolledAtMs;
  }
  if (!input.videoRepairUpdatedAt) {
    return null;
  }
  const parsed = Date.parse(input.videoRepairUpdatedAt);
  return Number.isFinite(parsed) ? parsed : null;
}

export function resolveRepairStatusStaleAnchorMs(input: {
  lastProgressChangeAtMs: number | null;
  lastPolledAtMs: number | null;
  videoRepairUpdatedAt: string | null | undefined;
}): number | null {
  if (input.lastProgressChangeAtMs != null) {
    return input.lastProgressChangeAtMs;
  }
  return resolveRepairLastUpdateMs({
    lastPolledAtMs: input.lastPolledAtMs,
    videoRepairUpdatedAt: input.videoRepairUpdatedAt,
  });
}

export type RepairWorkerStatusKey =
  | "instant.videoRepair.executing"
  | "instant.videoRepair.workerQueued"
  | "instant.videoRepair.workerConnecting";

export function resolveRepairWorkerStatusKey(
  snapshot: InstantPremiumStatusResponse | null
): RepairWorkerStatusKey {
  const worker = snapshot?.workerJobStatus;
  if (worker === "queued") {
    return "instant.videoRepair.workerQueued";
  }
  if (worker === "running") {
    return "instant.videoRepair.executing";
  }
  if (
    snapshot?.activeOperation === "repair" ||
    snapshot?.videoRepairStatus === "running" ||
    snapshot?.isRestoringFinalVideo
  ) {
    return "instant.videoRepair.executing";
  }
  return "instant.videoRepair.executing";
}

export type RepairAdminStatusFields = {
  activeOperation: string;
  workerJobStatus: string;
  repairStage: string;
  exportProgress: string;
  lastRepairUpdate: string;
};

export function buildRepairAdminStatusFields(
  snapshot: InstantPremiumStatusResponse | null
): RepairAdminStatusFields {
  const admin = snapshot?.repairAdminDetail as
    | {
        stage?: string | null;
        exportProgress?: number | null;
        exportStatus?: string | null;
        updatedAt?: string | null;
      }
    | null
    | undefined;

  const exportProgress =
    admin?.exportProgress ?? snapshot?.progressPercent ?? null;
  const exportStatus = admin?.exportStatus ?? snapshot?.exportStatus ?? null;
  const progressLabel =
    exportProgress != null
      ? `${exportProgress}%${exportStatus ? ` (${exportStatus})` : ""}`
      : exportStatus ?? "—";

  return {
    activeOperation: snapshot?.activeOperation ?? "—",
    workerJobStatus: snapshot?.workerJobStatus ?? "—",
    repairStage:
      snapshot?.videoRepairStage ??
      (typeof admin?.stage === "string" ? admin.stage : null) ??
      "—",
    exportProgress: progressLabel,
    lastRepairUpdate:
      snapshot?.videoRepairUpdatedAt ??
      (typeof admin?.updatedAt === "string" ? admin.updatedAt : null) ??
      "—",
  };
}
