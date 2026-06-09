"use client";

import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";

type Props = {
  backgroundUrl: string;
  layers: EditorCanvasLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string) => void;
  onMoveLayer: (layerId: string, x: number, y: number) => void;
};

export function EditorCanvasPreview({
  backgroundUrl,
  layers,
  selectedLayerId,
  onSelectLayer,
  onMoveLayer,
}: Props) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-inner">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={backgroundUrl} alt="" className="absolute inset-0 h-full w-full object-contain" />
      {layers
        .filter((layer) => layer.visible && layer.layerType !== "background")
        .map((layer) => {
          const selected = selectedLayerId === layer.id;
          const { x, y, scale, rotation } = layer.transform;
          return (
            <div
              key={layer.id}
              className={`absolute touch-none ${layer.locked ? "cursor-not-allowed" : "cursor-move"}`}
              style={{
                left: `${x * 100}%`,
                top: `${y * 100}%`,
                transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
                width: `${layer.bounds.width * 100}%`,
                height: `${layer.bounds.height * 100}%`,
              }}
              onPointerDown={(event) => {
                if (layer.locked) {
                  onSelectLayer(layer.id);
                  return;
                }
                event.currentTarget.setPointerCapture(event.pointerId);
                onSelectLayer(layer.id);
                const startX = event.clientX;
                const startY = event.clientY;
                const origin = { x: layer.transform.x, y: layer.transform.y };
                const rect = event.currentTarget.parentElement?.getBoundingClientRect();
                if (!rect) {
                  return;
                }
                const onMove = (moveEvent: PointerEvent) => {
                  const dx = (moveEvent.clientX - startX) / rect.width;
                  const dy = (moveEvent.clientY - startY) / rect.height;
                  onMoveLayer(
                    layer.id,
                    Math.min(1, Math.max(0, origin.x + dx)),
                    Math.min(1, Math.max(0, origin.y + dy))
                  );
                };
                const onUp = () => {
                  window.removeEventListener("pointermove", onMove);
                  window.removeEventListener("pointerup", onUp);
                };
                window.addEventListener("pointermove", onMove);
                window.addEventListener("pointerup", onUp);
              }}
            >
              <div
                className={`h-full w-full rounded-lg border-2 ${
                  selected ? "border-[#0067B1] bg-[#0067B1]/15" : "border-amber-400/80 bg-amber-300/20"
                }`}
              >
                <span className="absolute -top-5 left-0 max-w-full truncate text-[10px] font-semibold text-zinc-800">
                  {layer.label}
                </span>
              </div>
            </div>
          );
        })}
    </div>
  );
}
