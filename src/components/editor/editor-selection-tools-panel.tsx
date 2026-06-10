"use client";

import { useActiveTranslator } from "@/i18n/client";
import { isApproximateEditorSelection } from "@/lib/editor-object-mask";
import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";

type Props = {
  layer: EditorCanvasLayer | null;
  refining: boolean;
  onRefineAi: () => void;
  onStartLasso: () => void;
  onRemoveBackground: () => void;
  onDetachObject: () => void;
};

export function EditorSelectionToolsPanel({
  layer,
  refining,
  onRefineAi,
  onStartLasso,
  onRemoveBackground,
  onDetachObject,
}: Props) {
  const t = useActiveTranslator();

  if (!layer || layer.layerType === "background") {
    return null;
  }

  const approximate = isApproximateEditorSelection(layer);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-sm text-zinc-700">{t("editor.mask.lead")}</p>
      {approximate ?
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t("editor.mask.approximateHint")}
        </p>
      : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={refining}
          onClick={onRefineAi}
          className="min-h-10 rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005a9c] disabled:opacity-50"
        >
          {t("editor.mask.refineAi")}
        </button>
        <button
          type="button"
          disabled={refining}
          onClick={onStartLasso}
          className="min-h-10 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800"
        >
          {t("editor.mask.outlineManual")}
        </button>
        <button
          type="button"
          disabled={refining}
          onClick={onRemoveBackground}
          className="min-h-10 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800"
        >
          {t("editor.mask.removeBackground")}
        </button>
        <button
          type="button"
          disabled={refining}
          onClick={onDetachObject}
          className="min-h-10 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800"
        >
          {t("editor.mask.detachObject")}
        </button>
      </div>
    </div>
  );
}
