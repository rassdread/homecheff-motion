"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";

type Props = {
  layers: EditorCanvasLayer[];
  selectedLayerId: string | null;
  onSelect: (layerId: string) => void;
};

export function EditorLayerTree({ layers, selectedLayerId, onSelect }: Props) {
  const t = useActiveTranslator();
  const editable = layers.filter((l) => l.layerType !== "background");

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {t("editor.canvas.layersTitle")}
      </p>
      <ul className="mt-2 space-y-1">
        {layers.map((layer) => (
          <li key={layer.id}>
            <button
              type="button"
              onClick={() => onSelect(layer.id)}
              className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm ${
                selectedLayerId === layer.id ? "bg-[#0067B1]/10 text-[#0067B1]" : "hover:bg-zinc-50"
              }`}
            >
              <span className="truncate">{layer.label}</span>
              <span className="text-[10px] uppercase text-zinc-400">
                {layer.locked ? "🔒" : layer.visible ? "●" : "○"}
              </span>
            </button>
          </li>
        ))}
        {editable.length === 0 ?
          <li className="px-2 py-3 text-xs text-zinc-500">{t("editor.canvas.layersEmpty")}</li>
        : null}
      </ul>
    </div>
  );
}
