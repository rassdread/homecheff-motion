"use client";

import { useEffect, useMemo, useRef } from "react";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useStudioWalletSummary } from "@/hooks/use-studio-wallet-summary";
import {
  resolveConversionSurface,
  resolveUsageLevel,
} from "@/lib/conversion-surface-engine";
import { trackBillingConversionEvent } from "@/lib/billing-conversion-analytics";
import type { ConversionPageType, ConversionSurfaceInput } from "@/types/conversion-surface";

export function useConversionSurface(
  pageType: ConversionPageType,
  options?: {
    estimatedCredits?: number;
    creditsUsedThisMonth?: number;
    trackImpression?: boolean;
  }
) {
  const session = useAuthSession();
  const wallet = useStudioWalletSummary(Boolean(session.user));
  const impressedRef = useRef(false);

  const input: ConversionSurfaceInput = useMemo(
    () => {
      const spendable =
        wallet.canonicalSpendable != null
          ? wallet.canonicalSpendable
          : wallet.availableCredits;
      return {
        currentPlan: wallet.plan,
        availableCredits: spendable,
        pageType,
        loggedIn: Boolean(session.user),
        usageLevel: resolveUsageLevel(spendable),
        estimatedCredits: options?.estimatedCredits,
        creditsUsedThisMonth: options?.creditsUsedThisMonth,
      };
    },
    [
      wallet.plan,
      wallet.canonicalSpendable,
      wallet.availableCredits,
      pageType,
      session.user,
      options?.estimatedCredits,
      options?.creditsUsedThisMonth,
    ]
  );

  const surface = useMemo(() => resolveConversionSurface(input), [input]);

  useEffect(() => {
    if (options?.trackImpression === false || impressedRef.current) {
      return;
    }
    if (!session.resolved) {
      return;
    }
    impressedRef.current = true;
    const spendable =
      wallet.canonicalSpendable != null
        ? wallet.canonicalSpendable
        : wallet.availableCredits;
    trackBillingConversionEvent("conversion_surface_impression", {
      source: pageType,
      availableCredits: spendable,
      planId: wallet.plan,
    });
  }, [
    options?.trackImpression,
    pageType,
    session.resolved,
    wallet.canonicalSpendable,
    wallet.availableCredits,
    wallet.plan,
  ]);

  return {
    surface,
    input,
    wallet,
    session,
    loading: !session.resolved || (Boolean(session.user) && !wallet.resolved),
  };
}
