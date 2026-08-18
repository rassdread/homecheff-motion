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
            : t("px4a.inspector.thisPhoto")}
        </h2>
        <p className="text-sm text-zinc-600">
          {hasPhoto ? t("px4a.inspector.lead") : t("px4a.inspector.needPhoto")}
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

      {hasPhoto ? (
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
