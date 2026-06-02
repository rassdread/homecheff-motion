"use client";

import { useCallback, useState } from "react";
import { fetchInstantPremiumStatus } from "@/lib/instant-premium-polling-api";
import { invalidateCachedInstantProgressSnapshot } from "@/lib/instant-premium-progress-cache";
import {
  repairSnapshotFromStatus,
  resolveInstantRepairUiView,
  shouldShowUnifiedVideoRepairCard,
} from "@/lib/instant-repair-ui-state";
import type { InstantPremiumStatusResponse } from "@/types/animation-api";

export type InstantVideoRepairFeedback = {
  kind: "idle" | "starting" | "started" | "completed" | "already_running" | "error" | "poll_failed";
  userMessageKey: string | null;
  adminDetail: string | null;
  lastHttpStatus: number | null;
};

export type UseInstantVideoRepairOptions = {
  projectId: string;
  snapshot: InstantPremiumStatusResponse | null;
  setSnapshot: (next: InstantPremiumStatusResponse) => void;
  isAdmin?: boolean;
  onPollNow?: () => Promise<void>;
  onReload?: () => Promise<void>;
};

export function useInstantVideoRepair(options: UseInstantVideoRepairOptions) {
  const { projectId, snapshot, setSnapshot, isAdmin = false, onPollNow, onReload } = options;
  const [repairStarting, setRepairStarting] = useState(false);
  const [feedback, setFeedback] = useState<InstantVideoRepairFeedback>({
    kind: "idle",
    userMessageKey: null,
    adminDetail: null,
    lastHttpStatus: null,
  });
  const repairSnapshot = repairSnapshotFromStatus(snapshot);
  const serverRepairRunning =
    snapshot?.videoRepairStatus === "running" || Boolean(snapshot?.isRestoringFinalVideo);
  const uiView = resolveInstantRepairUiView({
    snapshot: repairSnapshot,
    repairStarting: repairStarting && !serverRepairRunning,
  });
  const repairInFlight = uiView === "repair_running" || repairStarting;

  const pollNow = useCallback(async (): Promise<boolean> => {
    if (onPollNow) {
      await onPollNow();
      return true;
    }
    const result = await fetchInstantPremiumStatus(projectId);
    if (result.kind === "ok") {
      setSnapshot(result.data);
      invalidateCachedInstantProgressSnapshot(projectId);
      return true;
    }
    const adminDetail =
      result.kind === "network"
        ? `GET /api/instant-premium/projects/${projectId}/status: ${result.error}`
        : result.kind === "api"
          ? `GET /api/instant-premium/projects/${projectId}/status: HTTP ${result.status}`
          : "poll failed";
    setFeedback({
      kind: "poll_failed",
      userMessageKey: "instant.videoRepair.pollFailed",
      adminDetail: isAdmin ? adminDetail : null,
      lastHttpStatus: result.kind === "api" ? result.status : null,
    });
    return false;
  }, [onPollNow, projectId, setSnapshot, isAdmin]);

  async function runRepair() {
    if (!projectId || repairInFlight || repairStarting) {
      if (repairInFlight) {
        setFeedback({
          kind: "already_running",
          userMessageKey: "instant.videoRepair.alreadyRunning",
          adminDetail: isAdmin ? "blocked: repair already in progress" : null,
          lastHttpStatus: null,
        });
      }
      return;
    }

    setRepairStarting(true);
    setFeedback({
      kind: "starting",
      userMessageKey: "instant.videoRepair.starting",
      adminDetail: isAdmin ? `[repair-click] POST ${projectId}` : null,
      lastHttpStatus: null,
    });

    if (isAdmin) {
      console.info("[instant-video-repair-ui]", {
        phase: "click",
        projectId,
      });
    }

    try {
      const useMergeRetry =
        Boolean(snapshot?.canRetryMerge) &&
        !snapshot?.canRepairFinalVideo &&
        !snapshot?.canRetryOverlay;

      const url = useMergeRetry
        ? `/api/instant-premium/projects/${encodeURIComponent(projectId)}/merge/retry`
        : `/api/instant-premium/projects/${encodeURIComponent(projectId)}/repair-final-video`;

      const res = await fetch(url, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        status?: InstantPremiumStatusResponse;
        repair?: {
          accepted?: boolean;
          alreadyRunning?: boolean;
          completedImmediately?: boolean;
          clipsReady?: boolean;
          message?: string;
        };
        repairAdminDetail?: unknown;
      };

      if (isAdmin) {
        console.info("[instant-video-repair-ui]", {
          phase: "response",
          projectId,
          httpStatus: res.status,
          accepted: body.repair?.accepted,
          alreadyRunning: body.repair?.alreadyRunning,
        });
      }

      const adminDetail = isAdmin
        ? JSON.stringify(
            {
              httpStatus: res.status,
              repair: body.repair ?? null,
              error: body.error ?? null,
              repairAdminDetail: body.repairAdminDetail ?? body.status?.repairAdminDetail ?? null,
            },
            null,
            2
          )
        : null;

      if (body.status) {
        setSnapshot(body.status);
      }

      setFeedback((prev) => ({
        ...prev,
        lastHttpStatus: res.status,
        adminDetail: adminDetail ?? prev.adminDetail,
      }));

      if (res.status === 409 || body.repair?.alreadyRunning) {
        setFeedback({
          kind: "already_running",
          userMessageKey: "instant.videoRepair.alreadyRunning",
          adminDetail,
          lastHttpStatus: res.status,
        });
        void pollNow();
        return;
      }

      if (!res.ok) {
        setRepairStarting(false);
        setFeedback({
          kind: "error",
          userMessageKey: "instant.videoRepair.startFailed",
          adminDetail,
          lastHttpStatus: res.status,
        });
        return;
      }

      if (body.repair?.clipsReady === false) {
        setRepairStarting(false);
        setFeedback({
          kind: "error",
          userMessageKey: "instant.videoRepair.startFailed",
          adminDetail,
          lastHttpStatus: res.status,
        });
        return;
      }

      if (body.repair?.completedImmediately || res.status === 200) {
        setRepairStarting(false);
        setFeedback({
          kind: "completed",
          userMessageKey: "instant.videoRepair.stage.done",
          adminDetail,
          lastHttpStatus: res.status,
        });
        invalidateCachedInstantProgressSnapshot(projectId);
        await onReload?.();
        await pollNow();
        return;
      }

      setFeedback({
        kind: "started",
        userMessageKey:
          res.status === 202
            ? "instant.videoRepair.startedChecking"
            : "instant.videoRepair.started",
        adminDetail,
        lastHttpStatus: res.status,
      });

      invalidateCachedInstantProgressSnapshot(projectId);
      await pollNow();
      void pollNow();
      setRepairStarting(false);
    } catch (error) {
      setRepairStarting(false);
      const adminDetail = isAdmin
        ? `network error: ${error instanceof Error ? error.message : String(error)}`
        : null;
      if (isAdmin) {
        console.warn("[instant-video-repair-ui]", { phase: "error", projectId, adminDetail });
      }
      setFeedback({
        kind: "error",
        userMessageKey: "instant.videoRepair.startFailed",
        adminDetail,
        lastHttpStatus: null,
      });
    }
  }

  return {
    uiView,
    repairInFlight,
    repairStarting,
    feedback,
    runRepair,
    pollNow,
    showRepairCard: shouldShowUnifiedVideoRepairCard(uiView),
  };
}
