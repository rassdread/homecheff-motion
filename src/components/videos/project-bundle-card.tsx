"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ClientFormattedDateTime } from "@/components/ui/client-formatted-datetime";
import { VideoPreview } from "@/components/ui/video-preview";
import { MotionVersionSelectors } from "@/components/videos/motion-version-selectors";
import { animationProjectDownloadUrl } from "@/lib/animation-project-download";
import {
  isProjectPlayablyComplete,
  resolveProjectDisplayStatus,
} from "@/lib/project-display-status";
import { useActiveTranslator } from "@/i18n/client";
import type { ProjectBundleListItemResponse } from "@/types/animation-api";

type Props = {
  bundle: ProjectBundleListItemResponse;
  onRename?: () => void;
  expandedVideoKey: string | null;
  onTogglePlay: (key: string | null) => void;
  playbackErrorKey: string | null;
  onPlaybackError: (key: string) => void;
  onPlaybackOk: (key: string) => void;
};

export function ProjectBundleCard({
  bundle,
  onRename,
  expandedVideoKey,
  onTogglePlay,
  playbackErrorKey,
  onPlaybackError,
  onPlaybackOk,
}: Props) {
  const t = useActiveTranslator();
  const [languageCode, setLanguageCode] = useState(bundle.catalog.defaultLanguageCode);
  const [selectionKey, setSelectionKey] = useState(
    bundle.catalog.defaultSelectionKey ??
      bundle.catalog.slotsByLanguage[bundle.catalog.defaultLanguageCode]?.[0]?.selectionKey ??
      null
  );

  const selectedSlot = useMemo(() => {
    const slots = bundle.catalog.slotsByLanguage[languageCode] ?? [];
    return slots.find((s) => s.selectionKey === selectionKey) ?? slots[slots.length - 1] ?? null;
  }, [bundle.catalog.slotsByLanguage, languageCode, selectionKey]);

  const activeProjectId = selectedSlot?.projectId ?? bundle.activeProjectId;
  const finalUrl = selectedSlot?.finalVideoUrl?.trim() ?? null;
  const thumb = bundle.thumbnailUrl;
  const playKey = `${bundle.bundleKey}:${selectionKey ?? "none"}`;

  const displayStatus = selectedSlot
    ? resolveProjectDisplayStatus({
        projectStatus: selectedSlot.status,
        exportStatus: selectedSlot.status,
        outputVideoUrl: finalUrl,
      })
    : bundle.status;

  const playable = isProjectPlayablyComplete({
    projectStatus: displayStatus,
    exportStatus: displayStatus,
    outputVideoUrl: finalUrl,
  });

  const failed = displayStatus === "failed";
  const itemHref = `/videos/${encodeURIComponent(activeProjectId)}`;

  return (
    <li className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm">
      <Link href={itemHref} prefetch={false} className="block shrink-0">
        <div className="relative aspect-video bg-zinc-100">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-zinc-400">
              {t("videos.title")}
            </div>
          )}
          <span className="absolute left-2 top-2 rounded-full border border-white/80 bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white sm:text-xs">
            {displayStatus === "completed"
              ? t("videos.status.completed")
              : displayStatus === "failed"
                ? t("videos.status.failed")
                : t("videos.status.generating")}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link href={itemHref} prefetch={false}>
              <p className="truncate text-sm font-semibold text-zinc-900">{bundle.displayTitle}</p>
            </Link>
            <p className="mt-0.5 text-xs text-zinc-500">
              <ClientFormattedDateTime iso={bundle.createdAt} />
            </p>
            {bundle.catalog.languages.length > 0 ? (
              <ul className="mt-1 space-y-0.5">
                {bundle.catalog.languages.map((lang) => (
                  <li key={lang.code} className="text-xs text-zinc-600">
                    {lang.label} ({bundle.catalog.slotsByLanguage[lang.code]?.length ?? 0})
                  </li>
                ))}
              </ul>
            ) : bundle.languagesLabel ? (
              <p className="mt-1 text-xs text-zinc-600">{bundle.languagesLabel}</p>
            ) : null}
            {bundle.latestVersionLabel ? (
              <p className="text-xs font-medium text-emerald-900">
                {t("videos.bundle.latest", { label: bundle.latestVersionLabel })}
              </p>
            ) : null}
          </div>
          {onRename ? (
            <button
              type="button"
              onClick={onRename}
              className="shrink-0 text-xs font-medium text-zinc-500 underline hover:text-zinc-800"
              aria-label={t("videos.rename.action")}
            >
              ⋯
            </button>
          ) : null}
        </div>

        <MotionVersionSelectors
          catalog={bundle.catalog}
          selectedLanguageCode={languageCode}
          selectedSelectionKey={selectionKey}
          onLanguageChange={(code) => {
            setLanguageCode(code);
            const slots = bundle.catalog.slotsByLanguage[code] ?? [];
            const latest = slots[slots.length - 1];
            if (latest) {
              setSelectionKey(latest.selectionKey);
            }
          }}
          onVersionChange={setSelectionKey}
          languageSelectId={`lang-${bundle.bundleKey}`}
          versionSelectId={`ver-${bundle.bundleKey}`}
        />

        {playable && finalUrl && !failed ? (
          <div className="mt-2 space-y-2 border-t border-zinc-100 pt-3">
            {expandedVideoKey === playKey ? (
              <VideoPreview
                key={finalUrl}
                variant="version"
                frameClassName="mt-0"
                controls
                playsInline
                preload="none"
                poster={thumb ?? undefined}
                onError={() => onPlaybackError(playKey)}
                onLoadedData={() => onPlaybackOk(playKey)}
                src={finalUrl}
              />
            ) : null}
            {playbackErrorKey === playKey ? (
              <p className="text-xs text-red-700">{t("videos.playbackError")}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onTogglePlay(expandedVideoKey === playKey ? null : playKey)}
                className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
              >
                {expandedVideoKey === playKey ? t("videos.closePlayer") : t("videos.play")}
              </button>
              <a
                href={animationProjectDownloadUrl(activeProjectId)}
                download
                className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900 hover:bg-emerald-100"
              >
                {t("videos.download")}
              </a>
              <Link
                href={itemHref}
                prefetch={false}
                className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
              >
                {t("videos.open")}
              </Link>
            </div>
          </div>
        ) : failed ? (
          <p className="text-xs font-medium text-red-700">{t("videos.status.failed")}</p>
        ) : null}

        <div className="mt-auto border-t border-zinc-100 pt-3 text-xs">
          <Link href={itemHref} prefetch={false} className="font-medium text-emerald-800 underline">
            {t("videos.open")}
          </Link>
        </div>
      </div>
    </li>
  );
}
