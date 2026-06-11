"use client";

import { useActiveTranslator } from "@/i18n/client";
import {
  fusionCategoryOrder,
  fusionCategoryTitleKey,
  fusionIntentsInCategory,
} from "@/lib/editor-workflow-product";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";

type Props = {
  busy?: boolean;
  onSelectIntent: (intent: EditorFusionIntent) => void;
  onBack?: () => void;
};

export function EditorFusionIntentPicker({ busy, onSelectIntent, onBack }: Props) {
  const t = useActiveTranslator();

  return (
    <div className="space-y-6" data-testid="editor-fusion-intent-picker">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#0067B1]">
          {t("editor.fusion.picker.eyebrow" as never)}
        </p>
        <h2 className="mt-1 text-xl font-bold text-zinc-900">
          {t("editor.fusion.picker.title" as never)}
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{t("editor.fusion.picker.lead" as never)}</p>
      </div>

      {fusionCategoryOrder().map((category) => {
        const intents = fusionIntentsInCategory(category);
        if (intents.length === 0) {
          return null;
        }
        return (
          <section key={category} data-fusion-category={category}>
            <h3 className="text-sm font-bold text-zinc-900">
              {t(fusionCategoryTitleKey(category) as never)}
            </h3>
            {category === "future_identity" ?
              <p className="mt-1 text-xs text-amber-800">
                {t("editor.fusion.simulationNotice" as never)}
              </p>
            : null}
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {intents.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={busy}
                  data-fusion-intent={option.id}
                  onClick={() => onSelectIntent(option.id)}
                  className={`rounded-xl border border-zinc-200/90 p-4 text-left transition hover:border-[#0067B1]/40 hover:bg-[#0067B1]/5 disabled:opacity-50 ${studioVisual.editorSurface}`}
                >
                  <span className="font-semibold text-zinc-900">{t(option.labelKey as never)}</span>
                  <span className="mt-1 block text-sm text-zinc-600">{t(option.hintKey as never)}</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}

      {onBack ?
        <button
          type="button"
          className="text-sm font-semibold text-[#0067B1] hover:underline"
          onClick={onBack}
        >
          {t("editor.v3.backToWorkflows" as never)}
        </button>
      : null}
    </div>
  );
}

/** @deprecated Use EditorFusionIntentPicker */
export const EditorCombineIntentPicker = EditorFusionIntentPicker;
