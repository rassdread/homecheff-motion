"use client";

import { PhotoVideoTextControls } from "@/components/photo-video/photo-video-text-controls";
import { PhotoVideoTrimControl } from "@/components/photo-video/photo-video-trim-control";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import type { PhotoVideoComposition, PhotoVideoPhoto } from "@/lib/photo-video/composition";
import { isVideoPhoto } from "@/lib/photo-video/media-clip";
import { PHOTO_VIDEO_USER_MOTION_KINDS, type PhotoVideoUserMotionKind } from "@/lib/photo-video/styles";
import type {
  PhotoVideoAlign,
  PhotoVideoFontId,
  PhotoVideoTextBackground,
  PhotoVideoTextOverlay,
} from "@/lib/photo-video/text-overlay";
import type { PhotoVideoEditPanel } from "@/components/photo-video/photo-video-edit-toolbar";

const PHOTO_MOTION_LABEL: Record<PhotoVideoUserMotionKind, TranslationKey> = {
  auto: "px4a.movement.auto",
  none: "px4a.movement.none",
  "zoom-in": "px4a.movement.zoomIn",
  "zoom-out": "px4a.movement.zoomOut",
  "pan-left": "px4a.movement.panLeft",
  "pan-right": "px4a.movement.panRight",
  "pan-up": "px4a.movement.panUp",
  "pan-down": "px4a.movement.panDown",
};

