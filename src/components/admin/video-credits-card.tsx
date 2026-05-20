"use client";

import { useCallback, useEffect, useState } from "react";
import { AppCard } from "@/components/ui/app-card";
import { ClientFormattedDateTime } from "@/components/ui/client-formatted-datetime";
import { useActiveTranslator, useLocale } from "@/i18n/client";

type CreditBalance = {
  ok: boolean;
  credits?: number;
  error?: string;
  checkedAt: string;
};

export function VideoCreditsCard() {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const numberLocale = locale === "nl" ? "nl-NL" : "en-US";
  const [data, setData] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (refresh: boolean) => {
      const url = refresh ? "/api/admin/video/credits?refresh=1" : "/api/admin/video/credits";
      const res = await fetch(url, { credentials: "include", cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as CreditBalance;
      setData(body);
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        await load(false);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load(true);
    } finally {
      setRefreshing(false);
    }
  }

  const statusLabel = loading
    ? t("admin.videoCredits.statusLoading")
    : data?.ok
      ? t("admin.videoCredits.statusOk")
      : t("admin.videoCredits.statusError");

  const creditsDisplay =
    loading && !data
      ? "…"
      : data?.ok && data.credits !== undefined
        ? data.credits.toLocaleString(numberLocale)
        : t("admin.videoCredits.creditsUnavailable");

  return (
    <AppCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">{t("admin.videoCredits.title")}</h2>
        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={loading || refreshing}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 disabled:opacity-60"
        >
          {refreshing ? t("admin.videoCredits.refreshing") : t("admin.videoCredits.refresh")}
        </button>
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">{t("admin.videoCredits.provider")}</dt>
          <dd className="font-medium text-zinc-900">Vidu</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">{t("admin.videoCredits.remaining")}</dt>
          <dd className="font-medium text-zinc-900">{creditsDisplay}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">{t("admin.videoCredits.lastChecked")}</dt>
          <dd className="font-medium text-zinc-900">
            {data?.checkedAt && !loading ? (
              <ClientFormattedDateTime iso={data.checkedAt} />
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">{t("admin.videoCredits.status")}</dt>
          <dd
            className={
              data?.ok
                ? "font-medium text-emerald-700"
                : loading
                  ? "font-medium text-zinc-600"
                  : "font-medium text-red-700"
            }
          >
            {statusLabel}
          </dd>
        </div>
      </dl>
      {!loading && data && !data.ok ? (
        <p className="mt-3 text-sm text-red-700">
          {t("admin.videoCredits.fetchError")}
        </p>
      ) : null}
    </AppCard>
  );
}
