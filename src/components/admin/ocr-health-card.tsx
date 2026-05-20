"use client";

import { useCallback, useEffect, useState } from "react";
import { AppCard } from "@/components/ui/app-card";
import { getActiveTranslator } from "@/i18n";

type OcrHealthResponse = {
  ok: boolean;
  provider: "openai" | "google" | "none";
  hasOpenAiKey: boolean;
  model: string | null;
  errors: string[];
  checkOk?: boolean;
  checkErrorCode?: string;
};

export function OcrHealthCard() {
  const t = getActiveTranslator();
  const [data, setData] = useState<OcrHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const load = useCallback(async (runCheck: boolean) => {
    const url = runCheck
      ? "/api/admin/video/ocr-health?check=1"
      : "/api/admin/video/ocr-health";
    const res = await fetch(url, { credentials: "include", cache: "no-store" });
    const body = (await res.json().catch(() => ({}))) as OcrHealthResponse;
    setData(body);
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

  async function onRunCheck() {
    setChecking(true);
    try {
      await load(true);
    } finally {
      setChecking(false);
    }
  }

  const statusLabel = loading
    ? t("admin.ocrHealth.statusLoading")
    : data?.ok
      ? t("admin.ocrHealth.statusOk")
      : t("admin.ocrHealth.statusError");

  const providerLabel =
    data?.provider === "openai"
      ? "OpenAI Vision"
      : data?.provider === "google"
        ? "Google Vision"
        : t("admin.ocrHealth.providerNone");

  return (
    <AppCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">{t("admin.ocrHealth.title")}</h2>
        <button
          type="button"
          onClick={() => void onRunCheck()}
          disabled={loading || checking}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 disabled:opacity-60"
        >
          {checking ? t("admin.ocrHealth.checking") : t("admin.ocrHealth.runCheck")}
        </button>
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">{t("admin.ocrHealth.provider")}</dt>
          <dd className="font-medium text-zinc-900">{loading ? "…" : providerLabel}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">{t("admin.ocrHealth.openAiKey")}</dt>
          <dd className="font-medium text-zinc-900">
            {loading
              ? "…"
              : data?.hasOpenAiKey
                ? t("admin.ocrHealth.keyPresent")
                : t("admin.ocrHealth.keyMissing")}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">{t("admin.ocrHealth.model")}</dt>
          <dd className="font-medium text-zinc-900">{loading ? "…" : (data?.model ?? "—")}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">{t("admin.ocrHealth.status")}</dt>
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
        <div className="mt-3 space-y-1">
          <p className="text-sm font-medium text-amber-900">{t("admin.ocrHealth.warningTitle")}</p>
          {data.errors.map((err) => (
            <p key={err} className="text-sm text-red-700">
              {err}
            </p>
          ))}
        </div>
      ) : null}
      {data?.checkOk === false && data.checkErrorCode ? (
        <p className="mt-2 text-sm text-red-700">
          {t("admin.ocrHealth.checkFailed", { code: data.checkErrorCode })}
        </p>
      ) : null}
    </AppCard>
  );
}
