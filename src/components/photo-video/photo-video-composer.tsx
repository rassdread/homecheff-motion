"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { PhotoVideoPhotoStrip } from "@/components/photo-video/photo-video-photo-strip";
import { PhotoVideoPreviewCanvas } from "@/components/photo-video/photo-video-preview-canvas";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import {
  addPhotos,
  canAddPhoto,
  compositionDuration,
  createLocalPhoto,
  createPhotoVideoComposition,
  isCompositionPreviewReady,
  movePhoto,
  removePhoto,
  reorderPhotos,
  setExtraText,
  setPace,
  setRatio,
  setStyle,
  setTitle,
  type PhotoVideoComposition,
} from "@/lib/photo-video/composition";
import {
  PHOTO_VIDEO_MAX_LOCAL_IMAGE_BYTES,
  PHOTO_VIDEO_MAX_PHOTOS,
  PHOTO_VIDEO_MAX_SECONDS,
  PHOTO_VIDEO_MIN_PHOTOS,
  PHOTO_VIDEO_PACES,
  PHOTO_VIDEO_PREVIEW_MAX_EDGE,
  PHOTO_VIDEO_RATIOS,
  PHOTO_VIDEO_STYLES,
  type PhotoVideoPace,
  type PhotoVideoRatio,
  type PhotoVideoStyle,
} from "@/lib/photo-video/constants";
import { formatPhotoVideoDuration } from "@/lib/photo-video/duration";
import { revokePhotoVideoObjectUrl } from "@/lib/photo-video/object-url";
import type { TranslationKey } from "@/i18n";

