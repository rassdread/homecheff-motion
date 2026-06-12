"use client";

import { useCallback, useEffect, useState } from "react";
import { AppCard } from "@/components/ui/app-card";
import { ClientFormattedDateTime } from "@/components/ui/client-formatted-datetime";
import { useActiveTranslator } from "@/i18n/client";

type OcrHealthResponse = {
  ok: boolean;
  provider: "openai" | "google" | "none";
  hasOpenAiKey: boolean;
  hasGoogleKey?: boolean;
  model: string | null;
  errors: string[];
  checkedAt?: string;
  checkOk?: boolean;
  checkErrorCode?: string;
  statusReason?: string;
};

function StatusSpinner() {
  return (
    <span
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-300 border-t-emerald-600"
      aria-hidden
    />
  );
}

export function OcrHealthCard() {
  const t = useActiveTranslator();
  const [data, setData] = useState<OcrHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checking, setChecking] = useState(false);

  const load = useCallback(async (runCheck: boolean) => {
    const url = runCheck
      ? "/api/admin/video/ocr-health?check=1"
      : "/api/admin/video/ocr-health";
    const res = await fetch(url, { credentials: "include", cache: "no-store" });
    const body = (await res.json().catch(() => ({}))) as OcrHealthResponse;
    setData(body);
    return body;
  }, []);

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
      await load(false);
    } finally {
      setRefreshing(false);
    }
  }

  async function onRunCheck() {
    setChecking(true);
    try {
      await load(true);
    } finally {
      setChecking(false);
    }
  }

  const busy = loading || refreshing || checking;
  const isHealthy = Boolean(data?.ok) && data?.checkOk !== false;
  const showCheckingMessage = checking || (loading && !data);

  const providerLabel =
    data?.provider === "openai"
      ? "OpenAI Vision"
      : data?.provider === "google"
        ? "Google Vision"
        : t("admin.ocrHealth.providerNone");

  const apiStatusLabel = showCheckingMessage
    ? t("admin.ocrHealth.apiChecking")
    : isHealthy
      ? t("admin.ocrHealth.operational")
      : data?.checkOk === false
        ? t("admin.ocrHealth.apiError")
        : data?.ok
          ? t("admin.ocrHealth.apiConfigured")
          : t("admin.ocrHealth.apiError");

  const openAiLabel = loading
    ? "…"
    : data?.hasOpenAiKey
      ? t("admin.ocrHealth.yes")
      : t("admin.ocrHealth.no");

  return (
    <AppCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">{t("admin.ocrHealth.title")}</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={busy}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 disabled:opacity-60"
          >
            {refreshing ? t("admin.ocrHealth.refreshing") : t("admin.ocrHealth.refresh")}
          </button>
          <button
            type="button"
            onClick={() => void onRunCheck()}
            disabled={busy}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900 disabled:opacity-60"
          >
            {checking ? t("admin.ocrHealth.checking") : t("admin.ocrHealth.runCheck")}
          </button>
        </div>
      </div>

      {showCheckingMessage ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-zinc-600">
          <StatusSpinner />
          {t("admin.ocrHealth.apiChecking")}
        </p>
      ) : null}

      {data?.statusReason && !loading ?
        <p className="mt-3 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-700">{data.statusReason}</p>
      : null}

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">{t("admin.ocrHealth.provider")}</dt>
          <dd className="font-medium text-zinc-900">{loading && !data ? "…" : providerLabel}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">{t("admin.ocrHealth.apiStatus")}</dt>
          <dd
            className={
              isHealthy && !showCheckingMessage
                ? "font-medium text-emerald-700"
                : showCheckingMessage
                  ? "font-medium text-zinc-600"
                  : data?.ok
                    ? "font-medium text-amber-800"
                    : "font-medium text-red-700"
            }
          >
            {loading && !data ? "…" : apiStatusLabel}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">{t("admin.ocrHealth.openAiConfigured")}</dt>
          <dd className="font-medium text-zinc-900">{openAiLabel}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">{t("admin.ocrHealth.model")}</dt>
          <dd className="font-medium text-zinc-900">{loading && !data ? "…" : (data?.model ?? "—")}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">{t("admin.ocrHealth.lastChecked")}</dt>
          <dd className="font-medium text-zinc-900">
            {data?.checkedAt && !loading ? (
              <ClientFormattedDateTime iso={data.checkedAt} />
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">{t("admin.ocrHealth.status")}</dt>
          <dd
            className={
              isHealthy && !showCheckingMessage
                ? "font-medium text-emerald-700"
                : loading
                  ? "font-medium text-zinc-600"
                  : "font-medium text-red-700"
            }
          >
            {loading && !data
              ? t("admin.ocrHealth.statusLoading")
              : isHealthy
                ? t("admin.ocrHealth.operational")
                : t("admin.ocrHealth.statusError")}
          </dd>
        </div>
      </dl>

      {!loading && data && !isHealthy ? (
        <div className="mt-3 space-y-1 rounded-lg border border-amber-200 bg-amber-50/80 p-3">
          <p className="text-sm font-medium text-amber-950">{t("admin.ocrHealth.warningTitle")}</p>
          {(data.errors.length > 0 ? data.errors : [t("admin.ocrHealth.statusError")]).map((err) => (
            <p key={err} className="text-sm text-red-800">
              {err}
            </p>
          ))}
          {data.checkOk === false && data.checkErrorCode ? (
            <p className="text-xs text-red-700">
              {t("admin.ocrHealth.checkFailed", { code: data.checkErrorCode })}
            </p>
          ) : null}
        </div>
      ) : null}
    </AppCard>
  );
}
