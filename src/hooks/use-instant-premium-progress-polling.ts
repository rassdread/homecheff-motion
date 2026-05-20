"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { instantStatusFromProjectDetail } from "@/lib/instant-premium-status-fallback";
import {
  readActiveInstantProjectId,
  readCachedInstantProgressSnapshot,
  resolveInstantProgressProjectId,
  writeActiveInstantProjectId,
  writeCachedInstantProgressSnapshot,
} from "@/lib/instant-premium-progress-cache";
import type {
  AnimationProjectDetailResponse,
  InstantPremiumStatusApiResponse,
  InstantPremiumStatusResponse,
} from "@/types/animation-api";

export type InstantProgressConnectionState =
  | "idle"
  | "polling"
  | "reconnecting"
  | "worker_connecting"
  | "fatal_missing"
  | "completed";

const GRACE_MS = 60_000;
const MAX_TRANSIENT_RETRIES = 24;
/** Poll while project is still processing. */
export const INSTANT_ACTIVE_POLL_MS = 3000;
/** Poll after completion to pick up rebuild URL changes. */
export const INSTANT_COMPLETED_POLL_MS = 15000;

function pollDelayMs(transientFailures: number, isTerminal: boolean): number {
  if (isTerminal) {
    return INSTANT_COMPLETED_POLL_MS;
  }
  if (transientFailures <= 0) {
    return INSTANT_ACTIVE_POLL_MS;
  }
  return Math.min(30_000, Math.round(INSTANT_ACTIVE_POLL_MS * 1.4 ** Math.min(transientFailures, 10)));
}

function isTerminalSnapshot(snapshot: InstantPremiumStatusResponse | null): boolean {
  if (!snapshot) {
    return false;
  }
  return (
    snapshot.status === "completed" ||
    snapshot.status === "failed" ||
    Boolean(snapshot.finalVideoUrl)
  );
}

function hasRecoverableSnapshot(projectId: string, snapshot: InstantPremiumStatusResponse | null): boolean {
  if (snapshot?.status === "completed" || snapshot?.finalVideoUrl) {
    return true;
  }
  if (!projectId) {
    return false;
  }
  const cached = readCachedInstantProgressSnapshot(projectId);
  return Boolean(cached?.snapshot?.finalVideoUrl || cached?.snapshot?.status === "completed");
}

async function fetchStatus(
  projectId: string
): Promise<
  | { kind: "ok"; data: InstantPremiumStatusResponse }
  | { kind: "api"; body: InstantPremiumStatusApiResponse; status: number }
  | { kind: "network" }
