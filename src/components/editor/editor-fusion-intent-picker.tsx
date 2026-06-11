"use client";

import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { fusionCategoryMeta } from "@/lib/editor-fusion-category-meta";
import {
  fusionCategoryOrder,
  fusionCategoryTitleKey,
  fusionIntentsInCategory,
} from "@/lib/editor-workflow-product";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";

type Props = {
  busy?: boolean;
  selectedIntent?: EditorFusionIntent | null;
  onSelectIntent: (intent: EditorFusionIntent) => void;
  onBack?: () => void;
};

const BADGE_KEYS = {
  popular: "editor.fusion.badge.popular",
  recommended: "editor.fusion.badge.recommended",
  new: "editor.fusion.badge.new",
  premium: "editor.fusion.badge.premium",
} as const;

export function EditorFusionIntentPicker({ busy, selectedIntent, onSelectIntent, onBack }: Props) {
  const t = useActiveTranslator();
  const [hoveredIntent, setHoveredIntent] = useState<EditorFusionIntent | null>(null);

  return (
    <div className="space-y-10 pt-4 sm:pt-8" data-testid="editor-fusion-intent-picker">
      <header className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300/95">
          {t("editor.fusion.picker.heroEyebrow" as never)}
        </p>
        <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          {t("editor.fusion.picker.heroTitle" as never)}
        </h2>
        <p className="max-w-2xl text-base text-white/75 sm:text-lg">
          {t("editor.fusion.picker.heroLead" as never)}
        </p>
      </header>

      <div className="space-y-10">
        {fusionCategoryOrder().map((category) => {
          const intents = fusionIntentsInCategory(category);
          if (intents.length === 0) {
            return null;
          }
          const meta = fusionCategoryMeta(category);
          return (
            <section
              key={category}
              data-fusion-category={category}
              className={`${studioVisual.fusionCategorySection} space-y-5`}
            >
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden>
                    {meta.icon}
                  </span>
                  <h3 className="text-2xl font-bold text-white sm:text-[1.75rem]">
                    {t(fusionCategoryTitleKey(category) as never)}
                  </h3>
                </div>
                <p className="mt-2 max-w-3xl text-sm text-white/70 sm:text-base">
                  {t(meta.descriptionKey as never)}
                </p>
                <div className={studioVisual.fusionCategoryDivider} />
              </div>

              {category === "future_identity" ?
                <p className="text-sm text-amber-200/90">{t("editor.fusion.simulationNotice" as never)}</p>
              : null}

              <div className="grid gap-3 sm:grid-cols-2">
                {intents.map((option) => {
                  const isSelected = selectedIntent === option.id || hoveredIntent === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={busy}
                      data-fusion-intent={option.id}
                      onClick={() => onSelectIntent(option.id)}
                      onMouseEnter={() => setHoveredIntent(option.id)}
                      onMouseLeave={() => setHoveredIntent(null)}
                      className={
                        isSelected ? studioVisual.fusionCardSelected : studioVisual.fusionCard
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-base font-bold text-zinc-950 sm:text-lg">
                          {t(option.labelKey as never)}
                        </span>
                        {option.badge ?
                          <span className={studioVisual.fusionBadge}>
                            {t(BADGE_KEYS[option.badge] as never)}
                          </span>
                        : null}
                      </div>
                      <span className="mt-2 block text-sm leading-relaxed text-zinc-700">
                        {t(option.hintKey as never)}
                      </span>
                      {selectedIntent === option.id ?
                        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#0067B1]">
                          ✓ {t("editor.fusion.picker.selected" as never)}
                        </span>
                      : null}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {onBack ?
        <button
          type="button"
          className="text-sm font-semibold text-white/90 hover:underline"
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
