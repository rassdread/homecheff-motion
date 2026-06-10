"use client";

import {
  editorSelectionOutlineSvgPoints,
  isApproximateEditorSelection,
  resolveEditorContourPoints,
} from "@/lib/editor-object-mask";
import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";

type Props = {
  layer: EditorCanvasLayer;
  selected: boolean;
  hovered: boolean;
  humanFirst?: boolean;
};

export function EditorSelectionOutline({ layer, selected, hovered, humanFirst = false }: Props) {
  const contour = resolveEditorContourPoints(layer);
  const approximate = isApproximateEditorSelection(layer);
  const showContour = Boolean(contour && contour.length >= 3 && !approximate);
  const active = selected || hovered;

  if (showContour) {
    const points = editorSelectionOutlineSvgPoints(contour!);
    return (
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <polygon
          points={points}
          fill={active ? "rgba(0,103,177,0.12)" : humanFirst ? "rgba(255,255,255,0.08)" : "rgba(16,185,129,0.1)"}
          stroke={active ? "#0067B1" : humanFirst ? "rgba(255,255,255,0.75)" : "rgba(16,185,129,0.65)"}
          strokeWidth={active ? 0.55 : 0.4}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  return null;
}
