"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ClientFormattedDateTime } from "@/components/ui/client-formatted-datetime";
import { VideoPreview } from "@/components/ui/video-preview";
import { BundleCountLines } from "@/components/videos/bundle-count-lines";
import { BundleSelectedVersionBar } from "@/components/videos/bundle-selected-version-bar";
import { MotionVersionSelectors } from "@/components/videos/motion-version-selectors";
import { resolveBundleDisplayThumbnail } from "@/lib/bundle-thumbnail-cache";
import { resolveSelectedBundleVersion } from "@/lib/bundle-selected-version";
import { badgeContextForProject, resolveBundleVersionBadges } from "@/lib/bundle-version-badges";
import { formatLatestVersionLabel } from "@/lib/bundle-rich-summary";
import { useActiveTranslator, useLocale } from "@/i18n/client";
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
  const [locale] = useLocale();
  const dateLocale = locale === "nl" ? "nl" : "en";

  const [languageCode, setLanguageCode] = useState(bundle.catalog.defaultLanguageCode);
  const [selectionKey, setSelectionKey] = useState(
    bundle.catalog.defaultSelectionKey ??
      bundle.catalog.slotsByLanguage[bundle.catalog.defaultLanguageCode]?.[0]?.selectionKey ??
      null
  );

  const selectedBundleVersion = useMemo(
    () =>
      resolveSelectedBundleVersion({
        bundleKey: bundle.bundleKey,
        catalog: bundle.catalog,
        languageCode,
        selectionKey,
        fallbackBundleThumbnail: bundle.thumbnailUrl,
      }),
    [bundle.bundleKey, bundle.catalog, bundle.thumbnailUrl, languageCode, selectionKey]
  );

  const displayThumbnail = useMemo(() => {
    if (!selectedBundleVersion) {
      return bundle.thumbnailUrl;
    }
    return resolveBundleDisplayThumbnail({
      selectionKey: selectedBundleVersion.selectionKey,
      thumbnailUrl: selectedBundleVersion.thumbnailUrl,
      fallbackBundleThumbnail: bundle.thumbnailUrl,
    });
  }, [selectedBundleVersion, bundle.thumbnailUrl]);

  const displayStatus = selectedBundleVersion?.status ?? bundle.status;
  const finalUrl = selectedBundleVersion?.finalVideoUrl ?? null;
  const playable = selectedBundleVersion?.playable ?? false;
  const playKey = selectedBundleVersion?.playKey ?? `${bundle.bundleKey}:none`;
  const itemHref = selectedBundleVersion?.openHref ?? `/videos/${encodeURIComponent(bundle.activeProjectId)}`;
  const downloadUrl =
    selectedBundleVersion?.downloadUrl ??
    `/api/animations/projects/${encodeURIComponent(bundle.activeProjectId)}/download`;

  const hasPlayableFinal = playable && Boolean(finalUrl);
  const folderLabelKey = bundle.folderId
    ? (`videos.folder.${bundle.folderId}` as const)
    : ("videos.folder.uncategorized" as const);

  const versionSummary = bundle.versionCountSummary;

  const selectedBadges = useMemo(() => {
    const pid = selectedBundleVersion?.projectId;
    if (!pid) {
      return [];
    }
    const fromApi = bundle.badgesByProjectId?.[pid];
    if (fromApi?.length) {
      const slot = selectedBundleVersion.slot;
      if (slot.kind === "language_export" && !fromApi.some((b) => b.id === "text_only")) {
        return [...fromApi, { id: "text_only" as const, labelKey: "videos.badge.textOnly" }];
      }
      return fromApi;
    }
    return resolveBundleVersionBadges({
      ...badgeContextForProject({
        id: pid,
        status: selectedBundleVersion.status,
        folderId: bundle.folderId,
      }),
      slotKind: selectedBundleVersion.slot.kind,
    });
  }, [selectedBundleVersion, bundle.badgesByProjectId, bundle.folderId]);

  const overlayLabel = selectedBundleVersion
    ? `${selectedBundleVersion.languageLabel} · ${selectedBundleVersion.versionLabel}`
    : null;

  useEffect(() => {
    if (expandedVideoKey && expandedVideoKey !== playKey) {
      onTogglePlay(null);
    }
  }, [playKey, expandedVideoKey, onTogglePlay]);

  return (
    <li className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm">
      <div className="relative aspect-video shrink-0 bg-zinc-100">
        {displayThumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={displayThumbnail}
            src={displayThumbnail}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-400">
            {t("videos.bundle.noThumbnail")}
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full border border-white/80 bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white sm:text-xs">
          {displayStatus === "completed"
            ? t("videos.status.completed")
            : displayStatus === "failed"
              ? t("videos.status.failed")
              : t("videos.status.generating")}
        </span>
        {overlayLabel ?
          <span className="absolute bottom-2 right-2 max-w-[85%] truncate rounded-full border border-white/80 bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white">
            {overlayLabel}
          </span>
        : null}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              {t("videos.bundle.folder")}: {t(folderLabelKey as never)}
            </p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              {t("videos.bundle.video")}
            </p>
            <p className="truncate text-sm font-semibold text-zinc-900">{bundle.displayTitle}</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              <ClientFormattedDateTime iso={bundle.updatedAt} />
            </p>
          </div>
          {onRename ?
            <button
              type="button"
              onClick={onRename}
              className="shrink-0 text-xs font-medium text-zinc-500 underline hover:text-zinc-800"
              aria-label={t("videos.rename.action")}
            >
              ⋯
            </button>
          : null}
        </div>

        {versionSummary ?
          <BundleCountLines
            lines={[
              versionSummary.languageLine,
              versionSummary.totalLine,
              versionSummary.sourceLine,
              versionSummary.modeLine,
              versionSummary.featureLine,
              versionSummary.statusLine,
            ]}
          />
        : bundle.languagesLabel ?
          <p className="text-xs text-zinc-600">{bundle.languagesLabel}</p>
        : null}

        {versionSummary?.latestLabel ?
          <p className="text-[11px] text-zinc-500">
            {formatLatestVersionLabel(versionSummary, dateLocale)}
          </p>
        : bundle.latestVersionLabel ?
          <p className="text-[11px] text-zinc-500">{bundle.latestVersionLabel}</p>
        : null}

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

        {selectedBundleVersion ?
          <BundleSelectedVersionBar
            languageLabel={selectedBundleVersion.languageLabel}
            versionLabel={selectedBundleVersion.versionLabel}
            durationSeconds={selectedBundleVersion.durationSeconds}
            status={selectedBundleVersion.status}
            badges={selectedBadges}
          />
        : null}

        <div className="space-y-2 border-t border-zinc-100 pt-3">
          {hasPlayableFinal && expandedVideoKey === playKey ?
            <VideoPreview
              key={`${playKey}:${finalUrl}`}
              variant="version"
              frameClassName="mt-0"
              controls
              playsInline
              preload="none"
              poster={displayThumbnail ?? undefined}
              onError={() => onPlaybackError(playKey)}
              onLoadedData={() => onPlaybackOk(playKey)}
              src={finalUrl!}
            />
          : null}
          {hasPlayableFinal && playbackErrorKey === playKey ?
            <p className="text-xs text-red-700">{t("videos.playbackError")}</p>
          : null}
          {!hasPlayableFinal && !finalUrl ?
            <p className="text-xs text-zinc-600">{t("videos.bundle.noPlayableFinal")}</p>
          : null}
          <div className="flex flex-wrap gap-2">
            {hasPlayableFinal ?
              <button
                type="button"
                onClick={() => onTogglePlay(expandedVideoKey === playKey ? null : playKey)}
                className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
              >
                {expandedVideoKey === playKey ? t("videos.closePlayer") : t("videos.play")}
              </button>
            : (
              <span
                className="cursor-not-allowed rounded-full border border-zinc-100 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-400"
                title={t("videos.bundle.noPlayableFinal")}
              >
                {t("videos.play")}
              </span>
            )}
            {hasPlayableFinal ?
              <a
                href={downloadUrl}
                download
                className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900 hover:bg-emerald-100"
              >
                {t("videos.download")}
              </a>
            : (
              <span
                className="inline-flex cursor-not-allowed rounded-full border border-emerald-100 bg-emerald-50/50 px-3 py-1.5 text-xs font-medium text-emerald-700/40"
                title={t("videos.bundle.noPlayableFinal")}
              >
                {t("videos.download")}
              </span>
            )}
            <Link
              href={itemHref}
              prefetch={false}
              className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
            >
              {t("videos.open")}
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}