> {
  try {
    const res = await fetch(`/api/instant-premium/projects/${encodeURIComponent(projectId)}/status`, {
      credentials: "include",
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as InstantPremiumStatusApiResponse;
    if (res.ok) {
      if ("availability" in body && body.availability === "ok") {
        return { kind: "ok", data: body };
      }
      if ("projectId" in body && "segments" in body && !("availability" in body)) {
        return { kind: "ok", data: body as unknown as InstantPremiumStatusResponse };
      }
    }
    return { kind: "api", body, status: res.status };
  } catch {
    return { kind: "network" };
  }
}

async function fetchProjectDetailFallback(
  projectId: string
): Promise<InstantPremiumStatusResponse | null> {
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

export function useInstantPremiumProgressPolling() {
  const mountedAtRef = useRef(0);
  const transientFailuresRef = useRef(0);
  const snapshotRef = useRef<InstantPremiumStatusResponse | null>(null);
  const workerJobStatusRef = useRef<string | null>(null);
  const lastProgressRef = useRef<string | null>(null);

  useEffect(() => {
    mountedAtRef.current = Date.now();
  }, []);

  const [projectId, setProjectId] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }
    const fromUrl = new URLSearchParams(window.location.search).get("projectId")?.trim() ?? "";
    return resolveInstantProgressProjectId(fromUrl);
  });

  const [snapshot, setSnapshot] = useState<InstantPremiumStatusResponse | null>(() => {
    if (typeof window === "undefined" || !projectId) {
      return null;
    }
    return readCachedInstantProgressSnapshot(projectId)?.snapshot ?? null;
  });

  const [connectionState, setConnectionState] = useState<InstantProgressConnectionState>(() => {
    if (typeof window === "undefined") {
      return "idle";
    }
    if (!projectId) {
      return readActiveInstantProjectId() ? "polling" : "reconnecting";
    }
    const cached = readCachedInstantProgressSnapshot(projectId)?.snapshot;
    if (cached?.status === "completed" || cached?.finalVideoUrl) {
      return "completed";
    }
    return "polling";
  });

  const [transientMessage, setTransientMessage] = useState<string | null>(null);
  const [lastPolledAtMs, setLastPolledAtMs] = useState<number | null>(null);
  const [lastProgressChangeAtMs, setLastProgressChangeAtMs] = useState<number | null>(null);

  useEffect(() => {
    snapshotRef.current = snapshot;
    workerJobStatusRef.current = snapshot?.workerJobStatus ?? null;
  }, [snapshot]);

  const applySnapshot = useCallback((next: InstantPremiumStatusResponse) => {
    const now = Date.now();
    setSnapshot(next);
    snapshotRef.current = next;
    workerJobStatusRef.current = next.workerJobStatus ?? null;
    setLastPolledAtMs(now);
    const progressKey = `${next.status}:${next.currentStage ?? ""}:${next.progressPercent}:${next.activeOperation ?? ""}`;
    if (lastProgressRef.current !== progressKey) {
      lastProgressRef.current = progressKey;
      setLastProgressChangeAtMs(now);
    }
    writeCachedInstantProgressSnapshot(next.projectId, next);
    writeActiveInstantProjectId(next.projectId);
    if (next.status === "completed" || next.finalVideoUrl) {
      setConnectionState("completed");
    } else if (next.status === "failed") {
      setConnectionState("polling");
    } else {
      setConnectionState("polling");
    }
    transientFailuresRef.current = 0;
    setTransientMessage(null);
  }, []);

  const tryDetailFallback = useCallback(
    async (id: string): Promise<InstantPremiumStatusResponse | null> => {
      const fallback = await fetchProjectDetailFallback(id);
      if (fallback && (fallback.status === "completed" || fallback.finalVideoUrl)) {
        applySnapshot(fallback);
        return fallback;
      }
      return null;
    },
    [applySnapshot]
  );

  useEffect(() => {
    const syncProjectId = () => {
      const fromUrl = new URLSearchParams(window.location.search).get("projectId")?.trim() ?? "";
      const resolved = resolveInstantProgressProjectId(fromUrl);
      setProjectId(resolved);
      if (resolved) {
        writeActiveInstantProjectId(resolved);
        const cached = readCachedInstantProgressSnapshot(resolved);
        if (cached?.snapshot) {
          setSnapshot((prev) => prev ?? cached.snapshot);
          if (cached.snapshot.status === "completed" || cached.snapshot.finalVideoUrl) {
            setConnectionState("completed");
          }
        }
      }
    };
    syncProjectId();
    window.addEventListener("popstate", syncProjectId);
    return () => window.removeEventListener("popstate", syncProjectId);
  }, []);

  useEffect(() => {
    if (projectId) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tryResolveId = () => {
      if (cancelled) {
        return;
      }
      const active = readActiveInstantProjectId();
      if (active) {
        setProjectId(active);
        const cached = readCachedInstantProgressSnapshot(active);
        if (cached?.snapshot) {
          setSnapshot((prev) => prev ?? cached.snapshot);
        }
        return;
      }

      const elapsed = Date.now() - mountedAtRef.current;
      if (elapsed >= GRACE_MS) {
        setConnectionState("fatal_missing");
      } else {
        setConnectionState("reconnecting");
        timer = setTimeout(tryResolveId, 2000);
      }
    };

    tryResolveId();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const scheduleRetry = (failures: number, terminal: boolean) => {
      if (cancelled || terminal) {
        return;
      }
      timer = setTimeout(() => void tick(), pollDelayMs(failures, false));
    };

    const maybeFatalNotFound = () => {
      const elapsed = Date.now() - mountedAtRef.current;
      const prior =
        Boolean(snapshotRef.current) || Boolean(readCachedInstantProgressSnapshot(projectId));
      if (
        prior ||
        hasRecoverableSnapshot(projectId, snapshotRef.current) ||
        transientFailuresRef.current < MAX_TRANSIENT_RETRIES ||
        elapsed < GRACE_MS
      ) {
        setConnectionState("reconnecting");
        setTransientMessage("connection_lost");
        scheduleRetry(transientFailuresRef.current, false);
        return;
      }
      setConnectionState("fatal_missing");
    };

    const tick = async () => {
      if (cancelled) {
        return;
      }

      const result = await fetchStatus(projectId);
      if (cancelled) {
        return;
      }

      if (result.kind === "ok") {
        applySnapshot(result.data);
        scheduleRetry(0, isTerminalSnapshot(result.data));
        return;
      }

      if (result.kind === "network") {
        transientFailuresRef.current += 1;
        const workerHint =
          workerJobStatusRef.current === "queued" || workerJobStatusRef.current === "running";
        setConnectionState(workerHint ? "worker_connecting" : "reconnecting");
        setTransientMessage(workerHint ? "worker_connecting" : "connection_lost");
        void tryDetailFallback(projectId);
        scheduleRetry(transientFailuresRef.current, false);
        return;
      }

      const { body, status } = result;

      if ("availability" in body && body.availability === "ok") {
        applySnapshot(body);
        scheduleRetry(0, isTerminalSnapshot(body));
        return;
      }

      if (body.availability === "not_found" && status === 404) {
        const fallback = await tryDetailFallback(projectId);
        if (fallback) {
          if (!isTerminalSnapshot(fallback)) {
            scheduleRetry(0, false);
          }
          return;
        }
        transientFailuresRef.current += 1;
        maybeFatalNotFound();
        return;
      }

      if (
        body.availability === "temporary_unavailable" ||
        body.availability === "worker_unreachable" ||
        status >= 500 ||
        status === 429 ||
        status === 503
      ) {
        transientFailuresRef.current += 1;
        const workerState =
          body.availability === "worker_unreachable" ||
          body.workerJobStatus === "queued" ||
          body.workerJobStatus === "running" ||
          workerJobStatusRef.current === "queued" ||
          workerJobStatusRef.current === "running";
        setConnectionState(workerState ? "worker_connecting" : "reconnecting");
        setTransientMessage(workerState ? "worker_connecting" : "connection_lost");
        void tryDetailFallback(projectId);
        scheduleRetry(transientFailuresRef.current, false);
        return;
      }

      transientFailuresRef.current += 1;
      setConnectionState("reconnecting");
      setTransientMessage("connection_lost");
      scheduleRetry(transientFailuresRef.current, false);
    };

    if (snapshotRef.current?.status !== "completed") {
      setConnectionState((prev) => (prev === "completed" ? "completed" : "polling"));
    }
    void tick();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [projectId, applySnapshot, tryDetailFallback]);

  const showFatalMissing =
    connectionState === "fatal_missing" && !hasRecoverableSnapshot(projectId, snapshot);

  return {
    projectId,
    snapshot,
    setSnapshot,
    connectionState,
    transientMessage,
    showFatalMissing,
    lastPolledAtMs,
    lastProgressChangeAtMs,
    refreshSnapshot: async () => {
      if (!projectId) {
        return;
      }
      const result = await fetchStatus(projectId);
      if (result.kind === "ok") {
        applySnapshot(result.data);
        return;
      }
      await tryDetailFallback(projectId);
    },
  };
}
