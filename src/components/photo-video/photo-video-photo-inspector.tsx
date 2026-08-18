"use client";

import { PhotoVideoTextControls } from "@/components/photo-video/photo-video-text-controls";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import type { PhotoVideoComposition } from "@/lib/photo-video/composition";
import { PHOTO_VIDEO_USER_MOTION_KINDS, type PhotoVideoUserMotionKind } from "@/lib/photo-video/styles";
import type {
  PhotoVideoAlign,
  PhotoVideoFontId,
  PhotoVideoTextBackground,
  PhotoVideoTextOverlay,
} from "@/lib/photo-video/text-overlay";

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
  selectedOverlay,
  selectedPhotoMotion,
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
}: {
  composition: PhotoVideoComposition;
  selectedPhotoId: string | null;
  selectedPhotoIndex: number;
  selectedOverlay: PhotoVideoTextOverlay | null;
  selectedPhotoMotion: PhotoVideoUserMotionKind;
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
}) {
  const t = useActiveTranslator();
  const hasPhoto = Boolean(selectedPhotoId);

  return (
    <section
      className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4"
      data-testid="px4a-photo-inspector"
      aria-labelledby="px4a-photo-inspector-heading"
    >
      <div className="space-y-1">
        <h2 id="px4a-photo-inspector-heading" className="text-base font-semibold text-zinc-900">
          {hasPhoto
            ? t("px4a.inspector.titleN", { n: selectedPhotoIndex + 1 })
            : t("px4a.inspector.title")}
        </h2>
        <p className="text-sm text-zinc-600">
          {hasPhoto ? t("px4a.inspector.lead") : t("px4a.inspector.needPhoto")}
        </p>
      </div>

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

      {hasPhoto ? (
        <fieldset className="space-y-2" data-testid="px4a-movement-photo">
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
    </section>
  );
}
