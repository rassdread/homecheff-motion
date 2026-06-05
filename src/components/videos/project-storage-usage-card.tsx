"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildProjectDownloadOptions,
  pickDownloadableOptions,
  resolveDirectDownloadOption,
  shouldOpenDownloadPicker,
  type VideoDownloadOption,
} from "@/lib/project-download-options";
import { VideoVersionDownloadPicker } from "@/components/videos/video-version-download-picker";
import { buildSizeByUrlMap, type ProjectStorageAudit } from "@/types/storage-audit";
import { formatStorageBytes } from "@/lib/format-storage-bytes";
import type { VideoLanguageExportSummary } from "@/types/animation-api";
import { useActiveTranslator } from "@/i18n/client";

type Props = {
  projectId: string;
  originalVideoUrl: string | null;
  cleanVideoUrl: string | null;
  languageExports: VideoLanguageExportSummary[];
  className?: string;
  storageAudit?: ProjectStorageAudit | null;
  /** V22.7 — when set, download targets the selected catalog slot only. */
  slotDownloadHref?: string | null;
};

export function VideoVersionDownloadTrigger({
  projectId,
  originalVideoUrl,
  cleanVideoUrl,
  languageExports,
  className = "",
  storageAudit = null,
  slotDownloadHref = null,
}: Props) {
  const t = useActiveTranslator();
  const [pickerOpen, setPickerOpen] = useState(false);

  const sizeByUrl = useMemo(
    () => (storageAudit ? buildSizeByUrlMap(storageAudit) : undefined),
    [storageAudit]
  );

  const options = useMemo((): VideoDownloadOption[] => {
    if (slotDownloadHref?.trim()) {
      return [
        {
          id: "selected-slot",
          kind: "original",
          descriptionKey: "projectDetail.downloadPicker.originalDescription",
          badgeKey: "projectDetail.downloadPicker.withTextBadge",
          href: slotDownloadHref.trim(),
          filename: `homecheff-motion-${projectId}.mp4`,
          downloadable: true,
          section: "primary",
        },
      ];
    }
    return buildProjectDownloadOptions({
      projectId,
      originalVideoUrl,
      cleanVideoUrl,
      languageExports,
      sizeByUrl,
      includeNonDownloadable: pickerOpen,
    });
  }, [
    cleanVideoUrl,
    languageExports,
    originalVideoUrl,
    pickerOpen,
    projectId,
    sizeByUrl,
    slotDownloadHref,
  ]);

  const downloadable = useMemo(() => pickDownloadableOptions(options), [options]);
  const directDownload = useMemo(() => resolveDirectDownloadOption(options), [options]);
  const openPicker = useCallback(() => setPickerOpen(true), []);

  if (downloadable.length === 0) {
    return null;
  }

  const baseClass =
    "flex w-full flex-col gap-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50/40";

  return (
    <>
      {directDownload && !shouldOpenDownloadPicker(options) ?
        <a
          href={directDownload.href}
          download={directDownload.filename}
          className={`${baseClass} ${className}`}
        >
          <span className="text-sm font-semibold text-zinc-900">
            {t("projectDetail.quickActions.downloadVersion.label")}
          </span>
          <span className="text-xs leading-relaxed text-zinc-600">
            {t("projectDetail.quickActions.downloadVersion.singleHint")}
          </span>
        </a>
      : <button type="button" className={`${baseClass} ${className}`} onClick={openPicker}>
          <span className="text-sm font-semibold text-zinc-900">
            {t("projectDetail.quickActions.downloadVersion.label")}
          </span>
          <span className="text-xs leading-relaxed text-zinc-600">
            {t("projectDetail.quickActions.downloadVersion.multiHint", {
              count: downloadable.length,
            })}
          </span>
        </button>
      }

      <VideoVersionDownloadPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        projectId={projectId}
        options={options}
      />
    </>
  );
}

type StorageTriggerProps = Omit<Props, "className"> & {
  isAdmin?: boolean;
};

