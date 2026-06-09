"use client";

import { useActiveTranslator } from "@/i18n/client";
import { renderableEditorLayers } from "@/lib/editor-canvas-layers";
import { isEditorOperationAllowed } from "@/lib/editor-layer-action-eligibility";
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
  const t = useActiveTranslator();
  const visibleLayers = renderableEditorLayers({ objects: layers });

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-inner">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={backgroundUrl} alt="" className="absolute inset-0 h-full w-full object-contain" />
      {visibleLayers.map((layer) => {
        const selected = selectedLayerId === layer.id;
        const canMove = isEditorOperationAllowed(layer, "move");
        const estimated = layer.metadata?.estimatedBounds;
        const lowConfidence = (layer.confidence ?? 1) < 0.55;
        const { x, y, scale, rotation } = layer.transform;
        return (
          <div
            key={layer.id}
            className={`absolute touch-none ${canMove ? "cursor-move" : "cursor-not-allowed"}`}
            style={{
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
              width: `${layer.bounds.width * 100}%`,
              height: `${layer.bounds.height * 100}%`,
              opacity: lowConfidence ? 0.72 : 1,
            }}
            onPointerDown={(event) => {
              onSelectLayer(layer.id);
              if (!canMove) {
                return;
              }
              event.currentTarget.setPointerCapture(event.pointerId);
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
              className={`group h-full w-full rounded-lg border-2 ${
                selected
                  ? "border-[#0067B1] bg-[#0067B1]/15"
                  : layer.locked
                    ? "border-dashed border-zinc-500/70 bg-zinc-300/15"
                    : estimated
                      ? "border-amber-500/80 bg-amber-300/15"
                      : "border-emerald-500/70 bg-emerald-300/15"
              }`}
            >
              <span className="absolute -top-5 left-0 flex max-w-full items-center gap-1 truncate text-[10px] font-semibold text-zinc-800">
                <span className="truncate">{layer.label}</span>
                {estimated ?
                  <span className="shrink-0 rounded bg-amber-100 px-1 text-[8px] uppercase text-amber-800">
                    {t("editor.semantic.estimated")}
                  </span>
                : null}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
