"use client";

import { useActiveTranslator } from "@/i18n/client";
import {
  EDITOR_HUMAN_BODY_SLIDER_KEYS,
  type EditorHumanActionId,
} from "@/lib/editor-human-first";
import { patchBodyDesignerParams, resolveBodyDesignerSliderRange } from "@/lib/editor-body-designer";
import type { CharacterBodyDesignerParams } from "@/types/homecheff-visual-editor";
import type { AssetVisionObjectType } from "@/types/studio-asset-vision-analysis";

type Props = {
  value: CharacterBodyDesignerParams;
  objectType?: AssetVisionObjectType | string;
  onChange: (next: CharacterBodyDesignerParams) => void;
  onClose: () => void;
};

export function EditorVisualBodyPanel({ value, objectType, onChange, onClose }: Props) {
  const t = useActiveTranslator();

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-900">{t("editor.human.body.title")}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-700"
        >
          {t("editor.human.closeMenu")}
        </button>
      </div>
      <p className="mt-1 text-xs text-zinc-600">{t("editor.human.body.lead")}</p>
      <div className="mt-4 space-y-3">
        {EDITOR_HUMAN_BODY_SLIDER_KEYS.map(({ key, labelKey }) => {
          const range = resolveBodyDesignerSliderRange(key, objectType);
          return (
            <label key={key} className="block text-xs font-medium text-zinc-700">
              {t(labelKey)}
              <input
                type="range"
                min={range.min}
                max={range.max}
                step={range.step}
                value={value[key]}
                onChange={(e) =>
                  onChange(patchBodyDesignerParams(value, { [key]: Number(e.target.value) }, objectType))
                }
                className="mt-1 w-full accent-[#0067B1]"
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}

export type { EditorHumanActionId };