function newPhotoId(): string {
  return `pv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function previewFromFile(file: File): Promise<{ url: string; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const width = bitmap.width;
  const height = bitmap.height;
  const scale = Math.min(1, PHOTO_VIDEO_PREVIEW_MAX_EDGE / Math.max(width, height));
  const pw = Math.max(1, Math.round(width * scale));
  const ph = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = pw;
  canvas.height = ph;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("canvas");
  }
  ctx.drawImage(bitmap, 0, 0, pw, ph);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("blob"))), "image/jpeg", 0.82);
  });
  return { url: URL.createObjectURL(blob), width, height };
}

const RATIO_LABEL: Record<PhotoVideoRatio, TranslationKey> = {
  "9:16": "px4a.ratio.vertical",
  "1:1": "px4a.ratio.square",
  "16:9": "px4a.ratio.landscape",
};
const RATIO_HINT: Record<PhotoVideoRatio, TranslationKey> = {
  "9:16": "px4a.ratio.verticalHint",
  "1:1": "px4a.ratio.squareHint",
  "16:9": "px4a.ratio.landscapeHint",
};
const PACE_LABEL: Record<PhotoVideoPace, TranslationKey> = {
  kort: "px4a.pace.kort",
  normaal: "px4a.pace.normaal",
  rustig: "px4a.pace.rustig",
};
const STYLE_LABEL: Record<PhotoVideoStyle, TranslationKey> = {
  auto: "px4a.style.auto",
  smooth: "px4a.style.smooth",
  calm: "px4a.style.calm",
  energetic: "px4a.style.energetic",
};

function ChipGroup<T extends string>({
  legend,
  value,
  options,
  onChange,
  testId,
  labelFor,
}: {
  legend: string;
  value: T;
  options: readonly { id: T; label: string; hint?: string }[];
  onChange: (id: T) => void;
  testId: string;
  labelFor: (id: T) => string;
}) {
  return (
    <fieldset className="space-y-2" data-testid={testId}>
      <legend className="text-sm font-semibold text-zinc-900">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              aria-label={labelFor(option.id)}
              onClick={() => onChange(option.id)}
              className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium ${
                selected
                  ? "border-[#006D52] bg-[#006D52] text-white"
                  : "border-zinc-200 bg-white text-zinc-800"
              }`}
            >
              <span>{option.label}</span>
              {option.hint ? <span className="mt-0.5 block text-[11px] font-normal opacity-80">{option.hint}</span> : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function PhotoVideoComposer() {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const fileInputId = useId();
  const [composition, setComposition] = useState<PhotoVideoComposition>(() => createPhotoVideoComposition());
  const [playing, setPlaying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previewUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    const urls = previewUrlsRef.current;
    return () => {
      for (const url of urls) revokePhotoVideoObjectUrl(url);
    };
  }, []);

  const duration = compositionDuration(composition);
  const ready = isCompositionPreviewReady(composition);

  const onFiles = useCallback(
    async (list: FileList | null) => {
      if (!list?.length) return;
      setError(null);
      const additions = [];
      let current = composition;
      for (const file of Array.from(list)) {
        if (!file.type.startsWith("image/")) {
          setError(t("px4a.error.notImage"));
          continue;
        }
        if (file.size > PHOTO_VIDEO_MAX_LOCAL_IMAGE_BYTES) {
          setError(t("px4a.error.tooLarge"));
          continue;
        }
        if (!canAddPhoto(current, 1)) {
          setError(t("px4a.error.limit"));
          break;
        }
        try {
          const preview = await previewFromFile(file);
          const photo = createLocalPhoto({
            id: newPhotoId(),
            previewUrl: preview.url,
            naturalWidth: preview.width,
            naturalHeight: preview.height,
          });
          const next = addPhotos(current, [photo]);
          if (next.photos.length === current.photos.length) {
            revokePhotoVideoObjectUrl(preview.url);
            setError(t("px4a.error.limit"));
            break;
          }
          previewUrlsRef.current.push(preview.url);
          additions.push(photo);
          current = next;
        } catch {
          setError(t("px4a.error.notImage"));
        }
      }
      if (additions.length) setComposition(current);
    },
    [composition, t]
  );

  const durationLabel = formatPhotoVideoDuration(duration.totalSeconds, locale);
  const remainingLabel = formatPhotoVideoDuration(Math.max(0, duration.remainingSeconds), locale);

  return (
    <div className="space-y-8" data-testid="px4a-composer">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{t("px4a.title")}</h1>
        <p className="max-w-xl text-sm leading-relaxed text-zinc-600">{t("px4a.lead")}</p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4">
        <PhotoVideoPreviewCanvas composition={composition} playing={playing && ready} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-zinc-800" data-testid="px4a-duration">
            {t("px4a.duration", { duration: durationLabel })}
          </p>
          <p className="text-sm text-zinc-600" data-testid="px4a-remaining">
            {t("px4a.remaining", { remaining: remainingLabel })}
          </p>
          <button
            type="button"
            className="min-h-11 rounded-full border border-zinc-200 px-4 text-sm font-medium"
            onClick={() => setPlaying((value) => !value)}
            disabled={!ready}
          >
            {ready && playing ? t("px4a.preview.pause") : t("px4a.preview.play")}
          </button>
        </div>
        {!ready ? <p className="mt-2 text-sm text-zinc-600">{t("px4a.preview.needPhotos")}</p> : null}
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900">{t("px4a.photos.title")}</h2>
        <p className="text-sm text-zinc-600">{t("px4a.photos.hint", { min: PHOTO_VIDEO_MIN_PHOTOS, max: PHOTO_VIDEO_MAX_PHOTOS })}</p>
        <label
          htmlFor={fileInputId}
          className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-[#006D52] px-5 text-sm font-semibold text-white"
        >
          {t("px4a.photos.add")}
        </label>
        <input
          id={fileInputId}
          data-testid="px4a-file-input"
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(event) => {
            void onFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <PhotoVideoPhotoStrip
          photos={composition.photos}
          onReorder={(from, to) => setComposition((current) => reorderPhotos(current, from, to))}
          onMove={(id, delta) => setComposition((current) => movePhoto(current, id, delta))}
          onRemove={(id) =>
            setComposition((current) => {
              const photo = current.photos.find((item) => item.id === id);
              const next = removePhoto(current, id);
              if (photo && next.photos.length < current.photos.length) {
                revokePhotoVideoObjectUrl(photo.previewUrl);
                previewUrlsRef.current = previewUrlsRef.current.filter((url) => url !== photo.previewUrl);
              }
              return next;
            })
          }
        />
        {error ? (
          <p className="text-sm text-red-700" role="status">
            {error}
          </p>
        ) : null}
      </section>

      <ChipGroup
        legend={t("px4a.ratio.legend")}
        testId="px4a-ratio"
        value={composition.ratio}
        onChange={(id) => setComposition((current) => setRatio(current, id))}
        labelFor={(id) => t(RATIO_LABEL[id])}
        options={PHOTO_VIDEO_RATIOS.map((id) => ({
          id,
          label: t(RATIO_LABEL[id]),
          hint: t(RATIO_HINT[id]),
        }))}
      />

      <ChipGroup
        legend={t("px4a.pace.legend")}
        testId="px4a-pace"
        value={composition.pace}
        onChange={(id) => setComposition((current) => setPace(current, id))}
        labelFor={(id) => t(PACE_LABEL[id])}
        options={PHOTO_VIDEO_PACES.map((id) => ({
          id,
          label: t(PACE_LABEL[id]),
        }))}
      />

      <ChipGroup
        legend={t("px4a.style.legend")}
        testId="px4a-style"
        value={composition.style}
        onChange={(id) => setComposition((current) => setStyle(current, id))}
        labelFor={(id) => t(STYLE_LABEL[id])}
        options={PHOTO_VIDEO_STYLES.map((id) => ({
          id,
          label: t(STYLE_LABEL[id]),
        }))}
      />

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900">{t("px4a.text.legend")}</h2>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-zinc-800">{t("px4a.text.title")}</span>
          <input
            data-testid="px4a-title"
            className="min-h-11 w-full rounded-xl border border-zinc-200 px-3"
            value={composition.title}
            maxLength={80}
            onChange={(event) => setComposition((current) => setTitle(current, event.target.value))}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-zinc-800">{t("px4a.text.extra")}</span>
          <input
            data-testid="px4a-extra"
            className="min-h-11 w-full rounded-xl border border-zinc-200 px-3"
            value={composition.extraText}
            maxLength={120}
            onChange={(event) => setComposition((current) => setExtraText(current, event.target.value))}
          />
        </label>
      </section>

      <p className="text-xs text-zinc-500">{t("px4a.watermark.note")}</p>
      <p className="sr-only" data-testid="px4a-max-seconds">
        {PHOTO_VIDEO_MAX_SECONDS}
      </p>
    </div>
  );
}

export type { PhotoVideoPace, PhotoVideoRatio, PhotoVideoStyle };