export function useProjectStorageAudit(projectId: string, enabled: boolean) {
  const [audit, setAudit] = useState<ProjectStorageAudit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!projectId.trim()) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/animations/projects/${encodeURIComponent(projectId)}/storage-audit`,
        { credentials: "include", cache: "no-store" }
      );
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        audit?: ProjectStorageAudit;
        error?: string;
      } | null;
      if (!res.ok || !body?.audit) {
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      setAudit(body.audit);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Storage audit failed");
      setAudit(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [enabled, refresh]);

  return { audit, loading, error, refresh };
}

export function ProjectStorageUsageCard({
  projectId,
  isAdmin = false,
  audit: auditProp = null,
  onRefresh,
  loading: loadingProp = false,
  error: errorProp = null,
}: {
  projectId: string;
  isAdmin?: boolean;
  audit?: ProjectStorageAudit | null;
  onRefresh?: () => void;
  loading?: boolean;
  error?: string | null;
}) {
  const t = useActiveTranslator();
  const internal = useProjectStorageAudit(projectId, auditProp == null);
  const audit = auditProp ?? internal.audit;
  const loading = auditProp != null ? loadingProp : internal.loading;
  const error = auditProp != null ? errorProp : internal.error;
  const refresh = onRefresh ?? internal.refresh;

  if (loading && !audit) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4 text-sm text-zinc-600">
        {t("projectDetail.storage.loading")}
      </section>
    );
  }

  if (error && !audit) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p>{t("projectDetail.storage.error")}</p>
        {isAdmin ? <p className="mt-1 font-mono text-xs">{error}</p> : null}
        <button
          type="button"
          className="mt-3 text-xs font-medium underline"
          onClick={() => void refresh()}
        >
          {t("projectDetail.storage.retry")}
        </button>
      </section>
    );
  }

  if (!audit) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">
            {t("projectDetail.storage.title")}
          </h2>
          <p className="mt-1 text-xs text-zinc-600">{t("projectDetail.storage.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 disabled:opacity-60"
        >
          {loading ? t("projectDetail.storage.loading") : t("projectDetail.storage.refresh")}
        </button>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 sm:col-span-2">
          <dt className="text-[11px] uppercase tracking-wide text-zinc-500">
            {t("projectDetail.storage.currentStorage")}
          </dt>
          <dd className="text-lg font-semibold text-zinc-900">
            {formatStorageBytes(audit.activeStorageBytes)}
          </dd>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
          <dt className="text-[11px] uppercase tracking-wide text-zinc-500">
            {t("projectDetail.storage.archivedStorage")}
          </dt>
          <dd className="text-lg font-semibold text-zinc-900">
            {formatStorageBytes(audit.archivedStorageBytes)}
          </dd>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
          <dt className="text-[11px] uppercase tracking-wide text-zinc-500">
            {t("projectDetail.storage.total")}
          </dt>
          <dd className="text-lg font-semibold text-zinc-900">
            {formatStorageBytes(audit.totalSizeBytes)}
          </dd>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
          <dt className="text-[11px] uppercase tracking-wide text-zinc-500">
            {t("projectDetail.storage.fileCounts")}
          </dt>
          <dd className="text-sm font-semibold text-zinc-900">
            {t("projectDetail.storage.activeFileCount", { count: audit.currentVersionCount })} ·{" "}
            {t("projectDetail.storage.archivedFileCount", { count: audit.archivedVersionCount })}
          </dd>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
          <dt className="text-[11px] uppercase tracking-wide text-zinc-500">
            {t("projectDetail.storage.estimatedStorageCost")}
          </dt>
          <dd className="text-lg font-semibold text-zinc-900">
            ${audit.estimatedMonthlyStorageCostUsd.toFixed(2)}
          </dd>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
          <dt className="text-[11px] uppercase tracking-wide text-zinc-500">
            {t("projectDetail.storage.estimatedTransfer")}
          </dt>
          <dd className="text-lg font-semibold text-zinc-900">
            ${audit.estimatedTransferCostUsd.toFixed(2)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 space-y-1 text-xs text-zinc-600">
        <p>
          {t("projectDetail.storage.breakdownOriginal")}:{" "}
          {formatStorageBytes(audit.breakdown.originalBytes)}
        </p>
        <p>
          {t("projectDetail.storage.breakdownClean")}:{" "}
          {formatStorageBytes(audit.breakdown.cleanBytes)}
        </p>
        <p>
          {t("projectDetail.storage.breakdownLanguages")}:{" "}
          {formatStorageBytes(audit.breakdown.languageBytes)}
        </p>
        {audit.breakdown.segmentBytes > 0 ? (
          <p>
            {t("projectDetail.storage.breakdownSegments")}:{" "}
            {formatStorageBytes(audit.breakdown.segmentBytes)}
          </p>
        ) : null}
      </div>

      <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-3">
        <p className="text-xs font-semibold text-emerald-950">
          {t("projectDetail.storage.retentionTitle")}
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-emerald-900/90">
          {audit.retentionRecommendationIds.map((id) => (
            <li key={id}>{t(`projectDetail.storage.retention.${id}` as never)}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