export function PhotoVideoPhotoInspector({
  composition,
  selectedPhotoId,
  selectedPhotoIndex,
  photoCount,
  selectedOverlay,
  selectedPhotoMotion,
  panel = "all",
  onAddText,
  onSelectOverlay,
  onChangeText,
  onDelete,
  onFont,
  onColor,
  onSize,
  onAlign,
  onBackground,
  onNudge,
  onMotion,
  onMoveSelected,
  onTrim,
  onVideoAudio,
  onVideoVolume,
  onVideoFit,
}: {
  composition: PhotoVideoComposition;
  selectedPhotoId: string | null;
  selectedPhotoIndex: number;
  photoCount: number;
  selectedOverlay: PhotoVideoTextOverlay | null;
  selectedPhotoMotion: PhotoVideoUserMotionKind;
  panel?: PhotoVideoEditPanel | "all";
  onAddText: () => void;
  onSelectOverlay: (id: string) => void;
  onChangeText: (text: string) => void;
  onDelete: () => void;
  onFont: (font: PhotoVideoFontId) => void;
  onColor: (color: string) => void;
  onSize: (size: number) => void;
  onAlign: (align: PhotoVideoAlign) => void;
  onBackground: (background: PhotoVideoTextBackground) => void;
  onNudge: (dx: number, dy: number) => void;
  onMotion: (kind: PhotoVideoUserMotionKind) => void;
  onMoveSelected: (delta: -1 | 1) => void;
  onTrim?: (startSeconds: number, endSeconds: number) => void;
  onVideoAudio?: (enabled: boolean) => void;
  onVideoVolume?: (volume: number) => void;
  onVideoFit?: (fit: "cover" | "contain") => void;
}) {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const selectedPhoto: PhotoVideoPhoto | null =
    composition.photos.find((photo) => photo.id === selectedPhotoId) ?? null;
  const hasPhoto = Boolean(selectedPhotoId);
  const video = Boolean(selectedPhoto && isVideoPhoto(selectedPhoto));

  return (
    <section
      className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4"
      data-testid="px4a-photo-inspector"
      aria-labelledby="px4a-photo-inspector-heading"
    >
      <div className="space-y-1">
        <h2 id="px4a-photo-inspector-heading" className="text-base font-semibold text-zinc-900">
          {hasPhoto
            ? t(video ? "px4a.inspector.titleVideoN" : "px4a.inspector.titleN", { n: selectedPhotoIndex + 1 })
            : t("px4a.inspector.thisPhoto")}
        </h2>
        <p className="text-sm text-zinc-600">
          {hasPhoto
            ? t(video ? "px4a.inspector.leadVideo" : "px4a.inspector.lead")
            : t("px4a.inspector.needClip")}
        </p>
      </div>

      <div className={panel === "all" || panel === "text" ? undefined : "max-lg:hidden"}>
        <PhotoVideoTextControls
          composition={composition}
          selectedPhotoId={selectedPhotoId}
          selectedPhotoIndex={selectedPhotoIndex}
          selectedOverlay={selectedOverlay}
          embedded
          onAdd={onAddText}
          onSelectOverlay={onSelectOverlay}
          onChangeText={onChangeText}
          onDelete={onDelete}
          onFont={onFont}
          onColor={onColor}
          onSize={onSize}
          onAlign={onAlign}
          onBackground={onBackground}
          onNudge={onNudge}
        />
      </div>

      {hasPhoto && video && selectedPhoto?.video && onTrim ? (
        <div className={panel === "all" || panel === "clip" ? undefined : "max-lg:hidden"}>
          <PhotoVideoTrimControl
            video={selectedPhoto.video}
            locale={locale}
            onTrim={onTrim}
          />
          <fieldset className="mt-4 space-y-2" data-testid="px4a-video-audio">
            <legend className="text-sm font-semibold text-zinc-900">{t("px4a.video.audio")}</legend>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={selectedPhoto.video.audioEnabled}
                data-testid="px4a-video-audio-on"
                className={`min-h-11 rounded-full border px-4 text-sm font-medium ${
                  selectedPhoto.video.audioEnabled
                    ? "border-[#006D52] bg-[#006D52] text-white"
                    : "border-zinc-200 bg-white text-zinc-800"
                }`}
                onClick={() => onVideoAudio?.(true)}
              >
                {t("px4a.video.audioOn")}
              </button>
              <button
                type="button"
                aria-pressed={!selectedPhoto.video.audioEnabled}
                data-testid="px4a-video-audio-off"
                className={`min-h-11 rounded-full border px-4 text-sm font-medium ${
                  !selectedPhoto.video.audioEnabled
                    ? "border-[#006D52] bg-[#006D52] text-white"
                    : "border-zinc-200 bg-white text-zinc-800"
                }`}
                onClick={() => onVideoAudio?.(false)}
              >
                {t("px4a.video.audioOff")}
              </button>
            </div>
            {selectedPhoto.video.audioEnabled ? (
              <label className="block text-sm text-zinc-700">
                {t("px4a.video.volume")}
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={selectedPhoto.video.volume}
                  data-testid="px4a-video-volume"
                  className="mt-1 w-full"
                  onChange={(event) => onVideoVolume?.(Number(event.target.value))}
                />
              </label>
            ) : null}
          </fieldset>
          <fieldset className="mt-4 space-y-2" data-testid="px4a-video-fit">
            <legend className="text-sm font-semibold text-zinc-900">{t("px4a.video.fit")}</legend>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={selectedPhoto.video.fit !== "contain"}
                className={`min-h-11 rounded-full border px-4 text-sm font-medium ${
                  selectedPhoto.video.fit !== "contain"
                    ? "border-[#006D52] bg-[#006D52] text-white"
                    : "border-zinc-200 bg-white text-zinc-800"
                }`}
                onClick={() => onVideoFit?.("cover")}
              >
                {t("px4a.video.fitCover")}
              </button>
              <button
                type="button"
                aria-pressed={selectedPhoto.video.fit === "contain"}
                className={`min-h-11 rounded-full border px-4 text-sm font-medium ${
                  selectedPhoto.video.fit === "contain"
                    ? "border-[#006D52] bg-[#006D52] text-white"
                    : "border-zinc-200 bg-white text-zinc-800"
                }`}
                onClick={() => onVideoFit?.("contain")}
              >
                {t("px4a.video.fitContain")}
              </button>
            </div>
          </fieldset>
        </div>
      ) : null}

      {hasPhoto && !video ? (
        <fieldset
          className={`space-y-2 ${panel === "all" || panel === "motion" ? "" : "max-lg:hidden"}`}
          data-testid="px4a-movement-photo"
        >
          <legend className="text-sm font-semibold text-zinc-900" data-testid="px4a-movement-advanced-toggle">
            {t("px4a.movement.legend")}
          </legend>
          <p className="text-sm text-zinc-600">{t("px4a.movement.photoAutoHint")}</p>
          <div className="flex flex-wrap gap-2">
            {PHOTO_VIDEO_USER_MOTION_KINDS.map((id) => {
              const selected = id === selectedPhotoMotion;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  aria-label={t(PHOTO_MOTION_LABEL[id])}
                  onClick={() => onMotion(id)}
                  className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium ${
                    selected
                      ? "border-[#006D52] bg-[#006D52] text-white"
                      : "border-zinc-200 bg-white text-zinc-800"
                  }`}
                >
                  {t(PHOTO_MOTION_LABEL[id])}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {hasPhoto ? (
        <fieldset
          className={`space-y-2 ${panel === "all" || panel === "order" ? "" : "max-lg:hidden"}`}
          data-testid="px4a-order-panel"
        >
          <legend className="text-sm font-semibold text-zinc-900">{t("px4a.order.legend")}</legend>
          <p className="text-sm text-zinc-600">{t("px4a.order.hint")}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="min-h-11 rounded-full border border-zinc-200 px-4 text-sm font-medium disabled:opacity-40"
              aria-label={t("px4a.photo.moveEarlier")}
              disabled={selectedPhotoIndex <= 0}
              onClick={() => onMoveSelected(-1)}
            >
              {t("px4a.photo.moveEarlier")}
            </button>
            <button
              type="button"
              className="min-h-11 rounded-full border border-zinc-200 px-4 text-sm font-medium disabled:opacity-40"
              aria-label={t("px4a.photo.moveLater")}
              disabled={selectedPhotoIndex >= photoCount - 1}
              onClick={() => onMoveSelected(1)}
            >
              {t("px4a.photo.moveLater")}
            </button>
          </div>
        </fieldset>
      ) : null}
    </section>
  );
}
