"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchStudioAccountJson,
  invalidateStudioAccountCache,
} from "@/lib/studio-account-client";
import type { StudioAccountOverview } from "@/types/studio-account";

export type StudioWalletSummary = {
  availableCredits: number;
  balance: number;
  plan: string;
  billingStatus: string;
  loading: boolean;
  resolved: boolean;
  refresh: () => Promise<void>;
};

export function useStudioWalletSummary(enabled = true): StudioWalletSummary {
  const [overview, setOverview] = useState<StudioAccountOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [resolved, setResolved] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      return;
    }
    setLoading(true);
    try {
      const data = await fetchStudioAccountJson({ view: "summary" });
      if (!data) {
        return;
      }
      setOverview({
        account: data.account,
        wallet: data.wallet,
        recentLedger: data.recentLedger ?? [],
      });
    } finally {
      setLoading(false);
      setResolved(true);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      queueMicrotask(() => setResolved(true));
      return;
    }
    queueMicrotask(() => {
      void refresh();
    });
  }, [enabled, refresh]);

  const forceRefresh = useCallback(async () => {
    invalidateStudioAccountCache();
    await refresh();
  }, [refresh]);

  return {
    availableCredits: overview?.wallet.availableBalance ?? 0,
    balance: overview?.wallet.balance ?? 0,
    plan: overview?.account.studioPlan ?? "free",
    billingStatus: overview?.account.billingStatus ?? "none",
    loading,
    resolved,
    refresh: forceRefresh,
  };
}
