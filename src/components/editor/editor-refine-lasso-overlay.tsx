"use client";

import { useRef, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { clampShapePoint } from "@/lib/editor-object-mask";
import type { EditorShapePoint } from "@/types/homecheff-visual-editor";

type Props = {
  active: boolean;
  onComplete: (points: EditorShapePoint[]) => void;
  onCancel: () => void;
};

export function EditorRefineLassoOverlay({ active, onComplete, onCancel }: Props) {
  const t = useActiveTranslator();
  const [points, setPoints] = useState<EditorShapePoint[]>([]);
  const drawing = useRef(false);

  if (!active) {
    return null;
  }

  const toNormalized = (clientX: number, clientY: number, rect: DOMRect): EditorShapePoint => {
    return clampShapePoint({
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    });
  };

  const svgPoints = points.map((p) => `${p.x * 100},${p.y * 100}`).join(" ");

  return (
    <div className="absolute inset-0 z-20">
      <div
        className="absolute inset-0 cursor-crosshair"
        onPointerDown={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          drawing.current = true;
          setPoints([toNormalized(event.clientX, event.clientY, rect)]);
        }}
        onPointerMove={(event) => {
          if (!drawing.current) {
            return;
          }
          const rect = event.currentTarget.getBoundingClientRect();
          setPoints((prev) => [...prev, toNormalized(event.clientX, event.clientY, rect)]);
        }}
        onPointerUp={() => {
          drawing.current = false;
        }}
        onDoubleClick={() => {
          if (points.length >= 3) {
            onComplete(points);
            setPoints([]);
          }
        }}
      />
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {points.length >= 2 ?
          <polyline
            points={svgPoints}
            fill="rgba(0,103,177,0.15)"
            stroke="#0067B1"
            strokeWidth={0.5}
            vectorEffect="non-scaling-stroke"
          />
        : null}
      </svg>
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
        <button
          type="button"
          className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-zinc-800 shadow"
          onClick={() => {
            if (points.length >= 3) {
              onComplete(points);
              setPoints([]);
            }
          }}
        >
          {t("editor.mask.lasso.finish")}
        </button>
        <button
          type="button"
          className="rounded-full border border-white/40 bg-black/40 px-4 py-2 text-xs font-semibold text-white"
          onClick={() => {
            setPoints([]);
            onCancel();
          }}
        >
          {t("editor.mask.lasso.cancel")}
        </button>
      </div>
      <p className="pointer-events-none absolute left-3 top-3 rounded-lg bg-black/55 px-3 py-1.5 text-xs text-white">
        {t("editor.mask.lasso.hint")}
      </p>
    </div>
  );
}
