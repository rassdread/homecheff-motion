"use client";

import { useActiveTranslator } from "@/i18n/client";

export type BakedTextProtectionDraft = {
  enabled: boolean;
  exactText: string;
  positionY: number;
};

type Props = {
  images: Array<{
    id: string;
    originalFileName: string;
    bakedText: BakedTextProtectionDraft;
  }>;
  onChange: (imageId: string, patch: Partial<BakedTextProtectionDraft>) => void;
};

const POSITION_OPTIONS = [
  { value: 0.12, labelKey: "instant.bakedText.posTop" as const },
  { value: 0.5, labelKey: "instant.bakedText.posCenter" as const },
  { value: 0.82, labelKey: "instant.bakedText.posBottom" as const },
];

export function BakedTextProtectionPanel({ images, onChange }: Props) {
  const t = useActiveTranslator();

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 space-y-4 rounded-2xl border border-sky-200 bg-sky-50/80 p-4">
      <div>
        <p className="text-sm font-semibold text-sky-950">{t("instant.bakedText.title")}</p>
        <p className="mt-1 text-xs leading-relaxed text-sky-900/90">{t("instant.bakedText.intro")}</p>
        <p className="mt-2 text-xs text-sky-800/80">{t("instant.bakedText.promptOnlyWarning")}</p>
      </div>

      {images.map((image, index) => (
        <div key={image.id} className="rounded-xl border border-sky-200/80 bg-white p-3">
          <p className="text-xs font-semibold text-zinc-700">
            {t("instant.bakedText.image")} #{index + 1} · {image.originalFileName}
          </p>
          <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-zinc-800">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={image.bakedText.enabled}
              onChange={(e) => onChange(image.id, { enabled: e.target.checked })}
            />
            <span>{t("instant.bakedText.enable")}</span>
          </label>

          {image.bakedText.enabled ? (
            <div className="mt-3 space-y-3 border-t border-zinc-100 pt-3">
              <label className="block text-xs font-medium text-zinc-700">
                {t("instant.bakedText.exactTextLabel")}
                <textarea
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  rows={2}
                  value={image.bakedText.exactText}
                  placeholder={t("instant.bakedText.exactTextPlaceholder")}
                  onChange={(e) => onChange(image.id, { exactText: e.target.value })}
                />
              </label>
              <label className="block text-xs font-medium text-zinc-700">
                {t("instant.bakedText.position")}
                <select
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  value={String(image.bakedText.positionY)}
                  onChange={(e) =>
                    onChange(image.id, { positionY: Number.parseFloat(e.target.value) })
                  }
                >
                  {POSITION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={String(opt.value)}>
                      {t(opt.labelKey)}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-[11px] text-zinc-500">{t("instant.bakedText.maskHint")}</p>
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-zinc-500">{t("instant.bakedText.skipHint")}</p>
          )}
        </div>
      ))}
    </div>
  );
}
