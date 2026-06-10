"use client";

import { useActiveTranslator } from "@/i18n/client";
import { resolveEditorLayerActionEligibility } from "@/lib/editor-layer-action-eligibility";
import {
  editorLayerHasPreciseShape,
  editorLayerSelectionMode,
  isApproximateEditorSelection,
} from "@/lib/editor-object-mask";
import { editorSemanticCategoryLabelKey, editorSemanticSourceLabelKey } from "@/lib/editor-semantic-layer-taxonomy";
import {
  objectStatusLabelKey,
  objectTypeLabelKey,
  resolveObjectStatus,
  shouldShowControlInHumanUi,
  shouldShowTechnicalMetadata,
} from "@/lib/editor-ux-cleanup";
import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";
import type { EditorObjectOperation } from "@/types/homecheff-visual-editor";

type Props = {
  layer: EditorCanvasLayer | null;
  parentLabel?: string | null;
  onOperation: (operation: EditorObjectOperation) => void;
  onPatch: (patch: Partial<EditorCanvasLayer>) => void;
  showAiAnalysis?: boolean;
};

const OPERATIONS: EditorObjectOperation[] = [
  "move",
  "scale",
  "rotate",
  "duplicate",
  "visibility",
  "lock",
  "rename",
  "reset",
  "delete",
];

function identityRelevanceLabelKey(
  relevance: NonNullable<EditorCanvasLayer["metadata"]>["identityRelevance"]
): `editor.semantic.relevance.${NonNullable<typeof relevance>}` | null {
  if (!relevance || relevance === "none") {
    return null;
  }
  return `editor.semantic.relevance.${relevance}`;
}

