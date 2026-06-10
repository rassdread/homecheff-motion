"use client";

import { useActiveTranslator } from "@/i18n/client";
import { editorLayerHasPreciseShape, isApproximateEditorSelection } from "@/lib/editor-object-mask";
import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";

type Props = {
  layer: EditorCanvasLayer | null;
  primaryProvider?: string | null;
};

export function EditorSelectionVerificationPanel({ layer, primaryProvider }: Props) {
  const t = useActiveTranslator();

  if (!layer) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
        {t("admin.editorSelection.noLayer" as never)}
      </div>
    );
  }

  const shape = layer.selectionShape;
  const polygonCount = shape?.polygon?.length ?? 0;
  const maskPersisted = Boolean(shape?.maskUrl?.trim());
  const approximate = isApproximateEditorSelection(layer);
  const precise = editorLayerHasPreciseShape(layer);

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-950">
      <p className="font-semibold">{t("admin.editorSelection.title" as never)}</p>
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
        <dt>{t("admin.editorSelection.layer" as never)}</dt>
        <dd>{layer.label || layer.id}</dd>
        <dt>{t("admin.editorSelection.mode" as never)}</dt>
        <dd>{approximate ? "approximate" : precise ? "precise" : "box"}</dd>
        <dt>{t("admin.editorSelection.provider" as never)}</dt>
        <dd>{layer.metadata?.lastSegmentProvider ?? shape?.segmentationSource ?? primaryProvider ?? "—"}</dd>
        <dt>{t("admin.editorSelection.maskSource" as never)}</dt>
        <dd>{shape?.segmentationSource ?? "—"}</dd>
        <dt>{t("admin.editorSelection.polygonCount" as never)}</dt>
        <dd>{polygonCount}</dd>
        <dt>{t("admin.editorSelection.confidence" as never)}</dt>
        <dd>{shape?.confidence != null ? shape.confidence.toFixed(2) : "—"}</dd>
        <dt>{t("admin.editorSelection.maskPersisted" as never)}</dt>
        <dd>{maskPersisted ? t("admin.editorSelection.yes" as never) : t("admin.editorSelection.no" as never)}</dd>
        {layer.metadata?.lastSegmentPredictionId ?
          <>
            <dt>{t("admin.editorSelection.predictionId" as never)}</dt>
            <dd className="truncate font-mono text-[10px]">{layer.metadata.lastSegmentPredictionId}</dd>
          </>
        : null}
        {layer.metadata?.lastSegmentRuntimeMs != null ?
          <>
            <dt>{t("admin.editorSelection.runtime" as never)}</dt>
            <dd>{layer.metadata.lastSegmentRuntimeMs} ms</dd>
          </>
        : null}
      </dl>
    </div>
  );
}
