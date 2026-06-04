"use client";

import { useMemo } from "react";
import { MotionVersionSelectors } from "@/components/videos/motion-version-selectors";
import { BundleVersionBadges } from "@/components/videos/bundle-version-badges";
import { useActiveTranslator } from "@/i18n/client";
import {
  badgeContextForProject,
  resolveBundleVersionBadges,
} from "@/lib/bundle-version-badges";
import { resolveBundleFolderId } from "@/lib/bundle-folder";
import type { MotionVersionCatalog, MotionVersionSlot } from "@/lib/motion-version-catalog";
import type { AnimationProjectDetailResponse } from "@/types/animation-api";
import { MOTION_AUDIO_EXPORT_JSON_VERSION } from "@/types/motion-voice-export";

type Props = {
  detail: AnimationProjectDetailResponse;
  catalog: MotionVersionCatalog;
  selectedSlot: MotionVersionSlot | null;
  selectedLanguageCode: string;
  onLanguageChange: (code: string) => void;
  onVersionChange: (key: string) => void;
};

export function ProjectDetailVersionToolbar({
  detail,
  catalog,
  selectedSlot,
  selectedLanguageCode,
  onLanguageChange,
  onVersionChange,
}: Props) {
  const t = useActiveTranslator();

  const folderId = useMemo(
    () =>
      resolveBundleFolderId({
        bundleName: detail.bundleName,
        displayTitle: detail.title,
      }),
    [detail.bundleName, detail.title]
  );

  const badges = useMemo(() => {
    const ctx = badgeContextForProject({
      id: detail.id,
      studioSourceStoryboardId: detail.studioSource?.storyboardId ?? null,
      hasStudioHandoff: Boolean(detail.studioSource?.storyboardId),
      instantMode: detail.instantMode,
      imageCount: detail.images?.length ?? 0,
      status: selectedSlot?.status ?? detail.status,
      renderVersionCount: detail.renderVersions?.length ?? 0,
      languageExportCount: detail.languageExports?.length ?? 0,
      folderId,
    });
    const handoffForBadges =
      detail.studioAudioExport ?
        {
          motionAudioExport: {
            version: MOTION_AUDIO_EXPORT_JSON_VERSION,
            voiceEnabled: detail.studioAudioExport.hasStudioVoice,
            voiceAudioUrl: detail.studioAudioExport.voiceAudioUrl,
            subtitlesEnabled: detail.studioAudioExport.hasSubtitleTrack,
            subtitleTrack: detail.studioAudioExport.hasSubtitleTrack
              ? { available: true, entries: [{ start: 0, end: 1, text: "x" }] }
              : null,
          },
        }
      : null;
    const resolved = resolveBundleVersionBadges(ctx, handoffForBadges);
    if (selectedSlot?.kind === "language_export" && !resolved.some((b) => b.id === "text_only")) {
      return [
        ...resolved,
        { id: "text_only" as const, labelKey: "videos.badge.textOnly" },
      ];
    }
    return resolved;
  }, [detail, selectedSlot, folderId]);

  const folderLabelKey = `videos.folder.${folderId}` as const;

  return (
    <div className="space-y-3 rounded-xl border border-zinc-100 bg-zinc-50/60 p-4">
      <div className="text-xs text-zinc-600">
        <span className="font-medium text-zinc-800">{t("videos.bundle.folder")}:</span>{" "}
        {t(folderLabelKey as never)}
      </div>
      <MotionVersionSelectors
        catalog={{
          languages: catalog.languages,
          slotsByLanguage: Object.fromEntries(
            Object.entries(catalog.slotsByLanguage).map(([code, slots]) => [
              code,
              slots.map((slot) => ({
                selectionKey: slot.selectionKey,
                projectId: slot.projectId,
                languageCode: slot.languageCode,
                languageLabel: slot.languageLabel,
                versionNumber: slot.versionNumber,
                versionNote: slot.versionNote,
                displayLabel: slot.displayLabel,
                status: slot.status,
                finalVideoUrl: slot.finalVideoUrl,
                cleanVideoUrl: slot.cleanVideoUrl,
                thumbnailUrl: slot.thumbnailUrl,
                thumbnailFallbackUrl: slot.thumbnailFallbackUrl,
                durationSeconds: slot.durationSeconds,
                kind: slot.kind,
                createdAt: slot.createdAt,
                renderVersionId: slot.renderVersionId,
                languageExportId: slot.languageExportId,
              })),
            ])
          ),
          defaultLanguageCode: catalog.defaultLanguageCode,
          defaultSelectionKey: catalog.defaultSelectionKey,
        }}
        selectedLanguageCode={selectedLanguageCode}
        selectedSelectionKey={selectedSlot?.selectionKey ?? null}
        onLanguageChange={onLanguageChange}
        onVersionChange={onVersionChange}
        languageSelectId="detail-motion-language"
        versionSelectId="detail-motion-version"
      />
      {selectedSlot?.versionNote ?
        <p className="text-xs text-zinc-600">
          {t("videos.bundle.selectedVersionNote", { note: selectedSlot.versionNote })}
        </p>
      : null}
      <BundleVersionBadges badges={badges} />
    </div>
  );
}
