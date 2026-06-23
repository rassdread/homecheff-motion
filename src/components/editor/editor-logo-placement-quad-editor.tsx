"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { resetPlacementQuad } from "@/lib/brand-asset-quad-generator";
import { useActiveTranslator } from "@/i18n/client";
import type { BrandAssetBounds, BrandAssetQuad } from "@/types/brand-asset-protection";

type CornerKey = keyof BrandAssetQuad;

const CORNER_KEYS: CornerKey[] = ["topLeft", "topRight", "bottomRight", "bottomLeft"];

type Props = {
  imageUrl: string;
  bounds: BrandAssetBounds;
  quad: BrandAssetQuad;
  objectLabel?: string;
  objectCategory?: string;
  onQuadChange: (quad: BrandAssetQuad) => void;
};

export function EditorLogoPlacementQuadEditor({
  imageUrl,
  bounds,
  quad,
  objectLabel,
  objectCategory,
  onQuadChange,
}: Props) {
  const t = useActiveTranslator();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState<CornerKey | null>(null);

  const quadPath = useMemo(() => {
    const points = [quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft];
    return points.map((point) => `${point.x * 100},${point.y * 100}`).join(" ");
  }, [quad]);

  const updateCorner = useCallback(
    (corner: CornerKey, clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }
      const rect = container.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      onQuadChange({
        ...quad,
        [corner]: { x, y },
      });
    },
    [onQuadChange, quad]
  );

  const handleReset = () => {
    const reset = resetPlacementQuad({
      bbox: bounds,
      objectLabel,
      objectCategory,
    });
    onQuadChange(reset.quad);
  };

  return (
    <div className="mt-4 rounded-xl border border-white/15 bg-white/5 p-4" data-testid="logo-placement-quad-editor">
      <button
        type="button"
        className="text-sm font-medium text-white/90 underline-offset-2 hover:underline"
        onClick={() => setOpen((value) => !value)}
        data-quad-editor-open={open ? "true" : "false"}
      >
        {t("editor.logoPlacement.perspectiveAdjust" as never)}
      </button>

      {open ?
        <div className="mt-3 space-y-3">
          <p className="text-xs text-white/70">
            {t("editor.logoPlacement.perspectiveHint" as never)}
          </p>
          <div
            ref={containerRef}
            className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-lg border border-white/10 bg-black/40"
            onPointerMove={(event) => {
              if (!dragging) {
                return;
              }
              updateCorner(dragging, event.clientX, event.clientY);
            }}
            onPointerUp={() => setDragging(null)}
            onPointerLeave={() => setDragging(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="h-full w-full object-contain" draggable={false} />
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polygon
                points={quadPath}
                fill="rgba(16,185,129,0.15)"
                stroke="rgba(52,211,153,0.9)"
                strokeWidth="0.6"
              />
            </svg>
            {CORNER_KEYS.map((corner) => (
              <button
                key={corner}
                type="button"
                aria-label={corner}
                className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-400 shadow"
                style={{
                  left: `${quad[corner].x * 100}%`,
                  top: `${quad[corner].y * 100}%`,
                }}
                onPointerDown={(event) => {
                  event.preventDefault();
                  setDragging(corner);
                }}
              />
            ))}
          </div>
          <button
            type="button"
            className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
            onClick={handleReset}
          >
            {t("editor.logoPlacement.resetQuad" as never)}
          </button>
        </div>
      : null}
    </div>
  );
}
