"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/i18n/client";

type WalletSummary = {
  identityResolved: boolean;
  walletExists: boolean;
  walletResolved: boolean;
  availableHc: number;
  reservedHc: number;
  walletStatus: string | null;
};

type Props = {
  variant?: "default" | "compact";
};

export function HomecheffHcWalletPill({ variant = "default" }: Props) {
  const [locale] = useLocale();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/me/hc-wallet", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`wallet_http_${res.status}`);
        const data = (await res.json()) as WalletSummary;
        if (cancelled) return;
        setSummary(data);
        setError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setSummary(null);
        setError(true);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const label = locale === "nl" ? "HC-tegoed" : "HC balance";
  const unavailableLabel =
    locale === "nl" ? "HC-tegoed tijdelijk niet beschikbaar" : "HC balance temporarily unavailable";

  const state = useMemo(() => {
    if (loading) return { value: "—", aria: `${label}: loading`, unavailable: false };
    if (error) return { value: "—", aria: unavailableLabel, unavailable: true };
    if (!summary?.identityResolved) return { value: "—", aria: `${label}: identity unresolved`, unavailable: true };
    if (!summary.walletResolved) return { value: "—", aria: unavailableLabel, unavailable: true };
    return {
      value: `${summary.availableHc.toLocaleString(locale)} HC`,
      aria: `${label}: ${summary.availableHc.toLocaleString(locale)} HC`,
      unavailable: false,
    };
  }, [error, label, loading, locale, summary, unavailableLabel]);

  const classes =
    variant === "compact"
      ? "inline-flex min-h-[36px] items-center rounded-lg border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-white/10"
      : "hidden min-h-[40px] items-center rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 lg:inline-flex";

  return (
    <Link href="/account/wallet" prefetch={false} className={classes} aria-label={state.aria} title={label}>
      {loading ? (
        <span className="inline-flex h-3.5 w-14 animate-pulse rounded bg-white/20" aria-hidden />
      ) : (
        <span className="whitespace-nowrap">{state.unavailable ? label : state.value}</span>
      )}
    </Link>
  );
}
