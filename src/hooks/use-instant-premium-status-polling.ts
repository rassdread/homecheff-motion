"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  INSTANT_ACTIVE_POLL_MS,
  INSTANT_COMPLETED_POLL_MS,
} from "@/hooks/use-instant-premium-progress-polling";
import {
  fetchInstantPremiumStatus,
  fetchInstantStatusFromProjectDetail,
} from "@/lib/instant-premium-polling-api";
import { writeCachedInstantProgressSnapshot } from "@/lib/instant-premium-progress-cache";
import type { InstantPremiumStatusResponse } from "@/types/animation-api";

export type InstantStatusPollingError = {
  userMessageKey: "instant.videoRepair.pollFailed";
  adminDetail: string | null;
};

function isTerminal(snapshot: InstantPremiumStatusResponse | null): boolean {
  if (!snapshot) {
    return false;
  }
  return snapshot.status === "completed" || snapshot.status === "failed" || Boolean(snapshot.finalVideoUrl);
}

function formatPollAdminDetail(parts: {
  primary: string;
  fallback?: string;
}): string {
  return parts.fallback ? `${parts.primary}; fallback: ${parts.fallback}` : parts.primary;
}

/** Poll instant-premium status for gallery/detail pages. */
export function useInstantPremiumStatusPolling(projectId: string, enabled: boolean) {
  const lastProgressRef = useRef<string | null>(null);
  const [snapshot, setSnapshot] = useState<InstantPremiumStatusResponse | null>(null);
  const [lastPolledAtMs, setLastPolledAtMs] = useState<number | null>(null);
  const [lastProgressChangeAtMs, setLastProgressChangeAtMs] = useState<number | null>(null);
  const [pollingError, setPollingError] = useState<InstantStatusPollingError | null>(null);

  const apply = useCallback((next: InstantPremiumStatusResponse) => {
    const now = Date.now();
    setSnapshot(next);
    setLastPolledAtMs(now);
    setPollingError(null);
    const key = `${next.status}:${next.currentStage ?? ""}:${next.progressPercent}:${next.activeOperation ?? ""}`;
    if (lastProgressRef.current !== key) {
      lastProgressRef.current = key;
      setLastProgressChangeAtMs(now);
    }
  }, []);

  const recordFailure = useCallback((adminDetail: string) => {
    setPollingError({
      userMessageKey: "instant.videoRepair.pollFailed",
      adminDetail,
    });
  }, []);

  const fetchWithFallback = useCallback(async (): Promise<InstantPremiumStatusResponse | null> => {
    const primary = await fetchInstantPremiumStatus(projectId);
    if (primary.kind === "ok") {
      return primary.data;
    }
    if (primary.kind === "network") {
      recordFailure(
        formatPollAdminDetail({
          primary: `GET /api/instant-premium/projects/${projectId}/status: ${primary.error}`,
        })
      );
    } else if (primary.status === 401 || primary.status === 403) {
      recordFailure(
        `GET /api/instant-premium/projects/${projectId}/status: HTTP ${primary.status}`
      );
      return null;
    }

    const fallback = await fetchInstantStatusFromProjectDetail(projectId);
    if (fallback.kind === "ok") {
      return fallback.data;
    }
    if (fallback.kind === "network" || fallback.kind === "auth") {
      recordFailure(
        formatPollAdminDetail({
          primary:
            primary.kind === "api"
              ? `GET /api/instant-premium/projects/${projectId}/status: HTTP ${primary.status}`
              : primary.kind === "network"
                ? `GET /api/instant-premium/projects/${projectId}/status: ${primary.error}`
                : `instant status failed`,
          fallback:
            fallback.kind === "auth"
              ? `GET /api/animations/projects/${projectId}: HTTP ${fallback.status}`
              : `GET /api/animations/projects/${projectId}: ${fallback.error}`,
        })
      );
    }
    return null;
  }, [projectId, recordFailure]);

  useEffect(() => {
    if (!enabled || !projectId) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      if (cancelled) {
        return;
      }
      const next = await fetchWithFallback();
      if (cancelled) {
        return;
      }
      if (next) {
        apply(next);
        if (next.status === "completed" || next.finalVideoUrl?.trim()) {
          writeCachedInstantProgressSnapshot(next.projectId, {
            ...next,
            status: "completed",
          });
        }
      }
      const delay = isTerminal(next) ? INSTANT_COMPLETED_POLL_MS : INSTANT_ACTIVE_POLL_MS;
      timer = setTimeout(() => void tick(), delay);
    };

    void tick();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [projectId, enabled, apply, fetchWithFallback]);

  const pollNow = useCallback(async () => {
    if (!projectId) {
      return;
    }
    const next = await fetchWithFallback();
    if (next) {
      apply(next);
    }
  }, [projectId, apply, fetchWithFallback]);

  return {
    snapshot,
    setSnapshot,
    lastPolledAtMs,
    lastProgressChangeAtMs,
    pollingError,
    touchProgressClock: () => setLastProgressChangeAtMs(Date.now()),
    pollNow,
  };
}
