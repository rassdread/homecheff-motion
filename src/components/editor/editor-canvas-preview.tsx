"use client";

import { useActiveTranslator } from "@/i18n/client";
import { renderableEditorLayers } from "@/lib/editor-canvas-layers";
import { visibleEditorPlacements } from "@/lib/editor-placement-canvas";
import { isEditorOperationAllowed } from "@/lib/editor-layer-action-eligibility";
import type { EditorCanvasDocument, EditorPlacementItem } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  selectedLayerId: string | null;
  selectedPlacementId: string | null;
  onSelectLayer: (layerId: string) => void;
  onSelectPlacement: (placementId: string) => void;
  onMoveLayer: (layerId: string, x: number, y: number) => void;
  onMovePlacement: (placementId: string, x: number, y: number) => void;
  onResizePlacement: (placementId: string, width: number, height: number) => void;
};

export function EditorCanvasPreview({
  document,
  selectedLayerId,
  selectedPlacementId,
  onSelectLayer,
  onSelectPlacement,
  onMoveLayer,
  onMovePlacement,
  onResizePlacement,
}: Props) {
  const t = useActiveTranslator();
  const visibleLayers = renderableEditorLayers({ objects: document.objects });
  const placements = visibleEditorPlacements(document).sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-inner">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={document.backgroundUrl} alt="" className="absolute inset-0 h-full w-full object-contain" />
      {visibleLayers.map((layer) => {
        const selected = selectedLayerId === layer.id && !selectedPlacementId;
        const canMove = isEditorOperationAllowed(layer, "move");
        const estimated = layer.metadata?.estimatedBounds;
        const lowConfidence = (layer.confidence ?? 1) < 0.55;
        const { x, y, scale, rotation } = layer.transform;
        return (
          <div
            key={layer.id}
            className={`absolute touch-none ${canMove ? "cursor-move" : "cursor-pointer"}`}
            style={{
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
              width: `${layer.bounds.width * 100}%`,
              height: `${layer.bounds.height * 100}%`,
              opacity: lowConfidence ? 0.72 : 0.85,
              zIndex: 1,
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
              className={`h-full w-full rounded-lg border-2 ${
                selected
                  ? "border-[#0067B1] bg-[#0067B1]/10"
                  : layer.locked
                    ? "border-dashed border-zinc-500/70 bg-zinc-300/10"
                    : estimated
                      ? "border-amber-500/60 bg-amber-300/10"
                      : "border-emerald-500/50 bg-emerald-300/10"
              }`}
            >
              <span className="absolute -top-5 left-0 max-w-full truncate text-[10px] font-semibold text-zinc-800">
                {layer.label}
              </span>
            </div>
          </div>
        );
      })}
      {placements.map((placement) => (
        <PlacementOverlay
          key={placement.id}
          placement={placement}
          selected={selectedPlacementId === placement.id}
          t={t}
          onSelect={() => onSelectPlacement(placement.id)}
          onMove={(x, y) => onMovePlacement(placement.id, x, y)}
          onResize={(w, h) => onResizePlacement(placement.id, w, h)}
        />
      ))}
    </div>
  );
}

function PlacementOverlay({
  placement,
  selected,
  t,
  onSelect,
  onMove,
  onResize,
}: {
  placement: EditorPlacementItem;
  selected: boolean;
  t: ReturnType<typeof useActiveTranslator>;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
}) {
  const locked = placement.canvasLocked;
  const { x, y, scale, rotation } = placement.canvasTransform;
  const width = (placement.canvasWidth ?? 0.2) * scale;
  const height = (placement.canvasHeight ?? 0.15) * scale;

  return (
    <div
      className={`absolute touch-none ${locked ? "cursor-not-allowed" : "cursor-move"}`}
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        width: `${width * 100}%`,
        height: `${height * 100}%`,
        opacity: placement.opacity,
        zIndex: 10 + (placement.zIndex ?? 0),
      }}
      onPointerDown={(event) => {
        onSelect();
        if (locked) {
          return;
        }
        event.currentTarget.setPointerCapture(event.pointerId);
        const startX = event.clientX;
        const startY = event.clientY;
        const origin = { x, y };
        const rect = event.currentTarget.parentElement?.getBoundingClientRect();
        if (!rect) {
          return;
        }
        const onMoveEvent = (moveEvent: PointerEvent) => {
          const dx = (moveEvent.clientX - startX) / rect.width;
          const dy = (moveEvent.clientY - startY) / rect.height;
          onMove(Math.min(1, Math.max(0, origin.x + dx)), Math.min(1, Math.max(0, origin.y + dy)));
        };
        const onUp = () => {
          window.removeEventListener("pointermove", onMoveEvent);
          window.removeEventListener("pointerup", onUp);
        };
        window.addEventListener("pointermove", onMoveEvent);
        window.addEventListener("pointerup", onUp);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={placement.previewUrl}
        alt={placement.sourceName}
        className={`h-full w-full object-contain ${selected ? "ring-2 ring-[#0067B1]" : ""}`}
        draggable={false}
      />
      <span className="absolute -top-5 left-0 flex max-w-full items-center gap-1 truncate text-[10px] font-semibold text-[#0067B1]">
        {placement.sourceName}
        {placement.exactnessMode === "pixel_overlay" ?
          <span className="rounded bg-blue-100 px-1 text-[8px] uppercase">{t("editor.placement.exactBadge")}</span>
        : null}
      </span>
      {!locked ?
        <button
          type="button"
          aria-label={t("editor.placement.resizeHandle")}
          className="absolute -bottom-3 -right-3 h-11 w-11 rounded-full border-2 border-[#0067B1] bg-white shadow"
          onPointerDown={(event) => {
            event.stopPropagation();
            event.currentTarget.setPointerCapture(event.pointerId);
            const rect = event.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
            if (!rect) {
              return;
            }
            const startX = event.clientX;
            const startY = event.clientY;
            const startW = placement.canvasWidth ?? 0.2;
            const startH = placement.canvasHeight ?? 0.15;
            const onMoveEvent = (moveEvent: PointerEvent) => {
              const dw = (moveEvent.clientX - startX) / rect.width;
              const dh = (moveEvent.clientY - startY) / rect.height;
              onResize(Math.min(1, Math.max(0.05, startW + dw)), Math.min(1, Math.max(0.05, startH + dh)));
            };
            const onUp = () => {
              window.removeEventListener("pointermove", onMoveEvent);
              window.removeEventListener("pointerup", onUp);
            };
            window.addEventListener("pointermove", onMoveEvent);
            window.addEventListener("pointerup", onUp);
          }}
        />
      : null}
    </div>
  );
}
