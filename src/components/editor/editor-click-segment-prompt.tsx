"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { EditorShapePoint } from "@/types/homecheff-visual-editor";

type Props = {
  clickPoint: EditorShapePoint;
  onSelectObject: () => void;
  onSelectWithPrompt: (prompt: string) => void;
  onOutline: () => void;
  onDismiss: () => void;
  busy?: boolean;
};

const PROMPT_SUGGESTIONS = ["logo", "globe", "tie", "person", "text", "product"] as const;

export function EditorClickSegmentPrompt({
  clickPoint,
  onSelectObject,
  onSelectWithPrompt,
  onOutline,
  onDismiss,
  busy = false,
}: Props) {
  const t = useActiveTranslator();

  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-lg">
      <p className="text-sm font-medium text-zinc-900">
        {t("editor.clickSegment.promptTitle")}
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        {t("editor.clickSegment.promptHint", {
          x: Math.round(clickPoint.x * 100),
          y: Math.round(clickPoint.y * 100),
        })}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onSelectObject}
          className="rounded-lg bg-[#0067B1] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {t("editor.clickSegment.selectObject")}
        </button>
        {PROMPT_SUGGESTIONS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={busy}
            onClick={() => onSelectWithPrompt(prompt)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
          >
            {t("editor.clickSegment.selectWithPrompt", { prompt })}
          </button>
        ))}
        <button
          type="button"
          disabled={busy}
          onClick={onOutline}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
        >
          {t("editor.clickSegment.outline")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDismiss}
          className="rounded-lg px-3 py-2 text-sm text-zinc-500 hover:text-zinc-800"
        >
          {t("editor.clickSegment.dismiss")}
        </button>
      </div>
    </div>
  );
}
