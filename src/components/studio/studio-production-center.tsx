"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  buildProductionCenterReport,
  formatProductionSummaryText,
} from "@/lib/studio-production-center";
import { formatCostEur } from "@/lib/studio-production-costs";
import type { ProductionProviderReport } from "@/lib/studio-production-providers";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { StudioExecutionPlanPanel } from "@/components/studio/studio-execution-plan-panel";
import { StudioProviderManagerPanel } from "@/components/studio/studio-provider-manager-panel";
import type { StudioStoryboardDetail } from "@/types/studio-api";

type Props = {
  storyboard: StudioStoryboardDetail;
  storyboardId: string;
  layout?: "page" | "embedded";
};

function assetIcon(level: string): string {
  if (level === "ready") {
    return "✓";
  }
  if (level === "attention") {
    return "⚠";
  }
  return "✗";
}

function severityClass(severity: string): string {
  if (severity === "blocking") {
    return "border-red-200 bg-red-50 text-red-900";
  }
  if (severity === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-950";
  }
  return "border-sky-100 bg-sky-50 text-sky-900";
}

function providerStatusClass(status: string): string {
  if (status === "connected") {
    return "text-emerald-700 bg-emerald-50";
  }
  if (status === "missing_api_key") {
    return "text-amber-800 bg-amber-50";
  }
  return "text-zinc-600 bg-zinc-100";
}

export function StudioProductionCenter({
  storyboard,
  storyboardId,
  layout = "embedded",
}: Props) {
  const t = useActiveTranslator();
  const [providers, setProviders] = useState<ProductionProviderReport | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/studio/production/provider-status", {
          credentials: "include",
          mode: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const json = (await res.json().catch(() => null)) as ProductionProviderReport | null;
        if (!cancelled && res.ok && json?.providers) {
          setProviders(json);
        }
      } catch {
        if (!cancelled) {
          setProviders(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const report = useMemo(
    () => buildProductionCenterReport({ storyboard, providers }),
    [storyboard, providers]
  );

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(formatProductionSummaryText(report.summary));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (storyboard.scenes.length === 0) {
    return (
      <p className="text-sm text-zinc-600">{t("studio.production.emptyScenes")}</p>
    );
  }

  const shellClass =
    layout === "page"
      ? "mx-auto max-w-4xl space-y-6"
      : "mb-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm space-y-5";

  return (
    <div className={shellClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-zinc-900">{t("studio.production.title")}</p>
          <p className="mt-1 text-sm text-zinc-600">{t("studio.production.hint")}</p>
        </div>
        {layout === "embedded" ?
          <Link
            href={`/studio/storyboards/${encodeURIComponent(storyboardId)}/production`}
            className="text-sm font-medium text-[#0067B1] underline"
          >
            {t("studio.production.openFull")}
          </Link>
        : null}
      </div>

      <div className="rounded-2xl border border-[#0067B1]/20 bg-gradient-to-br from-[#0067B1]/8 to-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-zinc-900">
            {t("studio.production.overallScore", {
              score: report.scores.overallProductionScore,
            })}
          </p>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#0067B1] shadow-sm">
            {t(report.scores.qualityLabelKey as TranslationKey)}
          </span>
        </div>
        <p className="mt-2 text-xs text-zinc-600">
          {t("studio.production.scoreBreakdown", {
            story: report.scores.storyScore,
            director: report.scores.directorScore,
            visual: report.scores.visualScore,
            voice: report.scores.voiceScore,
            readiness: report.scores.readinessScore,
          })}
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {t("studio.production.providersTitle")}
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {(providers?.providers ?? []).map((provider) => (
            <div
              key={provider.id}
              className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-sm"
            >
              <p className="font-medium text-zinc-800">
                {t(provider.labelKey as TranslationKey)}
              </p>
              <p
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${providerStatusClass(provider.status)}`}
              >
                {t(provider.statusLabelKey as TranslationKey)}
              </p>
            </div>
          ))}
          {!providers ?
            <p className="text-xs text-zinc-500 sm:col-span-3">
              {t("studio.production.providersLoading")}
            </p>
          : null}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {t("studio.production.assetReadiness")}
        </p>
        <ul className="mt-2 space-y-2">
          {report.assets.map((asset) => (
            <li
              key={asset.id}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-sm"
            >
              <span className="font-medium text-zinc-800">
                {assetIcon(asset.level)} {t(asset.labelKey as TranslationKey)}
              </span>
              {asset.detailKey ?
                <span className="text-xs text-zinc-600">
                  {t(asset.detailKey as TranslationKey)}
                </span>
              : null}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-100 p-3">
          <p className="text-xs font-semibold uppercase text-zinc-500">
            {t("studio.production.costTitle")}
          </p>
          <dl className="mt-2 space-y-1 text-sm text-zinc-700">
            <div className="flex justify-between">
              <dt>{t("studio.production.cost.images")}</dt>
              <dd>
                {report.costs.imageCount} · {formatCostEur(report.costs.imageCostEur)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>{t("studio.production.cost.voice")}</dt>
              <dd>
                {report.costs.elevenLabsVoiceEstimateLabel} ·{" "}
                {formatCostEur(report.costs.voiceCostEur)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>{t("studio.production.cost.video")}</dt>
              <dd>
                {report.costs.viduVideoEstimateLabel} · {formatCostEur(report.costs.videoCostEur)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-zinc-100 pt-2 font-semibold">
              <dt>{t("studio.production.cost.total")}</dt>
              <dd>{formatCostEur(report.costs.totalCostEur)}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-xl border border-zinc-100 p-3">
          <p className="text-xs font-semibold uppercase text-zinc-500">
            {t("studio.production.checklistTitle")}
          </p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {report.checklist.map((item) => (
              <li key={item.id} className={item.passed ? "text-emerald-800" : "text-zinc-500"}>
                {item.passed ? "✓" : "○"} {t(item.labelKey as TranslationKey)}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <StudioExecutionPlanPanel storyboard={storyboard} />
      <StudioProviderManagerPanel />

      {report.warnings.length > 0 ?
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.production.warningsTitle")}
          </p>
          <ul className="mt-2 space-y-2">
            {report.warnings.map((warning, index) => (
              <li
                key={`${warning.code}-${index}`}
                className={`rounded-xl border px-3 py-2 text-xs ${severityClass(warning.severity)}`}
              >
                <span className="font-semibold uppercase">{warning.severity}</span> —{" "}
                {t(warning.messageKey as TranslationKey, warning.params)}
              </li>
            ))}
          </ul>
        </div>
      : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleCopySummary()}
          className="rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white"
        >
          {copied ? t("studio.production.copied") : t("studio.production.copySummary")}
        </button>
      </div>
    </div>
  );
}
