"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { EditorShapePoint } from "@/types/homecheff-visual-editor";

export type PreciseSelectMode = "initial" | "add" | "remove";

type Props = {
  active: boolean;
  mode: PreciseSelectMode;
  loading?: boolean;
  onCanvasClick: (point: EditorShapePoint, mode: PreciseSelectMode) => void;
  onCancel: () => void;
};

export function EditorPreciseSelectOverlay({
  active,
  mode,
  loading = false,
  onCanvasClick,
  onCancel,
}: Props) {
  const t = useActiveTranslator();

  if (!active) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 z-20 cursor-crosshair"
      onPointerDown={(event) => {
        if (loading) {
          return;
        }
        const rect = event.currentTarget.getBoundingClientRect();
        const point = {
          x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
          y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
        };
        onCanvasClick(point, mode);
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3">
        <div className="rounded-full border border-white/80 bg-white/95 px-4 py-2 text-center text-xs font-medium text-zinc-800 shadow-lg backdrop-blur-md">
          {loading ?
            t("editor.sam2.loading")
          : mode === "add" ?
            t("editor.sam2.hintAdd")
          : mode === "remove" ?
            t("editor.sam2.hintRemove")
          : t("editor.sam2.hintClick")}
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
        className="absolute bottom-3 right-3 z-30 rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 shadow"
      >
        {t("editor.sam2.cancel")}
      </button>
    </div>
  );
}
