"use client";

import { useCallback, useRef } from "react";
import { STUDIO_COPILOT_WIDTH_MAX, STUDIO_COPILOT_WIDTH_MIN } from "@/types/studio-copilot-layout";

type Props = {
  onResize: (width: number) => void;
};

export function StudioCopilotResizeHandle({ onResize }: Props) {
  const dragging = useRef(false);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragging.current = true;
      const startX = event.clientX;
      const column = event.currentTarget.parentElement;
      const startWidth = column?.getBoundingClientRect().width ?? 440;

      const onMove = (moveEvent: PointerEvent) => {
        if (!dragging.current) {
          return;
        }
        const delta = startX - moveEvent.clientX;
        const next = Math.min(STUDIO_COPILOT_WIDTH_MAX, Math.max(STUDIO_COPILOT_WIDTH_MIN, startWidth + delta));
        onResize(next);
      };

      const onUp = () => {
        dragging.current = false;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [onResize]
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize Studio Copilot panel"
      className="absolute left-0 top-0 z-10 hidden h-full w-1.5 cursor-col-resize bg-transparent hover:bg-[#0067B1]/20 lg:block"
      data-testid="studio-copilot-resize-handle"
      onPointerDown={onPointerDown}
    />
  );
}
