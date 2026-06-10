"use client";

import { compositorOverlayLayers, parseCompositorLayerId } from "@/lib/editor-compositor";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  selectedCompositorId?: string | null;
  onSelectCompositorLayer?: (compositorId: string) => void;
  onMoveCompositorLayer?: (compositorId: string, x: number, y: number) => void;
};

export function EditorCompositorOverlays({
  document,
  selectedCompositorId,
  onSelectCompositorLayer,
  onMoveCompositorLayer,
}: Props) {
  const layers = compositorOverlayLayers(document);

  return (
    <>
      {layers.map((layer) => {
        const selected = selectedCompositorId === layer.id;
        const parsed = parseCompositorLayerId(layer.id);
        const canMove =
          parsed?.kind === "imported" || parsed?.kind === "cutout" || parsed?.kind === "placement";
        const centerX = layer.transform.x * 100;
        const centerY = layer.transform.y * 100;
        const widthPct = layer.width * layer.transform.scale * 100;
        const heightPct = layer.height * layer.transform.scale * 100;

        if (layer.kind === "text") {
          const text = document.textLayers?.find((t) => `text:${t.id}` === layer.id);
          if (!text) {
            return null;
          }
          return (
            <div
              key={layer.id}
              className={`pointer-events-none absolute rounded px-1 text-[10px] font-semibold text-white ${
                selected ? "ring-2 ring-[#0067B1]" : ""
              }`}
              style={{
                left: `${text.bbox.x * 100}%`,
                top: `${text.bbox.y * 100}%`,
                width: `${text.bbox.width * 100}%`,
                opacity: layer.opacity,
                zIndex: layer.zIndex,
                background: "rgba(0,0,0,0.45)",
              }}
            >
              {text.content}
            </div>
          );
        }

        if (!layer.imageUrl) {
          return null;
        }

        return (
          <div
            key={layer.id}
            data-editor-compositor-layer
            className={`absolute touch-none ${canMove ? "cursor-move" : "cursor-pointer"}`}
            style={{
              left: `${centerX}%`,
              top: `${centerY}%`,
              transform: `translate(-50%, -50%) rotate(${layer.transform.rotation}deg)`,
              width: `${widthPct}%`,
              height: `${heightPct}%`,
              opacity: layer.opacity,
              zIndex: layer.zIndex,
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
              onSelectCompositorLayer?.(layer.id);
              if (!canMove || !onMoveCompositorLayer) {
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
                onMoveCompositorLayer(
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={layer.imageUrl}
              alt={layer.label}
              className={`h-full w-full object-contain ${selected ? "ring-2 ring-[#0067B1]" : ""}`}
              draggable={false}
            />
            {selected ?
              <span className="absolute -top-5 left-0 max-w-full truncate text-[10px] font-semibold text-[#0067B1]">
                {layer.label}
              </span>
            : null}
          </div>
        );
      })}
    </>
  );
}
