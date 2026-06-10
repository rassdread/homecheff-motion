"use client";

import {
  boundsToPolygon,
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
  refining?: boolean;
};

export function EditorSelectionOutline({
  layer,
  selected,
  hovered,
  humanFirst = false,
  refining = false,
}: Props) {
  const approximate = isApproximateEditorSelection(layer);
  const precise = !approximate;
  const contour = resolveEditorContourPoints(layer) ?? boundsToPolygon(layer.bounds);
  const active = selected || hovered;

  if (!active && !humanFirst) {
    return null;
  }
  if (!selected && !hovered) {
    return null;
  }

  const points = editorSelectionOutlineSvgPoints(contour);
  const strokeColor = refining ? "#94a3b8" : precise ? "#10b981" : "#94a3b8";
  const fillColor =
    refining
      ? "rgba(148,163,184,0.14)"
      : precise
        ? "rgba(16,185,129,0.14)"
        : "rgba(148,163,184,0.1)";

  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full overflow-visible ${
        refining ? "animate-pulse" : ""
      }`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <polygon
        points={points}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={active ? 0.65 : 0.45}
        strokeDasharray={approximate && !precise ? "1.2 0.8" : undefined}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
