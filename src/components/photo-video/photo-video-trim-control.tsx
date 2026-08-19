"use client";

import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { formatClock, formatClipSeconds, videoClipDuration, type PhotoVideoClipVideo } from "@/lib/photo-video/media-clip";

export function PhotoVideoTrimControl({
  video,
  locale,
  onTrim,
}: {
  video: PhotoVideoClipVideo;
  locale: "nl" | "en";
  onTrim: (startSeconds: number, endSeconds: number) => void;
}) {
  const t = useActiveTranslator();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<"move" | "start" | "end" | null>(null);
  const source = Math.max(video.sourceDurationSeconds, 0.001);
  const startRatio = video.trimStartSeconds / source;
  const endRatio = video.trimEndSeconds / source;
  const used = videoClipDuration({ mediaKind: "video", video });

  const clientToSeconds = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return x * source;
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const mode = dragRef.current;
    if (!mode) return;
    const time = clientToSeconds(event.clientX);
    const span = Math.max(0.4, video.trimEndSeconds - video.trimStartSeconds);
    if (mode === "move") {
      let start = time - span / 2;
      start = Math.max(0, Math.min(start, source - span));
      onTrim(start, start + span);
      return;
    }
    if (mode === "start") {
      onTrim(Math.min(time, video.trimEndSeconds - 0.4), video.trimEndSeconds);
      return;
    }
    onTrim(video.trimStartSeconds, Math.max(time, video.trimStartSeconds + 0.4));
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <fieldset className="space-y-2" data-testid="px4a-video-trim">
      <legend className="text-sm font-semibold text-zinc-900">{t("px4a.video.trimLegend")}</legend>
      <div
        ref={trackRef}
        className="relative h-12 min-h-11 w-full touch-none rounded-full bg-zinc-200"
        data-testid="px4a-video-trim-track"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <button
          type="button"
          data-testid="px4a-video-trim-window"
          className="absolute top-1 bottom-1 min-w-11 rounded-full bg-[#006D52] text-[11px] font-semibold text-white"
          style={{ left: `${startRatio * 100}%`, width: `${Math.max(8, (endRatio - startRatio) * 100)}%` }}
          aria-label={t("px4a.video.trimLegend")}
          onPointerDown={(event) => {
            event.preventDefault();
            dragRef.current = "move";
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
        >
          {formatClipSeconds(used, locale)}
        </button>
        <button
          type="button"
          data-testid="px4a-video-trim-start"
          className="absolute top-0 h-12 w-11 -translate-x-1/2 rounded-full border border-white bg-white shadow"
          style={{ left: `${startRatio * 100}%` }}
          aria-label={t("px4a.video.trimStart")}
          onPointerDown={(event) => {
            event.preventDefault();
            dragRef.current = "start";
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
        />
        <button
          type="button"
          data-testid="px4a-video-trim-end"
          className="absolute top-0 h-12 w-11 -translate-x-1/2 rounded-full border border-white bg-white shadow"
          style={{ left: `${endRatio * 100}%` }}
          aria-label={t("px4a.video.trimEnd")}
          onPointerDown={(event) => {
            event.preventDefault();
            dragRef.current = "end";
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
        />
      </div>
      <p className="text-sm text-zinc-600">{t("px4a.video.source", { clock: formatClock(video.sourceDurationSeconds) })}</p>
      <p className="text-sm text-zinc-600">
        {t("px4a.video.selectedRange", {
          start: formatClock(video.trimStartSeconds),
          end: formatClock(video.trimEndSeconds),
        })}
      </p>
      <p className="text-sm font-medium text-zinc-800">
        {t("px4a.video.used", { duration: formatClipSeconds(used, locale) })}
      </p>
    </fieldset>
  );
}
