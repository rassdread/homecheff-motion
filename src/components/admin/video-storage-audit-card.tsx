"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppCard } from "@/components/ui/app-card";
import { formatStorageBytes } from "@/lib/format-storage-bytes";
import type { AdminStorageAuditSummary } from "@/types/storage-audit";
import { useActiveTranslator, useLocale } from "@/i18n/client";

type DryRunSummary = {
  candidateCount: number;
  bytesRecoverable: number;
};

export function VideoStorageAuditCard() {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const [summary, setSummary] = useState<AdminStorageAuditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dryRunLoading, setDryRunLoading] = useState(false);
  const [dryRun, setDryRun] = useState<DryRunSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/video/storage-audit", {
      credentials: "include",
      cache: "no-store",
    });
    const body = (await res.json().catch(() => null)) as {
      ok?: boolean;
      summary?: AdminStorageAuditSummary;
      error?: string;
    } | null;
    if (!res.ok || !body?.summary) {
      throw new Error(body?.error ?? `HTTP ${res.status}`);
    }
    setSummary(body.summary);
    setError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        await load();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Storage audit failed");
        }
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
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Storage audit failed");
    } finally {
      setRefreshing(false);
    }
  }

  async function onDryRun() {
    setDryRunLoading(true);
    try {
      const res = await fetch("/api/admin/video/storage-cleanup-dry-run", {
        method: "POST",
        credentials: "include",
      });
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        candidateCount?: number;
        bytesRecoverable?: number;
        error?: string;
      } | null;
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      setDryRun({
        candidateCount: body.candidateCount ?? 0,
        bytesRecoverable: body.bytesRecoverable ?? 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dry run failed");
    } finally {
      setDryRunLoading(false);
    }
  }

  return (
    <AppCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">{t("admin.storageAudit.title")}</h2>
          <p className="mt-1 text-sm text-zinc-600">{t("admin.storageAudit.intro")}</p>
        </div>
        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={loading || refreshing}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 disabled:opacity-60"
        >
          {refreshing ? t("admin.storageAudit.refreshing") : t("admin.storageAudit.refresh")}
        </button>
      </div>

      {loading && !summary ?
        <p className="mt-4 text-sm text-zinc-600">{t("admin.storageAudit.loading")}</p>
      : null}
      {error ?
        <p className="mt-4 text-sm text-red-700">{error}</p>
      : null}

      {summary ?
        <>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <Metric
              label={t("admin.storageAudit.totalVideoStorage")}
              value={formatStorageBytes(summary.totalVideoStorageBytes, locale)}
            />
            <Metric
              label={t("admin.storageAudit.totalCleanVideos")}
              value={formatStorageBytes(summary.totalCleanVideoBytes, locale)}
            />
            <Metric
              label={t("admin.storageAudit.totalLanguageVersions")}
              value={formatStorageBytes(summary.totalLanguageVersionBytes, locale)}
            />
            <Metric
              label={t("admin.storageAudit.languageVersionCount")}
              value={String(summary.totalLanguageVersionCount)}
            />
            <Metric
              label={t("admin.storageAudit.averagePerProject")}
              value={formatStorageBytes(summary.averageBytesPerProject, locale)}
            />
            <Metric
              label={t("admin.storageAudit.projectCount")}
              value={String(summary.projectCount)}
            />
            <Metric
              label={t("admin.storageAudit.activeVersions")}
              value={formatStorageBytes(summary.totalActiveStorageBytes, locale)}
            />
            <Metric
              label={t("admin.storageAudit.archivedVersions")}
              value={formatStorageBytes(summary.totalArchivedStorageBytes, locale)}
            />
            <Metric
              label={t("admin.storageAudit.estimatedStorageCost")}
              value={`$${summary.estimatedMonthlyStorageCostUsd.toFixed(2)}`}
            />
            <Metric
              label={t("admin.storageAudit.estimatedTransfer")}
              value={`$${summary.estimatedTransferCostUsd.toFixed(2)}`}
            />
          </dl>

          {summary.extendedMetrics ?
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <Metric
                label={t("admin.storageAudit.averageVideoSize")}
                value={formatStorageBytes(summary.extendedMetrics.averageVideoSizeBytes, locale)}
              />
              <Metric
                label={t("admin.storageAudit.averageCleanVideoSize")}
                value={formatStorageBytes(summary.extendedMetrics.averageCleanVideoSizeBytes, locale)}
              />
              <Metric
                label={t("admin.storageAudit.averageLanguageVersionSize")}
                value={formatStorageBytes(
                  summary.extendedMetrics.averageLanguageVersionSizeBytes,
                  locale
                )}
              />
              <Metric
                label={t("admin.storageAudit.averageTextRerenderSize")}
                value={formatStorageBytes(
                  summary.extendedMetrics.averageTextRerenderSizeBytes,
                  locale
                )}
              />
              <Metric
                label={t("admin.storageAudit.expectedStoragePer1000")}
                value={formatStorageBytes(
                  summary.extendedMetrics.expectedStorageBytesPer1000Projects,
                  locale
                )}
              />
              <Metric
                label={t("admin.storageAudit.estimatedBlobMonthlyCost")}
                value={`$${summary.extendedMetrics.estimatedBlobMonthlyCostUsd.toFixed(2)}`}
              />
            </dl>
          : null}

          {summary.topProjects.length > 0 ?
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-zinc-900">
                {t("admin.storageAudit.topProjectsTitle")}
              </h3>
              <ul className="mt-2 space-y-2 text-xs text-zinc-700">
                {summary.topProjects.map((row) => (
                  <li
                    key={row.projectId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2"
                  >
                    <Link
                      href={`/videos/${encodeURIComponent(row.projectId)}`}
                      className="font-mono text-[11px] text-emerald-800 underline"
                    >
                      {row.projectId}
                    </Link>
                    <span className="font-medium">
                      {formatStorageBytes(row.totalSizeBytes, locale)} · {row.blobCount}{" "}
                      {t("admin.storageAudit.blobs")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          : null}

          <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-4">
            <h3 className="text-sm font-semibold text-amber-950">
              {t("admin.storageCleanup.dryRunTitle")}
            </h3>
            <p className="mt-1 text-xs text-amber-900/90">{t("admin.storageCleanup.dryRunIntro")}</p>
            <button
              type="button"
              onClick={() => void onDryRun()}
              disabled={dryRunLoading}
              className="mt-3 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-medium text-amber-950 disabled:opacity-60"
            >
              {dryRunLoading ? t("admin.storageCleanup.running") : t("admin.storageCleanup.runDryRun")}
            </button>
            {dryRun ?
              <dl className="mt-3 grid gap-2 text-xs text-amber-950 sm:grid-cols-2">
                <div>
                  <dt>{t("admin.storageCleanup.candidates")}</dt>
                  <dd className="font-semibold">{dryRun.candidateCount}</dd>
                </div>
                <div>
                  <dt>{t("admin.storageCleanup.recoverable")}</dt>
                  <dd className="font-semibold">
                    {formatStorageBytes(dryRun.bytesRecoverable, locale)}
                  </dd>
                </div>
              </dl>
            : null}
          </div>
        </>
      : null}
    </AppCard>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-1 text-base font-semibold text-zinc-900">{value}</dd>
    </div>
  );
}
