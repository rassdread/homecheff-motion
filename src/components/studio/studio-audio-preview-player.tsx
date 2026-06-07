"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import {
  audioPreviewSourceLabelKey,
  isAudioPreviewPlayable,
} from "@/lib/studio-audio-preview-source";
import type { StudioAudioPreviewPlayerProps } from "@/types/studio-audio-preview";

export function StudioAudioPreviewPlayer({
  title,
  audioUrl,
  durationSeconds,
  source,
  variant = "default",
  showDownload = false,
  className = "",
}: StudioAudioPreviewPlayerProps) {
  const t = useActiveTranslator();

  if (!isAudioPreviewPlayable(audioUrl)) {
    return null;
  }

  const url = audioUrl!.trim();
  const sourceLabel = t(audioPreviewSourceLabelKey(source));
  const displayTitle = title?.trim() || sourceLabel;
  const durationLabel =
    durationSeconds != null && durationSeconds > 0
      ? t("studio.audioPreview.durationSeconds", {
          seconds: String(Math.round(durationSeconds * 10) / 10),
        })
      : null;

  const compact = variant === "compact";
  const inline = variant === "inline";
  const padding = inline ? "p-0 border-0 bg-transparent" : compact ? "p-2" : "p-3";

  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-white/90 ${padding} ${className}`.trim()}
      data-audio-preview-source={source}
    >
      {!inline ?
        <>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {sourceLabel}
          </p>
          <p className={`mt-0.5 font-medium text-zinc-900 ${compact ? "text-xs" : "text-sm"}`}>
            {displayTitle}
          </p>
          {durationLabel ?
            <p className="mt-0.5 text-xs text-zinc-600">{durationLabel}</p>
          : null}
        </>
      : null}
      <audio
        controls
        src={url}
        preload="metadata"
        className={`w-full ${inline ? "h-8 max-w-xs" : "mt-2"}`}
        aria-label={displayTitle}
      />
      {showDownload ?
        <a
          href={url}
          download
          className={`inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50 ${inline ? "mt-1" : "mt-2"}`}
        >
          {t("studio.audioPreview.download")}
        </a>
      : null}
    </div>
  );
}

export function StudioAudioPreviewPlanningOnly({
  messageKey = "studio.audioPreview.planningOnly",
  className = "",
}: {
  messageKey?: TranslationKey;
  className?: string;
}) {
  const t = useActiveTranslator();
  return (
    <p className={`rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 ${className}`}>
      {t(messageKey)}
    </p>
  );
}
