"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { EditorPlacementItem } from "@/types/homecheff-visual-editor";
import {
  EDITOR_PLACEMENT_EXACTNESS_MODES,
  type EditorPlacementExactnessMode,
} from "@/types/homecheff-visual-editor";
import {
  REFERENCE_PLACEMENT_IMPORTANCE,
  REFERENCE_PLACEMENT_TYPES,
  type ReferencePlacementImportance,
  type ReferencePlacementType,
} from "@/types/studio-asset-generation-workbench";

type Props = {
  placement: EditorPlacementItem | null;
  onPatch: (patch: Partial<EditorPlacementItem>) => void;
  onCenterOnTarget: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onReplaceSource: () => void;
};

export function EditorPlacementPropertiesPanel({
  placement,
  onPatch,
  onCenterOnTarget,
  onBringForward,
  onSendBackward,
  onDuplicate,
  onDelete,
  onReplaceSource,
}: Props) {
  const t = useActiveTranslator();

  if (!placement) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
        {t("editor.placement.propertiesEmpty")}
      </div>
    );
  }

  const locked = placement.canvasLocked;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {t("editor.placement.propertiesTitle")}
      </p>
      <dl className="mt-2 space-y-1 text-xs text-zinc-600">
        <div className="flex justify-between gap-2">
          <dt>{t("editor.placement.field.source")}</dt>
          <dd className="font-medium text-zinc-900">{placement.sourceName}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>{t("editor.placement.field.target")}</dt>
          <dd className="font-medium text-zinc-900">{placement.targetLabel}</dd>
        </div>
      </dl>

      <label className="mt-3 block text-xs font-medium text-zinc-700">
        {t("editor.placement.field.type")}
        <select
          value={placement.placementType}
          disabled={locked}
          onChange={(e) => onPatch({ placementType: e.target.value as ReferencePlacementType })}
          className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
        >
          {REFERENCE_PLACEMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`editor.placement.type.${type}` as never)}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-3 block text-xs font-medium text-zinc-700">
        {t("editor.placement.field.importance")}
        <select
          value={placement.importance}
          disabled={locked}
          onChange={(e) => {
            const importance = e.target.value as ReferencePlacementImportance;
            onPatch({
              importance,
              canvasLocked: importance === "exact" || importance === "required",
              locked: importance === "exact" || importance === "required",
            });
          }}
          className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
        >
          {REFERENCE_PLACEMENT_IMPORTANCE.map((level) => (
            <option key={level} value={level}>
              {t(`editor.placement.importance.${level}` as never)}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-3 block text-xs font-medium text-zinc-700">
        {t("editor.placement.field.exactness")}
        <select
          value={placement.exactnessMode}
          disabled={locked}
          onChange={(e) => onPatch({ exactnessMode: e.target.value as EditorPlacementExactnessMode })}
          className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
        >
          {EDITOR_PLACEMENT_EXACTNESS_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {t(`editor.placement.exactness.${mode}` as never)}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-1 text-[11px] text-zinc-500">
        {t(`editor.placement.exactnessHelp.${placement.exactnessMode}` as never)}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <label>
          X
          <input
            type="number"
            min={0}
            max={1}
            step={0.01}
            disabled={locked}
            value={placement.canvasTransform.x}
            onChange={(e) =>
              onPatch({ canvasTransform: { ...placement.canvasTransform, x: Number(e.target.value) } })
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
            disabled={locked}
            value={placement.canvasTransform.y}
            onChange={(e) =>
              onPatch({ canvasTransform: { ...placement.canvasTransform, y: Number(e.target.value) } })
            }
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1"
          />
        </label>
        <label>
          {t("editor.placement.field.width")}
          <input
            type="number"
            min={0.05}
            max={1}
            step={0.01}
            disabled={locked}
            value={placement.canvasWidth ?? 0.2}
            onChange={(e) => onPatch({ canvasWidth: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1"
          />
        </label>
        <label>
          {t("editor.placement.field.height")}
          <input
            type="number"
            min={0.05}
            max={1}
            step={0.01}
            disabled={locked}
            value={placement.canvasHeight ?? 0.15}
            onChange={(e) => onPatch({ canvasHeight: Number(e.target.value) })}
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
            disabled={locked}
            value={placement.canvasTransform.rotation}
            onChange={(e) =>
              onPatch({ canvasTransform: { ...placement.canvasTransform, rotation: Number(e.target.value) } })
            }
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1"
          />
        </label>
        <label>
          {t("editor.placement.field.opacity")}
          <input
            type="number"
            min={0.1}
            max={1}
            step={0.05}
            disabled={locked}
            value={placement.opacity}
            onChange={(e) => onPatch({ opacity: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-1">
        <button type="button" onClick={onReplaceSource} className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase">
          {t("editor.placement.action.replaceSource")}
        </button>
        <button type="button" onClick={onCenterOnTarget} className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase">
          {t("editor.placement.action.centerOnTarget")}
        </button>
        <button type="button" onClick={onBringForward} className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase">
          {t("editor.placement.action.forward")}
        </button>
        <button type="button" onClick={onSendBackward} className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase">
          {t("editor.placement.action.backward")}
        </button>
        <button type="button" onClick={onDuplicate} className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase">
          {t("editor.canvas.tool.duplicate")}
        </button>
        <button
          type="button"
          disabled={locked}
          onClick={() => onPatch({ canvasLocked: !placement.canvasLocked, locked: !placement.locked })}
          className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase disabled:opacity-40"
        >
          {placement.canvasLocked ? t("editor.canvas.tool.lock") : t("editor.placement.action.unlock")}
        </button>
        <button
          type="button"
          onClick={() => onPatch({ visible: !placement.visible })}
          className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase"
        >
          {t("editor.canvas.tool.visibility")}
        </button>
        <button
          type="button"
          disabled={locked}
          onClick={onDelete}
          className="rounded-full border border-red-200 px-2 py-1 text-[10px] font-semibold uppercase text-red-700 disabled:opacity-40"
        >
          {t("editor.canvas.tool.delete")}
        </button>
      </div>
    </div>
  );
}
