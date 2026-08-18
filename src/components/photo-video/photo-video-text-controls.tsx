"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import {
  canAddOverlay,
  overlaysForPhoto,
  type PhotoVideoComposition,
} from "@/lib/photo-video/composition";
import {
  PHOTO_VIDEO_ALIGNS,
  PHOTO_VIDEO_BACKGROUNDS,
  PHOTO_VIDEO_FONTS,
  PHOTO_VIDEO_TEXT_COLORS,
  PHOTO_VIDEO_TEXT_SIZE_MAX,
  PHOTO_VIDEO_TEXT_SIZE_MIN,
  type PhotoVideoAlign,
  type PhotoVideoFontId,
  type PhotoVideoTextBackground,
  type PhotoVideoTextOverlay,
} from "@/lib/photo-video/text-overlay";

const FONT_KEY: Record<PhotoVideoFontId, TranslationKey> = {
  modern: "px4a.text.font.modern",
  strong: "px4a.text.font.strong",
  elegant: "px4a.text.font.elegant",
  playful: "px4a.text.font.playful",
  classic: "px4a.text.font.classic",
  script: "px4a.text.font.script",
};

const COLOR_KEY: Record<(typeof PHOTO_VIDEO_TEXT_COLORS)[number], TranslationKey> = {
  "#FFFFFF": "px4a.text.color.white",
  "#041428": "px4a.text.color.black",
  "#006D52": "px4a.text.color.green",
  "#0067B1": "px4a.text.color.blue",
  "#F4C542": "px4a.text.color.gold",
  "#E11D48": "px4a.text.color.red",
};

const ALIGN_KEY: Record<PhotoVideoAlign, TranslationKey> = {
  left: "px4a.text.align.left",
  center: "px4a.text.align.center",
  right: "px4a.text.align.right",
};

const BG_KEY: Record<PhotoVideoTextBackground, TranslationKey> = {
  none: "px4a.text.background.none",
  dark: "px4a.text.background.dark",
  light: "px4a.text.background.light",
};

function chipClass(selected: boolean): string {
  return `min-h-11 rounded-full border px-3 text-sm font-medium ${
    selected ? "border-[#006D52] bg-[#006D52] text-white" : "border-zinc-200 bg-white text-zinc-800"
  }`;
}

