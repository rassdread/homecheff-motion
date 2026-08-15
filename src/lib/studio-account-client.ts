/**
 * Client-only: dedupe concurrent `/api/me/studio-account` fetches and cache briefly
 * so AppShell credit widgets + assistant + conversion surfaces share one round-trip.
 *
 * Mirrors `auth-session-client.ts` (no new state-management dependency).
 */

import type { StudioAccountOverview } from "@/types/studio-account";

export type StudioAccountApiPayload = StudioAccountOverview & { ok?: boolean };

const CACHE_MS = 5000;

type CacheBucket = {
  at: number;
  data: StudioAccountApiPayload;
};

let inflightFull: Promise<StudioAccountApiPayload | null> | null = null;
let inflightSummary: Promise<StudioAccountApiPayload | null> | null = null;
let cacheFull: CacheBucket | null = null;
let cacheSummary: CacheBucket | null = null;

export function invalidateStudioAccountCache(): void {
  cacheFull = null;
  cacheSummary = null;
  inflightFull = null;
  inflightSummary = null;
}

async function fetchStudioAccountOnce(
  view: "full" | "summary"
): Promise<StudioAccountApiPayload | null> {
  const qs = view === "summary" ? "?view=summary" : "";
  const res = await fetch(`/api/me/studio-account${qs}`, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    return null;
  }
  const data = (await res.json()) as StudioAccountApiPayload;
  return {
    account: data.account,
    wallet: data.wallet,
    recentLedger: data.recentLedger ?? [],
    ok: data.ok,
  };
}

/**
 * @param view `summary` skips recent ledger on the server (shell/wallet bootstrap).
 * @param force bypass short TTL cache (after billing mutations).
 */
export async function fetchStudioAccountJson(options?: {
  force?: boolean;
  view?: "full" | "summary";
}): Promise<StudioAccountApiPayload | null> {
  const force = options?.force ?? false;
  const view = options?.view ?? "full";
  const now = Date.now();

  if (view === "summary") {
    // Prefer a fresh full cache if present (superset).
    if (!force && cacheFull && now - cacheFull.at < CACHE_MS) {
      return cacheFull.data;
    }
    if (!force && cacheSummary && now - cacheSummary.at < CACHE_MS) {
      return cacheSummary.data;
    }
    if (inflightSummary) {
      return inflightSummary;
    }
    if (inflightFull) {
      return inflightFull;
    }
    inflightSummary = (async () => {
      const data = await fetchStudioAccountOnce("summary");
      if (data) {
        cacheSummary = { at: Date.now(), data };
      }
      return data;
    })();
    try {
      return await inflightSummary;
    } finally {
      inflightSummary = null;
    }
  }

  if (!force && cacheFull && now - cacheFull.at < CACHE_MS) {
    return cacheFull.data;
  }
  if (inflightFull) {
    return inflightFull;
  }
  inflightFull = (async () => {
    const data = await fetchStudioAccountOnce("full");
    if (data) {
      cacheFull = { at: Date.now(), data };
      // Summary consumers can reuse full payload.
      cacheSummary = cacheFull;
    }
    return data;
  })();
  try {
    return await inflightFull;
  } finally {
    inflightFull = null;
  }
}
