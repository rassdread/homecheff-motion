"use client";

import { useCallback, useRef, useState } from "react";
import type { PublishOverlay } from "@/types/publish-overlay";

type DragMode = "move" | "resize" | "rotate" | null;

type Props = {
  overlay: PublishOverlay;
  selected: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onSelect: () => void;
  onPatch: (patch: Partial<PublishOverlay>) => void;
};

export function PublishOverlayDraggable({
  overlay,
  selected,
  containerRef,
  onSelect,
  onPatch,
}: Props) {
  const dragRef = useRef<{ mode: DragMode; startX: number; startY: number; base: PublishOverlay } | null>(null);
  const [rotating, setRotating] = useState(false);

  const pointerToNormalized = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) {
        return { x: overlay.x, y: overlay.y };
      }
      return {
        x: Math.min(0.95, Math.max(0, (clientX - rect.left) / rect.width)),
        y: Math.min(0.95, Math.max(0, (clientY - rect.top) / rect.height)),
      };
    },
    [containerRef, overlay.x, overlay.y]
  );

  const onPointerDown = (e: React.PointerEvent, mode: DragMode) => {
    e.stopPropagation();
    onSelect();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, base: { ...overlay } };
    setRotating(mode === "rotate");
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !containerRef.current) {
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const dx = (e.clientX - drag.startX) / rect.width;
    const dy = (e.clientY - drag.startY) / rect.height;

    if (drag.mode === "move") {
      onPatch({
        x: Math.min(0.95, Math.max(0, drag.base.x + dx)),
        y: Math.min(0.95, Math.max(0, drag.base.y + dy)),
      });
    } else if (drag.mode === "resize") {
      onPatch({
        width: Math.min(0.95, Math.max(0.08, drag.base.width + dx)),
        height: Math.min(0.5, Math.max(0.04, drag.base.height + dy)),
      });
    } else if (drag.mode === "rotate") {
      const centerX = drag.base.x + drag.base.width / 2;
      const pos = pointerToNormalized(e.clientX, e.clientY);
      const angle = Math.atan2(pos.y - centerX, pos.x - centerX) * (180 / Math.PI);
      onPatch({
        style: { ...overlay.style, rotation: angle },
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    setRotating(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const rotation = overlay.style.rotation ?? 0;

  return (
    <div
      role="button"
      tabIndex={0}
      className={`absolute touch-none select-none border-2 px-2 py-1 text-white ${
        selected ? "border-[#0067B1] ring-2 ring-[#0067B1]/30" : "border-white/40"
      } ${overlay.safeAreaStatus === "fail" ? "ring-2 ring-red-500" : overlay.safeAreaStatus === "warning" ? "ring-2 ring-amber-400" : ""}`}
      style={{
        left: `${overlay.x * 100}%`,
        top: `${overlay.y * 100}%`,
        width: `${overlay.width * 100}%`,
        minHeight: `${overlay.height * 100}%`,
        zIndex: overlay.zIndex,
        fontSize: overlay.style.fontSize,
        color: overlay.style.color,
        backgroundColor: overlay.style.backgroundColor ?? "rgba(0,0,0,0.45)",
        textAlign: overlay.style.textAlign,
        transform: `rotate(${rotation}deg)`,
        cursor: overlay.locked ? "not-allowed" : "grab",
      }}
      onPointerDown={(e) => {
        if (!overlay.locked) {
          onPointerDown(e, "move");
        }
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {overlay.text}
      {selected && !overlay.locked ?
        <>
          <span
            className="absolute -bottom-2 -right-2 h-4 w-4 cursor-se-resize rounded-full bg-[#0067B1]"
            onPointerDown={(e) => onPointerDown(e, "resize")}
          />
          <span
            className="absolute -top-3 left-1/2 h-4 w-4 -translate-x-1/2 cursor-grab rounded-full bg-violet-500"
            onPointerDown={(e) => onPointerDown(e, "rotate")}
            aria-label="rotate"
          />
        </>
      : null}
      {rotating ? <span className="sr-only">rotating</span> : null}
    </div>
  );
}
