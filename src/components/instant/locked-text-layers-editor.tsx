"use client";

import {
  createLockedTextLayer,
  LOCKED_TEXT_ANIMATIONS,
  type LockedTextAnimation,
  type LockedTextLayer,
} from "@/lib/locked-text-layer";
import { useActiveTranslator } from "@/i18n/client";

export type LockedTextLayerDraft = Omit<LockedTextLayer, "locked"> & { locked?: true };

type Props = {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  layers: LockedTextLayerDraft[];
  onLayersChange: (layers: LockedTextLayerDraft[]) => void;
};

const ANIMATION_LABEL_KEYS: Record<LockedTextAnimation, string> = {
  none: "instant.lockedText.anim.none",
  "fade-in": "instant.lockedText.anim.fadeIn",
  "slide-up": "instant.lockedText.anim.slideUp",
  "slide-left": "instant.lockedText.anim.slideLeft",
  "slide-right": "instant.lockedText.anim.slideRight",
  typewriter: "instant.lockedText.anim.typewriter",
  "letter-pop": "instant.lockedText.anim.letterPop",
  "word-by-word": "instant.lockedText.anim.wordByWord",
  "scale-in": "instant.lockedText.anim.scaleIn",
};

export function LockedTextLayersEditor({ enabled, onEnabledChange, layers, onLayersChange }: Props) {
  const t = useActiveTranslator();

  const updateLayer = (index: number, patch: Partial<LockedTextLayerDraft>) => {
    onLayersChange(
      layers.map((layer, i) => (i === index ? { ...layer, ...patch, locked: true as const } : layer))
    );
  };

  const addLayer = () => {
    onLayersChange([
      ...layers,
      createLockedTextLayer({
        text: "",
        x: 0.5,
        y: 0.14 + layers.length * 0.1,
        animation: "fade-in",
        startMs: 300 + layers.length * 400,
        durationMs: 2200,
      }),
    ]);
  };

  const removeLayer = (index: number) => {
    onLayersChange(layers.filter((_, i) => i !== index));
  };

  return (
    <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-amber-950">{t("instant.lockedText.title")}</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-900/90">{t("instant.lockedText.warning")}</p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-amber-950">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            className="rounded border-amber-400"
          />
          {t("instant.lockedText.enabled")}
        </label>
      </header>

      {enabled ? (
        <div className="mt-4 space-y-4">
          {layers.map((layer, index) => (
            <article key={layer.id} className="rounded-lg border border-amber-200/80 bg-white p-3 shadow-sm">
              <header className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-zinc-700">
                  {t("instant.lockedText.layer")} #{index + 1}
                </p>
                <button
                  type="button"
                  className="text-xs text-red-700 underline"
                  onClick={() => removeLayer(index)}
                >
                  {t("instant.lockedText.remove")}
                </button>
              </header>
              <label className="mt-2 block text-xs font-medium text-zinc-700">
                {t("instant.lockedText.textLabel")}
              </label>
              <textarea
                value={layer.text}
                onChange={(e) => updateLayer(index, { text: e.target.value })}
                rows={2}
                maxLength={280}
                className="mt-1 w-full resize-none rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                placeholder={t("instant.lockedText.textPlaceholder")}
              />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="text-xs text-zinc-600">
                  {t("instant.lockedText.animation")}
                  <select
                    value={layer.animation}
                    onChange={(e) =>
                      updateLayer(index, { animation: e.target.value as LockedTextAnimation })
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                  >
                    {LOCKED_TEXT_ANIMATIONS.map((anim) => (
                      <option key={anim} value={anim}>
                        {t(ANIMATION_LABEL_KEYS[anim] as never)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-zinc-600">
                  {t("instant.lockedText.position")}
                  <select
                    value={`${layer.y}`}
                    onChange={(e) => {
                      const y = Number(e.target.value);
                      updateLayer(index, { y, x: 0.5, textAlign: "center" });
                    }}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                  >
                    <option value="0.12">{t("instant.lockedText.posTop")}</option>
                    <option value="0.5">{t("instant.lockedText.posCenter")}</option>
                    <option value="0.82">{t("instant.lockedText.posBottom")}</option>
                  </select>
                </label>
              </div>
            </article>
          ))}
          <button
            type="button"
            onClick={addLayer}
            className="w-full rounded-lg border border-dashed border-amber-300 bg-white py-2 text-xs font-medium text-amber-950"
          >
            {t("instant.lockedText.addLayer")}
          </button>
        </div>
      ) : null}
    </section>
  );
}
