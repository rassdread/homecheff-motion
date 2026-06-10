"use client";

import { useActiveTranslator } from "@/i18n/client";
import {
  humanFirstObjectLabelKey,
  isTechnicalSubPartLayer,
  layersForHumanFirstTree,
} from "@/lib/editor-ux-cleanup";
import type { TranslationKey } from "@/i18n";
import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";

type Props = {
  layers: EditorCanvasLayer[];
  selectedLayerId: string | null;
  onSelect: (layerId: string) => void;
};

function chipLabelForLayer(
  layer: import("@/types/homecheff-visual-editor").EditorCanvasLayer,
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
): string {
  if (layer.metadata?.bootstrapRegion) {
    return layer.label;
  }
  return t(humanFirstObjectLabelKey(layer));
}

export function EditorHumanObjectList({ layers, selectedLayerId, onSelect }: Props) {
  const t = useActiveTranslator();
  const objectLayers = layersForHumanFirstTree(layers).filter(
    (layer) => layer.layerType !== "background" && !isTechnicalSubPartLayer(layer)
  );
  const backgroundLayer = layers.find((layer) => layer.layerType === "background");
  const visible = backgroundLayer ? [...objectLayers, backgroundLayer] : objectLayers;

  if (visible.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((layer) => {
        const selected = selectedLayerId === layer.id;
        return (
          <button
            key={layer.id}
            type="button"
            onClick={() => onSelect(layer.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              selected
                ? "bg-[#0067B1] text-white"
                : "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
            }`}
          >
            {chipLabelForLayer(layer, t)}
          </button>
        );
      })}
    </div>
  );
}
