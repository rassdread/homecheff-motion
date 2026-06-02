"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  INSTANT_ACTIVE_POLL_MS,
  INSTANT_COMPLETED_POLL_MS,
} from "@/hooks/use-instant-premium-progress-polling";
import { instantStatusFromProjectDetail } from "@/lib/instant-premium-status-fallback";
import { writeCachedInstantProgressSnapshot } from "@/lib/instant-premium-progress-cache";
import type {
  AnimationProjectDetailResponse,
  InstantPremiumStatusApiResponse,
  InstantPremiumStatusResponse,
} from "@/types/animation-api";

async function fetchInstantStatus(
  projectId: string
): Promise<InstantPremiumStatusResponse | null> {
  try {
    const res = await fetch(`/api/instant-premium/projects/${encodeURIComponent(projectId)}/status`, {
      credentials: "include",
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as InstantPremiumStatusApiResponse;
    if (res.ok) {
      if ("availability" in body && body.availability === "ok") {
        return body;
      }
      if ("projectId" in body && "segments" in body && !("availability" in body)) {
        return body as unknown as InstantPremiumStatusResponse;
      }
    }
  } catch {
    return null;
  }
  return null;
}

async function fetchDetailFallback(projectId: string): Promise<InstantPremiumStatusResponse | null> {
  try {
    const res = await fetch(`/api/animations/projects/${encodeURIComponent(projectId)}`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      return null;
    }
    const detail = (await res.json()) as AnimationProjectDetailResponse;
    return instantStatusFromProjectDetail(projectId, detail);
  } catch {
    return null;
  }
}

function isTerminal(snapshot: InstantPremiumStatusResponse | null): boolean {
  if (!snapshot) {
    return false;
  }
  return snapshot.status === "completed" || snapshot.status === "failed" || Boolean(snapshot.finalVideoUrl);
}

/** Poll instant-premium status for gallery/detail pages. */
export function useInstantPremiumStatusPolling(projectId: string, enabled: boolean) {
  const lastProgressRef = useRef<string | null>(null);
  const [snapshot, setSnapshot] = useState<InstantPremiumStatusResponse | null>(null);
  const [lastPolledAtMs, setLastPolledAtMs] = useState<number | null>(null);
  const [lastProgressChangeAtMs, setLastProgressChangeAtMs] = useState<number | null>(null);

  const apply = useCallback((next: InstantPremiumStatusResponse) => {
    const now = Date.now();
    setSnapshot(next);
    setLastPolledAtMs(now);
    const key = `${next.status}:${next.currentStage ?? ""}:${next.progressPercent}:${next.activeOperation ?? ""}`;
    if (lastProgressRef.current !== key) {
      lastProgressRef.current = key;
      setLastProgressChangeAtMs(now);
    }
  }, []);

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
      let next = await fetchInstantStatus(projectId);
      if (!next) {
        next = await fetchDetailFallback(projectId);
      }
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
  }, [projectId, enabled, apply]);

  const pollNow = useCallback(async () => {
    if (!projectId) {
      return;
    }
    let next = await fetchInstantStatus(projectId);
    if (!next) {
      next = await fetchDetailFallback(projectId);
    }
    if (next) {
      apply(next);
    }
  }, [projectId, apply]);

  return {
    snapshot,
    setSnapshot,
    lastPolledAtMs,
    lastProgressChangeAtMs,
    touchProgressClock: () => setLastProgressChangeAtMs(Date.now()),
    pollNow,
  };
}
