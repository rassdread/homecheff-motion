"use client";

import { useActiveTranslator } from "@/i18n/client";
import { isApproximateEditorSelection } from "@/lib/editor-object-mask";
import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";

type Props = {
  layer: EditorCanvasLayer | null;
  refining: boolean;
  sam2Available: boolean | null;
  replicateAvailable?: boolean;
  rembgAvailable?: boolean;
  showAiAnalysis?: boolean;
  onPreciseSelect: () => void;
  onStartLasso: () => void;
  onUseApproximate: () => void;
  onRemoveBackground: () => void;
  onDetachObject: () => void;
};

export function EditorSelectionToolsPanel({
  layer,
  refining,
  sam2Available,
  replicateAvailable = false,
  rembgAvailable = false,
  showAiAnalysis = false,
  onPreciseSelect,
  onStartLasso,
  onUseApproximate,
  onRemoveBackground,
  onDetachObject,
}: Props) {
  const t = useActiveTranslator();

  if (!layer || layer.layerType === "background") {
    return null;
  }

  const approximate = isApproximateEditorSelection(layer);
  const refineProviderReady = replicateAvailable || sam2Available === true;
  const bgRemoveReady = replicateAvailable || rembgAvailable || sam2Available === true;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-sm text-zinc-700">{t("editor.ux.selection.lead" as never)}</p>
      {approximate ?
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t("editor.mask.approximateHint")}
        </p>
      : null}
      {showAiAnalysis && sam2Available === false ?
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t("editor.sam2.unavailable")}
        </p>
      : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={refining || !refineProviderReady}
          onClick={onPreciseSelect}
          className="min-h-10 rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005a9c] disabled:opacity-50"
        >
          {t("editor.ux.selection.refine" as never)}
        </button>
        {!refineProviderReady && !showAiAnalysis ?
          <p className="text-xs text-amber-800">{t("editor.clickSegment.providerUnavailable" as never)}</p>
        : null}
        <button
          type="button"
          disabled={refining || !bgRemoveReady}
          onClick={onRemoveBackground}
          className="min-h-10 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 disabled:opacity-50"
        >
          {t("editor.ux.selection.removeBackground" as never)}
        </button>
        {!bgRemoveReady && !showAiAnalysis ?
          <p className="text-xs text-amber-800">{t("editor.segmentState.failedProvider" as never)}</p>
        : null}
        <button
          type="button"
          disabled={refining}
          onClick={onStartLasso}
          className="min-h-10 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800"
        >
          {t("editor.ux.selection.outline" as never)}
        </button>
        {approximate ?
          <button
            type="button"
            disabled={refining}
            onClick={onUseApproximate}
            className="min-h-10 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800"
          >
            {t("editor.sam2.useApproximate")}
          </button>
        : null}
        <button
          type="button"
          disabled={refining}
          onClick={onDetachObject}
          className="min-h-10 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800"
        >
          {t("editor.ux.selection.detach" as never)}
        </button>
      </div>
    </div>
  );
}
