"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchStudioAccountJson,
  invalidateStudioAccountCache,
} from "@/lib/studio-account-client";
import {
  resolveCanonicalFromOverview,
  type CanonicalSpendableBalance,
} from "@/lib/studio-canonical-balance";
import type { StudioAccountOverview } from "@/types/studio-account";

export type StudioWalletSummary = {
  /** @deprecated Prefer `canonicalSpendable` — legacy StudioWallet only. */
  availableCredits: number;
  balance: number;
  plan: string;
  billingStatus: string;
  centralHcAvailable: number;
  centralHcReserved: number;
  centralHcStatus: string | null;
  centralHcIdentityResolved: boolean;
  centralHcWalletResolved: boolean;
  /** Primary customer-facing spendable (HC when central resolved). */
  canonicalSpendable: number | null;
  canonicalReserved: number;
  canonicalUnit: "HC" | "credits";
  canonicalSource: CanonicalSpendableBalance["source"];
  canonical: CanonicalSpendableBalance;
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
      const next: StudioAccountOverview = {
        account: data.account,
        wallet: data.wallet,
        recentLedger: data.recentLedger ?? [],
        centralHc: data.centralHc ?? null,
        canonicalBalance:
          data.canonicalBalance ??
          resolveCanonicalFromOverview({
            wallet: data.wallet,
            centralHc: data.centralHc ?? null,
          }),
      };
      setOverview(next);
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

  const canonical = useMemo((): CanonicalSpendableBalance => {
    if (overview?.canonicalBalance) {
      return overview.canonicalBalance;
    }
    if (overview) {
      return resolveCanonicalFromOverview({
        wallet: overview.wallet,
        centralHc: overview.centralHc ?? null,
      });
    }
    return resolveCanonicalFromOverview({
      wallet: {
        availableBalance: 0,
        reservedBalance: 0,
      },
      centralHc: null,
    });
  }, [overview]);

  return {
    availableCredits: overview?.wallet.availableBalance ?? 0,
    balance: overview?.wallet.balance ?? 0,
    plan: overview?.account.studioPlan ?? "free",
    billingStatus: overview?.account.billingStatus ?? "none",
    centralHcAvailable: overview?.centralHc?.availableHc ?? 0,
    centralHcReserved: overview?.centralHc?.reservedHc ?? 0,
    centralHcStatus: overview?.centralHc?.walletStatus ?? null,
    centralHcIdentityResolved: overview?.centralHc?.identityResolved ?? false,
    centralHcWalletResolved: overview?.centralHc?.walletResolved ?? false,
    canonicalSpendable: canonical.spendable,
    canonicalReserved: canonical.reserved,
    canonicalUnit: canonical.unit,
    canonicalSource: canonical.source,
    canonical,
    loading,
    resolved,
    refresh: forceRefresh,
  };
}