export function EditorPropertiesPanel({
  layer,
  parentLabel,
  onOperation,
  onPatch,
  showAiAnalysis = false,
}: Props) {
  const t = useActiveTranslator();

  if (!layer || layer.layerType === "background") {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
        {t("editor.canvas.propertiesEmpty")}
      </div>
    );
  }

  const eligibility = resolveEditorLayerActionEligibility(layer);
  const relevanceKey = identityRelevanceLabelKey(layer.metadata?.identityRelevance);
  const status = resolveObjectStatus(layer);
  const showTechnical = shouldShowTechnicalMetadata(showAiAnalysis);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {t("editor.ux.properties.objectTitle")}
      </p>

      <dl className="mt-3 space-y-2 text-sm text-zinc-700">
        <div className="flex justify-between gap-2">
          <dt className="text-zinc-500">{t("editor.ux.properties.name")}</dt>
          <dd className="font-medium text-zinc-900">{layer.label}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-zinc-500">{t("editor.ux.properties.type")}</dt>
          <dd className="font-medium text-zinc-900">{t(objectTypeLabelKey(layer))}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-zinc-500">{t("editor.ux.properties.status")}</dt>
          <dd className="font-medium text-zinc-900">{t(objectStatusLabelKey(status))}</dd>
        </div>
      </dl>

      {showTechnical ?
        <dl className="mt-4 space-y-2 border-t border-zinc-100 pt-3 text-xs text-zinc-600">
          <p className="text-[10px] font-bold uppercase tracking-wide text-violet-600">
            {t("editor.ux.aiAnalysis.title")}
          </p>
          {layer.category ?
            <div className="flex justify-between gap-2">
              <dt>{t("editor.semantic.field.category")}</dt>
              <dd className="font-medium text-zinc-900">{t(editorSemanticCategoryLabelKey(layer.category))}</dd>
            </div>
          : null}
          {layer.layerSource ?
            <div className="flex justify-between gap-2">
              <dt>{t("editor.semantic.field.source")}</dt>
              <dd className="font-medium text-zinc-900">{t(editorSemanticSourceLabelKey(layer.layerSource))}</dd>
            </div>
          : null}
          {layer.confidence !== undefined ?
            <div className="flex justify-between gap-2">
              <dt>{t("editor.semantic.confidence")}</dt>
              <dd className="font-medium text-zinc-900">{Math.round(layer.confidence * 100)}%</dd>
            </div>
          : null}
          {relevanceKey ?
            <div className="flex justify-between gap-2">
              <dt>{t("editor.semantic.field.identityRelevance")}</dt>
              <dd className="font-medium text-zinc-900">{t(relevanceKey as never)}</dd>
            </div>
          : null}
          {parentLabel ?
            <div className="flex justify-between gap-2">
              <dt>{t("editor.semantic.field.parent")}</dt>
              <dd className="font-medium text-zinc-900">{parentLabel}</dd>
            </div>
          : null}
          {layer.metadata?.estimatedBounds || isApproximateEditorSelection(layer) ?
            <p className="rounded-lg bg-amber-50 px-2 py-1 text-amber-900">{t("editor.semantic.estimatedHint")}</p>
          : null}
          <div className="flex justify-between gap-2">
            <dt>{t("editor.mask.advanced.selectionMode")}</dt>
            <dd className="font-medium text-zinc-900">{editorLayerSelectionMode(layer)}</dd>
          </div>
          {layer.selectionShape?.segmentationSource ?
            <div className="flex justify-between gap-2">
              <dt>{t("editor.mask.advanced.segmentationSource")}</dt>
              <dd className="font-medium text-zinc-900">{layer.selectionShape.segmentationSource}</dd>
            </div>
          : null}
          {layer.selectionShape?.polygon ?
            <div className="flex justify-between gap-2">
              <dt>{t("editor.mask.advanced.polygonPoints")}</dt>
              <dd className="font-medium text-zinc-900">{layer.selectionShape.polygon.length}</dd>
            </div>
          : null}
          {layer.selectionShape?.maskUrl ?
            <div className="flex justify-between gap-2">
              <dt>{t("editor.mask.advanced.maskUrl")}</dt>
              <dd className="max-w-[10rem] truncate font-medium text-zinc-900">{layer.selectionShape.maskUrl}</dd>
            </div>
          : null}
          {editorLayerHasPreciseShape(layer) ?
            <p className="rounded-lg bg-emerald-50 px-2 py-1 text-emerald-900">{t("editor.mask.advanced.precise")}</p>
          : null}
        </dl>
      : null}

      {shouldShowControlInHumanUi("transform_x", showAiAnalysis) ?
        <>
          <label className="mt-4 block text-xs font-medium text-zinc-700">
            {t("editor.canvas.field.name")}
            <input
              type="text"
              value={layer.label}
              disabled={!eligibility.rename}
              onChange={(e) => onPatch({ label: e.target.value })}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
            />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <label>
              X
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={layer.transform.x}
                disabled={!eligibility.move}
                onChange={(e) =>
                  onPatch({ transform: { ...layer.transform, x: Number(e.target.value) } })
                }
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1"
              />
            </label>
            <label>
              Y
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={layer.transform.y}
                disabled={!eligibility.move}
                onChange={(e) =>
                  onPatch({ transform: { ...layer.transform, y: Number(e.target.value) } })
                }
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1"
              />
            </label>
            <label>
              {t("editor.canvas.field.scale")}
              <input
                type="number"
                min={0.2}
                max={3}
                step={0.05}
                value={layer.transform.scale}
                disabled={!eligibility.scale}
                onChange={(e) =>
                  onPatch({ transform: { ...layer.transform, scale: Number(e.target.value) } })
                }
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1"
              />
            </label>
            <label>
              {t("editor.canvas.field.rotation")}
              <input
                type="number"
                min={-180}
                max={180}
                step={1}
                value={layer.transform.rotation}
                disabled={!eligibility.rotate}
                onChange={(e) =>
                  onPatch({ transform: { ...layer.transform, rotation: Number(e.target.value) } })
                }
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1"
              />
            </label>
          </div>
        </>
      : null}
      <div className="mt-4 flex flex-wrap gap-1">
        {OPERATIONS.map((op) => (
          <button
            key={op}
            type="button"
            disabled={!eligibility[op]}
            onClick={() => onOperation(op)}
            className="rounded-full border border-zinc-200 px-2 py-1 text-[10px] font-semibold uppercase text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
          >
            {t(`editor.canvas.tool.${op}` as never)}
          </button>
        ))}
      </div>
    </div>
  );
}
