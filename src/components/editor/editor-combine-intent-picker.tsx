"use client";

import { useActiveTranslator } from "@/i18n/client";
import { EDITOR_COMBINE_INTENT_OPTIONS } from "@/lib/editor-workflow-product";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { EditorCombineIntent } from "@/types/editor-instruction-studio";

type Props = {
  busy?: boolean;
  onSelectIntent: (intent: EditorCombineIntent) => void;
  onBack?: () => void;
};

export function EditorCombineIntentPicker({ busy, onSelectIntent, onBack }: Props) {
  const t = useActiveTranslator();

  return (
    <div className="space-y-4" data-testid="editor-combine-intent-picker">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#0067B1]">
          {t("editor.v3.combine.intentEyebrow" as never)}
        </p>
        <h2 className="mt-1 text-xl font-bold text-zinc-900">
          {t("editor.v3.combine.intentTitle" as never)}
        </h2>
      </div>

      <div className="grid gap-2">
        {EDITOR_COMBINE_INTENT_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={busy}
            data-combine-intent={option.id}
            onClick={() => onSelectIntent(option.id)}
            className={`rounded-xl border border-zinc-200/90 p-4 text-left transition hover:border-[#0067B1]/40 hover:bg-[#0067B1]/5 disabled:opacity-50 ${studioVisual.editorSurface}`}
          >
            <span className="font-semibold text-zinc-900">{t(option.labelKey as never)}</span>
            <span className="mt-1 block text-sm text-zinc-600">{t(option.hintKey as never)}</span>
          </button>
        ))}
      </div>

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
