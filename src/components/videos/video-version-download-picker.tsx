"use client";

import { useMemo, useState } from "react";
import { ClientFormattedDateTime } from "@/components/ui/client-formatted-datetime";
import { formatStorageBytes } from "@/lib/format-storage-bytes";
import {
  splitDownloadOptionsBySection,
  type VideoDownloadOption,
} from "@/lib/project-download-options";
import { useActiveTranslator, useLocale } from "@/i18n/client";

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  options: VideoDownloadOption[];
};

function statusLabelKey(status: string | undefined): string | null {
  if (!status || status === "completed") {
    return null;
  }
  if (status === "rendering" || status === "queued") {
    return "projectDetail.downloadPicker.statusRendering";
  }
  if (status === "failed" || status === "needs_refresh") {
    return "projectDetail.downloadPicker.statusFailed";
  }
  if (status === "unavailable") {
    return "projectDetail.downloadPicker.statusUnavailable";
  }
  return "projectDetail.downloadPicker.statusPending";
}

function OptionRow({
  option,
  locale,
}: {
  option: VideoDownloadOption;
  locale: "en" | "nl";
}) {
  const t = useActiveTranslator();
  const statusKey = statusLabelKey(option.status);
  const sizeLabel = formatStorageBytes(option.sizeBytes, locale);
  const dateIso = option.completedAt ?? option.createdAt ?? null;

  const content = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-zinc-900">
          {option.labelKey ? t(option.labelKey as never) : option.label}
          {option.versionNumber && option.kind === "language" ?
            ` v${option.versionNumber}`
          : null}
        </span>
        {option.lifecycleBadgeKey ?
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-900">
            {t(option.lifecycleBadgeKey as never)}
          </span>
        : null}
        {option.badgeKey ?
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-700">
            {t(option.badgeKey as never)}
          </span>
        : null}
        {statusKey ?
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900">
            {t(statusKey as never)}
          </span>
        : null}
      </div>
      <p className="mt-1 text-xs text-zinc-600">{t(option.descriptionKey as never)}</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-zinc-500">
        <div>
          <dt>{t("projectDetail.downloadPicker.sizeLabel")}</dt>
          <dd className="font-medium text-zinc-700">{sizeLabel}</dd>
        </div>
        <div>
          <dt>{t("projectDetail.downloadPicker.dateLabel")}</dt>
          <dd className="font-medium text-zinc-700">
            {dateIso ? <ClientFormattedDateTime iso={dateIso} /> : "—"}
          </dd>
        </div>
      </dl>
    </>
  );

  if (!option.downloadable) {
    return (
      <div
        className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 opacity-70"
        aria-disabled
      >
        {content}
      </div>
    );
  }

  return (
    <a
      href={option.href}
      download={option.filename}
      className="block rounded-xl border border-zinc-200 bg-white px-4 py-3 transition hover:border-emerald-200 hover:bg-emerald-50/40"
      onClick={() => undefined}
    >
      {content}
      <p className="mt-2 text-xs font-medium text-emerald-700">
        {t("projectDetail.downloadPicker.downloadAction")}
      </p>
    </a>
  );
}

export function VideoVersionDownloadPicker({ open, onClose, options }: Props) {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const [historyOpen, setHistoryOpen] = useState(false);

  const { primary, history } = useMemo(
    () => splitDownloadOptionsBySection(options),
    [options]
  );

  const sortedPrimary = useMemo(
    () =>
      [...primary].sort((a, b) => {
        const order = { original: 0, clean: 1, language: 2, text_rerender: 3, full_rerender: 4 } as const;
        const kindDiff = order[a.kind] - order[b.kind];
        if (kindDiff !== 0) {
          return kindDiff;
        }
        return a.label?.localeCompare(b.label ?? "") ?? 0;
      }),
    [primary]
  );

  const sortedHistory = useMemo(
    () =>
      [...history].sort((a, b) => {
        const dateA = a.completedAt ?? a.createdAt ?? "";
        const dateB = b.completedAt ?? b.createdAt ?? "";
        return String(dateB).localeCompare(String(dateA));
      }),
    [history]
  );

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-download-picker-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-t-2xl border border-zinc-200 bg-white shadow-xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-zinc-100 px-4 py-4 sm:px-6">
          <h2 id="video-download-picker-title" className="text-lg font-semibold text-zinc-900">
            {t("projectDetail.downloadPicker.title")}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">{t("projectDetail.downloadPicker.subtitle")}</p>
        </div>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto px-4 py-4 sm:px-6">
          {sortedPrimary.map((option) => (
            <OptionRow key={option.id} option={option} locale={locale} />
          ))}

          {sortedHistory.length > 0 ?
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setHistoryOpen((value) => !value)}
                className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-left text-sm font-medium text-zinc-800"
              >
                <span>{t("projectDetail.downloadPicker.historyTitle")}</span>
                <span className="text-xs text-zinc-500">{sortedHistory.length}</span>
              </button>
              {historyOpen ?
                <div className="mt-2 space-y-2">
                  {sortedHistory.map((option) => (
                    <OptionRow key={option.id} option={option} locale={locale} />
                  ))}
                </div>
              : null}
            </div>
          : null}
        </div>
        <div className="border-t border-zinc-100 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700"
          >
            {t("projectDetail.downloadPicker.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
