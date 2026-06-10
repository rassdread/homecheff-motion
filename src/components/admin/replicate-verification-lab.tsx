"use client";

import { useCallback, useEffect, useState } from "react";
import { AppCard } from "@/components/ui/app-card";
import { ClientFormattedDateTime } from "@/components/ui/client-formatted-datetime";
import { useActiveTranslator } from "@/i18n/client";

const PROMPT_EXAMPLES = [
  "globe",
  "logo",
  "person",
  "face",
  "background",
  "clothes",
  "shoe",
  "plant",
  "food",
] as const;

const SAM3_MODEL = "yodagg/sam3-image-seg";

type StatusResponse = {
  ok: boolean;
  configured: boolean;
  message: string | null;
  billingAvailable: boolean;
  billingError?: string | null;
  modelReachable: boolean;
  modelError?: string | null;
  model: string;
  modelVersion?: string | null;
  lastTestRuntimeMs: number | null;
  lastTestAt: string | null;
  lastPredictionId: string | null;
  checkedAt?: string;
};

type RunResult = {
  model: string;
  predictionId: string;
  prompt: string;
  status: string;
  runtimeMs: number;
  estimatedCostUsd: number;
  confidence: number | null;
  maskUrl: string | null;
  overlayUrl: string | null;
  boundingBox: number[] | null;
  polygons: number[][][] | null;
  allScores: number[];
  allBoxes: number[][];
  allPolygons: number[][][][];
  imageWidth: number | null;
  imageHeight: number | null;
  responseSizeBytes: number;
};

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
      }`}
    >
      {label}
    </span>
  );
}

export function ReplicateVerificationLab() {
  const t = useActiveTranslator();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("person");
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);
  const [rawOpen, setRawOpen] = useState(false);
  const [rawJson, setRawJson] = useState<unknown>(null);

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/admin/ai-lab/replicate/status", {
      credentials: "include",
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as StatusResponse;
    setStatus(body);
    return body;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setStatusLoading(true);
      try {
        await loadStatus();
      } finally {
        if (!cancelled) {
          setStatusLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadStatus]);

  const canRun = Boolean(status?.configured && imageFile && prompt.trim() && !running);

  const polygonJson = result?.polygons
    ? JSON.stringify(result.polygons, null, 2)
    : "[]";

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setImageFile(file);
    setResult(null);
    setRunError("");
    setRawJson(null);
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(typeof reader.result === "string" ? reader.result : null);
    };
    reader.readAsDataURL(file);
  };

  const onRun = async () => {
    if (!imageFile || !canRun) {
      return;
    }
    setRunning(true);
    setRunError("");
    setResult(null);
    setRawJson(null);

    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("prompt", prompt.trim());

    try {
      const res = await fetch("/api/admin/ai-lab/replicate/run", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        result?: RunResult;
        raw?: unknown;
      };

      if (!res.ok || !body.ok || !body.result) {
        setRunError(body.error ?? t("admin.aiLab.replicate.runFailed"));
        return;
      }

      setResult(body.result);
      setRawJson(body.raw ?? body.result);
      await loadStatus();
    } catch {
      setRunError(t("admin.aiLab.replicate.runFailed"));
    } finally {
      setRunning(false);
    }
  };

  if (!statusLoading && status && !status.configured) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-zinc-900">{t("admin.aiLab.replicate.title")}</h1>
          <p className="mt-2 text-sm text-zinc-600">{t("admin.aiLab.replicate.intro")}</p>
        </header>
        <AppCard>
          <p className="text-sm font-medium text-amber-900">{t("admin.aiLab.replicate.notConfigured")}</p>
          <p className="mt-2 text-sm text-zinc-600">{t("admin.aiLab.replicate.notConfiguredHint")}</p>
        </AppCard>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900">{t("admin.aiLab.replicate.title")}</h1>
        <p className="mt-2 text-sm text-zinc-600">{t("admin.aiLab.replicate.intro")}</p>
      </header>

      <AppCard>
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">
          {t("admin.aiLab.replicate.connectionTitle")}
        </h2>
        {statusLoading ? (
          <p className="text-sm text-zinc-500">{t("admin.aiLab.replicate.loading")}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3 py-2">
              <span className="text-sm text-zinc-700">{t("admin.aiLab.replicate.configured")}</span>
              <StatusBadge
                ok={Boolean(status?.configured)}
                label={
                  status?.configured
                    ? t("admin.aiLab.replicate.badgeOk")
                    : t("admin.aiLab.replicate.badgeFail")
                }
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3 py-2">
              <span className="text-sm text-zinc-700">{t("admin.aiLab.replicate.billing")}</span>
              <StatusBadge
                ok={Boolean(status?.billingAvailable)}
                label={
                  status?.billingAvailable
                    ? t("admin.aiLab.replicate.badgeOk")
                    : t("admin.aiLab.replicate.badgeFail")
                }
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3 py-2">
              <span className="text-sm text-zinc-700">{t("admin.aiLab.replicate.modelReachable")}</span>
              <StatusBadge
                ok={Boolean(status?.modelReachable)}
                label={
                  status?.modelReachable
                    ? t("admin.aiLab.replicate.badgeOk")
                    : t("admin.aiLab.replicate.badgeFail")
                }
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3 py-2">
              <span className="text-sm text-zinc-700">{t("admin.aiLab.replicate.lastRuntime")}</span>
              <span className="text-sm font-medium text-zinc-900">
                {status?.lastTestRuntimeMs != null
                  ? `${status.lastTestRuntimeMs} ms`
                  : t("admin.aiLab.replicate.none")}
              </span>
            </div>
          </div>
        )}
        {status?.lastTestAt ? (
          <p className="mt-3 text-xs text-zinc-500">
            {t("admin.aiLab.replicate.lastTestAt")}{" "}
            <ClientFormattedDateTime iso={status.lastTestAt} />
          </p>
        ) : null}
      </AppCard>

      <AppCard>
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">
          {t("admin.aiLab.replicate.uploadTitle")}
        </h2>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onFileChange}
          className="block w-full text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-emerald-800"
        />
        <p className="mt-2 text-xs text-zinc-500">{t("admin.aiLab.replicate.uploadHint")}</p>
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={t("admin.aiLab.replicate.previewAlt")}
            className="mt-4 max-h-64 rounded-lg border border-zinc-200 object-contain"
          />
        ) : null}
      </AppCard>

      <AppCard>
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">
          {t("admin.aiLab.replicate.promptTitle")}
        </h2>
        <input
          type="text"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          placeholder={t("admin.aiLab.replicate.promptPlaceholder")}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {PROMPT_EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setPrompt(example)}
              className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-700 hover:border-emerald-300 hover:bg-emerald-50"
            >
              {example}
            </button>
          ))}
        </div>
      </AppCard>

      <AppCard>
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">
          {t("admin.aiLab.replicate.modelTitle")}
        </h2>
        <p className="font-mono text-sm text-zinc-800">{SAM3_MODEL}</p>
        {status?.modelVersion ? (
          <p className="mt-1 truncate font-mono text-xs text-zinc-500">{status.modelVersion}</p>
        ) : null}
      </AppCard>

      <div>
        <button
          type="button"
          disabled={!canRun}
          onClick={() => void onRun()}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running ? t("admin.aiLab.replicate.running") : t("admin.aiLab.replicate.runTest")}
        </button>
        {runError ? <p className="mt-3 text-sm text-red-700">{runError}</p> : null}
      </div>

      {result ? (
        <AppCard>
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">
            {t("admin.aiLab.replicate.resultsTitle")}
          </h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-zinc-800">{t("admin.aiLab.replicate.mask")}</h3>
              {result.maskUrl ? (
                <img
                  src={result.maskUrl}
                  alt={t("admin.aiLab.replicate.mask")}
                  className="mt-2 max-h-64 rounded-lg border border-zinc-200 object-contain"
                />
              ) : (
                <p className="mt-2 text-sm text-zinc-500">{t("admin.aiLab.replicate.noMask")}</p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-zinc-800">{t("admin.aiLab.replicate.overlay")}</h3>
              {result.overlayUrl ? (
                <img
                  src={result.overlayUrl}
                  alt={t("admin.aiLab.replicate.overlay")}
                  className="mt-2 max-h-64 rounded-lg border border-zinc-200 object-contain"
                />
              ) : (
                <p className="mt-2 text-sm text-zinc-500">{t("admin.aiLab.replicate.noOverlay")}</p>
              )}
            </div>
          </div>

          <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-zinc-500">{t("admin.aiLab.replicate.confidence")}</dt>
              <dd className="text-sm font-medium text-zinc-900">
                {result.confidence != null ? result.confidence.toFixed(4) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">{t("admin.aiLab.replicate.runtime")}</dt>
              <dd className="text-sm font-medium text-zinc-900">{result.runtimeMs} ms</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">{t("admin.aiLab.replicate.estimatedCost")}</dt>
              <dd className="text-sm font-medium text-zinc-900">
                ${result.estimatedCostUsd.toFixed(3)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">{t("admin.aiLab.replicate.boundingBox")}</dt>
              <dd className="font-mono text-xs text-zinc-800">
                {result.boundingBox ? JSON.stringify(result.boundingBox) : "—"}
              </dd>
            </div>
          </dl>

          <div className="mt-6">
            <h3 className="text-sm font-medium text-zinc-800">{t("admin.aiLab.replicate.polygonJson")}</h3>
            <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-zinc-50 p-3 text-xs text-zinc-800">
              {polygonJson}
            </pre>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => setRawOpen((open) => !open)}
              className="text-sm font-medium text-emerald-800 underline"
            >
              {rawOpen ? t("admin.aiLab.replicate.hideRaw") : t("admin.aiLab.replicate.showRaw")}
            </button>
            {rawOpen && rawJson ? (
              <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-zinc-50 p-3 text-xs text-zinc-800">
                {JSON.stringify(rawJson, null, 2)}
              </pre>
            ) : null}
          </div>
        </AppCard>
      ) : null}

      {result ? (
        <AppCard>
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">
            {t("admin.aiLab.replicate.debugTitle")}
          </h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-zinc-500">{t("admin.aiLab.replicate.debugModel")}</dt>
              <dd className="font-mono text-sm text-zinc-900">{result.model}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">{t("admin.aiLab.replicate.debugPredictionId")}</dt>
              <dd className="font-mono text-xs text-zinc-900">{result.predictionId}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">{t("admin.aiLab.replicate.debugExecutionTime")}</dt>
              <dd className="text-sm text-zinc-900">{result.runtimeMs} ms</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">{t("admin.aiLab.replicate.debugStatus")}</dt>
              <dd className="text-sm text-zinc-900">{result.status}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">{t("admin.aiLab.replicate.debugResponseSize")}</dt>
              <dd className="text-sm text-zinc-900">{result.responseSizeBytes} bytes</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">{t("admin.aiLab.replicate.debugImageSize")}</dt>
              <dd className="text-sm text-zinc-900">
                {result.imageWidth ?? "—"} × {result.imageHeight ?? "—"}
              </dd>
            </div>
          </dl>
        </AppCard>
      ) : null}
    </div>
  );
}
