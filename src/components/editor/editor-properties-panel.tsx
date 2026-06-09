"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";
import type { EditorObjectOperation } from "@/types/homecheff-visual-editor";

type Props = {
  layer: EditorCanvasLayer | null;
  onOperation: (operation: EditorObjectOperation) => void;
  onPatch: (patch: Partial<EditorCanvasLayer>) => void;
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

export function EditorPropertiesPanel({ layer, onOperation, onPatch }: Props) {
  const t = useActiveTranslator();

  if (!layer || layer.layerType === "background") {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
        {t("editor.canvas.propertiesEmpty")}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {t("editor.canvas.propertiesTitle")}
      </p>
      <label className="mt-3 block text-xs font-medium text-zinc-700">
        {t("editor.canvas.field.name")}
        <input
          type="text"
          value={layer.label}
          disabled={layer.locked}
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
            disabled={layer.locked}
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
            disabled={layer.locked}
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
            disabled={layer.locked}
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
            disabled={layer.locked}
            onChange={(e) =>
              onPatch({ transform: { ...layer.transform, rotation: Number(e.target.value) } })
            }
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1"
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-1">
        {OPERATIONS.map((op) => (
          <button
            key={op}
            type="button"
            disabled={layer.locked && op !== "lock" && op !== "visibility"}
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