export function PhotoVideoTextControls({
  composition,
  selectedPhotoId,
  selectedPhotoIndex,
  selectedOverlay,
  onAdd,
  onSelectOverlay,
  onChangeText,
  onDelete,
  onFont,
  onColor,
  onSize,
  onAlign,
  onBackground,
  onNudge,
  embedded = false,
}: {
  composition: PhotoVideoComposition;
  selectedPhotoId: string | null;
  selectedPhotoIndex: number;
  selectedOverlay: PhotoVideoTextOverlay | null;
  onAdd: () => void;
  onSelectOverlay: (id: string) => void;
  onChangeText: (text: string) => void;
  onDelete: () => void;
  onFont: (font: PhotoVideoFontId) => void;
  onColor: (color: string) => void;
  onSize: (size: number) => void;
  onAlign: (align: PhotoVideoAlign) => void;
  onBackground: (background: PhotoVideoTextBackground) => void;
  onNudge: (dx: number, dy: number) => void;
  embedded?: boolean;
}) {
  const t = useActiveTranslator();
  const photoOverlays = selectedPhotoId ? overlaysForPhoto(composition, selectedPhotoId) : [];
  const canAdd = selectedPhotoId ? canAddOverlay(composition, selectedPhotoId) : false;

  return (
    <section className="space-y-3" data-testid="px4a-text">
      {embedded ? (
        <h3 className="text-sm font-semibold text-zinc-900">{t("px4a.text.legend")}</h3>
      ) : (
        <h2 className="text-base font-semibold text-zinc-900">{t("px4a.text.legend")}</h2>
      )}
      {selectedPhotoId ? (
        embedded ? null : (
          <p className="text-sm text-zinc-600">{t("px4a.text.forPhoto", { n: selectedPhotoIndex + 1 })}</p>
        )
      ) : (
        <p className="text-sm text-zinc-600">{t("px4a.text.needPhoto")}</p>
      )}
      <button
        type="button"
        data-testid="px4a-add-text"
        className="inline-flex min-h-11 items-center rounded-full bg-[#006D52] px-5 text-sm font-semibold text-white disabled:opacity-40"
        onClick={onAdd}
        disabled={!canAdd}
      >
        {t("px4a.text.add")}
      </button>
      {photoOverlays.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {photoOverlays.map((overlay, index) => (
            <button
              key={overlay.id}
              type="button"
              aria-pressed={overlay.id === selectedOverlay?.id}
              className={chipClass(overlay.id === selectedOverlay?.id)}
              onClick={() => onSelectOverlay(overlay.id)}
            >
              {t("px4a.text.layer", { n: index + 1 })}
            </button>
          ))}
        </div>
      ) : null}

      {selectedOverlay ? (
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-800">{t("px4a.text.inputLabel")}</span>
            <input
              data-testid="px4a-text-input"
              type="text"
              name="px4a-overlay-text"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="sentences"
              autoCorrect="on"
              spellCheck
              enterKeyHint="done"
              maxLength={80}
              value={selectedOverlay.text}
              placeholder={t("px4a.text.placeholder")}
              className="min-h-11 w-full rounded-xl border border-zinc-200 px-3 text-base text-zinc-900"
              onChange={(event) => onChangeText(event.target.value)}
            />
          </label>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-zinc-900">{t("px4a.text.font")}</legend>
            <div className="flex flex-wrap gap-2" data-testid="px4a-text-font">
              {PHOTO_VIDEO_FONTS.map((font) => (
                <button
                  key={font}
                  type="button"
                  aria-pressed={selectedOverlay.font === font}
                  className={chipClass(selectedOverlay.font === font)}
                  onClick={() => onFont(font)}
                >
                  {t(FONT_KEY[font])}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-zinc-900">{t("px4a.text.color")}</legend>
            <div className="flex flex-wrap gap-2" data-testid="px4a-text-color">
              {PHOTO_VIDEO_TEXT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={t(COLOR_KEY[color])}
                  aria-pressed={selectedOverlay.color === color}
                  className={`h-11 w-11 rounded-full border ${
                    selectedOverlay.color === color ? "border-[#006D52] ring-2 ring-[#006D52]" : "border-zinc-200"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => onColor(color)}
                />
              ))}
            </div>
          </fieldset>

          <div className="space-y-2" data-testid="px4a-text-size">
            <p className="text-sm font-semibold text-zinc-900">{t("px4a.text.size")}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="min-h-11 min-w-11 rounded-lg border border-zinc-200"
                aria-label={t("px4a.text.sizeSmaller")}
                onClick={() => onSize(selectedOverlay.size - 1)}
              >
                −
              </button>
              <input
                type="range"
                min={PHOTO_VIDEO_TEXT_SIZE_MIN}
                max={PHOTO_VIDEO_TEXT_SIZE_MAX}
                step={1}
                value={selectedOverlay.size}
                aria-label={t("px4a.text.size")}
                className="min-h-11 flex-1"
                onChange={(event) => onSize(Number(event.target.value))}
              />
              <button
                type="button"
                className="min-h-11 min-w-11 rounded-lg border border-zinc-200"
                aria-label={t("px4a.text.sizeLarger")}
                onClick={() => onSize(selectedOverlay.size + 1)}
              >
                +
              </button>
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-zinc-900">{t("px4a.text.align")}</legend>
            <div className="flex flex-wrap gap-2" data-testid="px4a-text-align">
              {PHOTO_VIDEO_ALIGNS.map((align) => (
                <button
                  key={align}
                  type="button"
                  aria-pressed={selectedOverlay.align === align}
                  className={chipClass(selectedOverlay.align === align)}
                  onClick={() => onAlign(align)}
                >
                  {t(ALIGN_KEY[align])}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-zinc-900">{t("px4a.text.background")}</legend>
            <div className="flex flex-wrap gap-2" data-testid="px4a-text-bg">
              {PHOTO_VIDEO_BACKGROUNDS.map((background) => (
                <button
                  key={background}
                  type="button"
                  aria-pressed={selectedOverlay.background === background}
                  className={chipClass(selectedOverlay.background === background)}
                  onClick={() => onBackground(background)}
                >
                  {t(BG_KEY[background])}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-zinc-900">{t("px4a.text.nudge")}</legend>
            <div className="grid w-max grid-cols-3 gap-1" data-testid="px4a-text-nudge">
              <span />
              <button
                type="button"
                className="min-h-11 min-w-11 rounded-lg border border-zinc-200"
                aria-label={t("px4a.text.nudge.up")}
                onClick={() => onNudge(0, -0.04)}
              >
                ↑
              </button>
              <span />
              <button
                type="button"
                className="min-h-11 min-w-11 rounded-lg border border-zinc-200"
                aria-label={t("px4a.text.nudge.left")}
                onClick={() => onNudge(-0.04, 0)}
              >
                ←
              </button>
              <button
                type="button"
                className="min-h-11 min-w-11 rounded-lg border border-zinc-200"
                aria-label={t("px4a.text.nudge.down")}
                onClick={() => onNudge(0, 0.04)}
              >
                ↓
              </button>
              <button
                type="button"
                className="min-h-11 min-w-11 rounded-lg border border-zinc-200"
                aria-label={t("px4a.text.nudge.right")}
                onClick={() => onNudge(0.04, 0)}
              >
                →
              </button>
            </div>
          </fieldset>

          <button
            type="button"
            data-testid="px4a-text-delete"
            className="min-h-11 text-sm font-medium text-zinc-600 underline"
            onClick={onDelete}
          >
            {t("px4a.text.delete")}
          </button>
        </div>
      ) : null}
    </section>
  );
}
