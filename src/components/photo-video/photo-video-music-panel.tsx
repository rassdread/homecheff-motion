"use client";

import { useEffect, useId, useRef, useState, type MutableRefObject, type PointerEvent as ReactPointerEvent } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  PHOTO_VIDEO_DEFAULT_VOLUME,
  audioTrackTimeAt,
  audioWindowFor,
  audioWindowPixels,
  classifyAudioFile,
  startSecondsFromClientX,
  type PhotoVideoOwnMusic,
} from "@/lib/photo-video/audio";
import { compositionDuration, type PhotoVideoComposition } from "@/lib/photo-video/composition";
import { wrapCompositionTime } from "@/lib/photo-video/clock";
import { formatPhotoVideoDuration } from "@/lib/photo-video/duration";
import { createPhotoVideoObjectUrl } from "@/lib/photo-video/object-url";
import { decodeOwnMusicFile } from "@/components/photo-video/decode-own-music";

export function PhotoVideoMusicPanel({
  composition,
  clockRef,
  playing,
  locale,
  onOwnMusic,
  onStart,
  onVolume,
  onPlayingChange,
}: {
  composition: PhotoVideoComposition;
  clockRef: MutableRefObject<number>;
  playing: boolean;
  locale: "nl" | "en";
  onOwnMusic: (audio: PhotoVideoOwnMusic, previousObjectUrl?: string, sourceBlob?: Blob) => void;
  onStart: (startSeconds: number) => void;
  onVolume: (volume: number) => void;
  onPlayingChange: (playing: boolean) => void;
}) {
  const t = useActiveTranslator();
  const fileId = useId();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dragRef = useRef<{ grabOffsetSeconds: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audio = composition.audio;
  const videoDuration = compositionDuration(composition).totalSeconds;
  const selection =
    audio.kind === "ownMusic"
      ? audioWindowFor({
          videoDurationSeconds: videoDuration,
          trackDurationSeconds: audio.trackDurationSeconds,
          startSeconds: audio.startSeconds,
        })
      : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || audio.kind !== "ownMusic" || !selection) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, w, h);
    const peaks = audio.peaks?.length ? audio.peaks : Array.from({ length: 64 }, () => 0.15);
    const barW = w / peaks.length;
    peaks.forEach((peak, i) => {
      const bh = Math.max(2, peak * (h - 8));
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillRect(i * barW, (h - bh) / 2, Math.max(1, barW - 1), bh);
    });
    const px = audioWindowPixels({
      trackDurationSeconds: audio.trackDurationSeconds,
      startSeconds: selection.startSeconds,
      windowSeconds: selection.windowSeconds,
      width: w,
    });
    ctx.fillStyle = "rgba(0, 109, 82, 0.38)";
    ctx.fillRect(px.x, 0, Math.max(8, px.width), h);
    ctx.strokeStyle = "#006D52";
    ctx.lineWidth = 3;
    ctx.strokeRect(px.x + 1.5, 1.5, Math.max(8, px.width) - 3, h - 3);
  }, [audio, selection]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.loop = false;
    let raf = 0;
    const tick = () => {
      const current = composition.audio;
      if (current.kind !== "ownMusic") {
        if (!el.paused) el.pause();
        raf = window.requestAnimationFrame(tick);
        return;
      }
      el.volume = current.volume;
      const tNow = wrapCompositionTime(clockRef.current, compositionDuration(composition).totalSeconds);
      const trackTime = audioTrackTimeAt({ audio: current, compositionTimeSeconds: tNow });
      if (trackTime == null) {
        if (!el.paused) el.pause();
      } else if (playing) {
        if (Math.abs(el.currentTime - trackTime) > 0.3) el.currentTime = trackTime;
        if (el.paused) void el.play().catch(() => undefined);
      } else if (!el.paused) {
        el.pause();
        if (Math.abs(el.currentTime - trackTime) > 0.05) el.currentTime = trackTime;
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
      el.pause();
    };
  }, [clockRef, composition, playing]);

  const onFile = async (list: FileList | null) => {
    const file = list?.[0];
    if (!file) return;
    setError(null);
    const classified = classifyAudioFile(file);
    if (classified !== "ok") {
      setError(t(classified === "size" ? "px4a.audio.error.size" : "px4a.audio.error.type"));
      return;
    }
    try {
      const decoded = await decodeOwnMusicFile(file);
      const objectUrl = createPhotoVideoObjectUrl(file);
      const previous = audio.kind === "ownMusic" ? audio.objectUrl : undefined;
      onOwnMusic(
        {
          kind: "ownMusic",
          startSeconds: 0,
          durationSeconds: videoDuration,
          trackDurationSeconds: decoded.durationSeconds,
          volume: audio.kind === "ownMusic" ? audio.volume : PHOTO_VIDEO_DEFAULT_VOLUME,
          objectUrl,
          fileName: file.name,
          peaks: decoded.peaks,
        },
        previous,
        file
      );
    } catch (err) {
      const code = err instanceof Error && err.message === "duration" ? "duration" : "decode";
      setError(t(code === "duration" ? "px4a.audio.error.duration" : "px4a.audio.error.decode"));
    }
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (audio.kind !== "ownMusic" || !selection) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
    const clickTime = ratio * audio.trackDurationSeconds;
    const inside = clickTime >= selection.startSeconds && clickTime <= selection.startSeconds + selection.windowSeconds;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    if (inside) {
      dragRef.current = { grabOffsetSeconds: clickTime - selection.startSeconds };
    } else {
      onStart(clickTime);
      dragRef.current = { grabOffsetSeconds: 0 };
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || audio.kind !== "ownMusic") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    onStart(
      startSecondsFromClientX({
        clientX: event.clientX,
        rectLeft: rect.left,
        rectWidth: rect.width,
        trackDurationSeconds: audio.trackDurationSeconds,
        grabOffsetSeconds: drag.grabOffsetSeconds,
        videoDurationSeconds: videoDuration,
      })
    );
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    clockRef.current = 0;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div className="space-y-3" data-testid="px4a-music-panel">
      <p className="text-sm text-zinc-600">{t("px4a.audio.legal")}</p>
      <label
        htmlFor={fileId}
        className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-zinc-200 px-4 text-sm font-medium"
      >
        {t("px4a.audio.choose")}
      </label>
      <input
        id={fileId}
        data-testid="px4a-audio-file"
        type="file"
        accept="audio/mpeg,audio/mp3,audio/mp4,audio/aac,audio/wav,audio/x-wav,audio/ogg,audio/webm,audio/x-m4a,.mp3,.m4a,.aac,.wav,.ogg,.webm"
        className="sr-only"
        onChange={(event) => {
          void onFile(event.target.files);
          event.target.value = "";
        }}
      />
      {audio.kind === "ownMusic" ? (
        <>
          {audio.fileName ? (
            <p className="truncate text-sm text-zinc-700">{t("px4a.audio.fileName", { name: audio.fileName })}</p>
          ) : null}
          {selection?.trackShorterThanVideo ? (
            <p className="text-sm text-zinc-600">{t("px4a.audio.shortTrack")}</p>
          ) : null}
          <canvas
            ref={canvasRef}
            width={640}
            height={56}
            data-testid="px4a-audio-window"
            aria-label={t("px4a.audio.window", {
              duration: formatPhotoVideoDuration(selection?.windowSeconds ?? videoDuration, locale),
            })}
            className="h-14 w-full touch-none rounded-xl bg-slate-900"
            style={{ touchAction: "none" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-800">{t("px4a.audio.volume")}</span>
            <input
              data-testid="px4a-audio-volume"
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(audio.volume * 100)}
              className="min-h-11 w-full"
              onChange={(event) => onVolume(Number(event.target.value) / 100)}
            />
          </label>
          <audio ref={audioRef} src={audio.objectUrl} preload="auto" />
        </>
      ) : null}
      {error ? (
        <p className="text-sm text-red-700" role="status">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className="min-h-11 rounded-full border border-zinc-200 px-4 text-sm font-medium"
        onClick={() => onPlayingChange(!playing)}
        disabled={audio.kind !== "ownMusic"}
      >
        {playing ? t("px4a.preview.pause") : t("px4a.preview.play")}
      </button>
    </div>
  );
}
